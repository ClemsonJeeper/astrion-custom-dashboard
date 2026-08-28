"""Receive the Astrion remote's VOICE-key audio and run it through Assist.

The Astrion HA100 remote's VOICE key captures 16 kHz / mono / PCM16 from the
built-in microphone and POSTs it as a chunked octet-stream to this endpoint
(default ``/api/hap_remote/audio`` — set as ``voice.path`` in the remote's
``dashboard.json``). Audio is streamed live: it arrives while the user is still
speaking, and the remote closes the body on ~1.2 s of silence.

This component feeds that stream into the preferred (or configured) Assist
pipeline via the public ``async_pipeline_from_audio_stream`` helper, starting
at the **speech-to-text** stage and ending at **intent recognition**. There is
deliberately:

  * no wake-word stage — the physical VOICE key IS the wake trigger; and
  * no text-to-speech stage — the remote is a display-only panel with no
    speaker for TTS. The recognised transcript and the intent's text reply are
    returned as JSON and shown on the 3.1" screen by ``VoiceOverlay``.

**Context-sensitive routing.** The remote sends the on-screen page name as an
``X-Astrion-Page`` header. When a ``contexts:`` entry matches that page AND the
transcript matches its ``extract`` regex, the configured HA service is called
with the extracted text instead of returning the Assist reply — so "search ted
lasso" on a "Shield TV" page can type into the TV's search field via an HA
script rather than being answered by the conversation agent.

Response shape (what the remote's ``VoiceSession`` parses):

    {
      "route": "<page slug or "assist">",
      "transcript": "<words heard>",   # null if nothing was recognised
      "response": "<reply or extracted text>"  # null if nothing
    }

Config (``configuration.yaml``)::

    astrion_voice:
      pipeline: Vortex Voice            # optional: pipeline id/name; omit = preferred
      contexts:
        "Shield TV":                    # key = exact page name from dashboard.json
          service: script.shield_tv_search      # HA service to call
          field: search_text            # optional: service-data field name (default: transcript)
          extract: "(?:search|find)\\s*(?:for)?\\s*:?\\s*(.+)"  # optional regex; group 1 = extracted text

The endpoint requires the same long-lived bearer token the remote already uses
for its websocket, so it is not world-readable.
"""

from __future__ import annotations

import logging
import re
from collections.abc import AsyncIterator

import voluptuous as vol
from aiohttp import web

from homeassistant.components import assist_pipeline, stt
from homeassistant.components.assist_pipeline.error import PipelineError
from homeassistant.components.assist_pipeline.pipeline import (
    PipelineEventType,
    PipelineStage,
)
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers.typing import ConfigType

_LOGGER = logging.getLogger(__name__)

DOMAIN = "astrion_voice"
DEFAULT_PATH = "/api/hap_remote/audio"

# 16 kHz mono PCM16: 3200 bytes == 100 ms, which is both what the remote's
# MicCapture flushes per chunk and what HA's assist_pipeline treats as one
# chunk (assist_pipeline.const.BYTES_PER_CHUNK). Matching it keeps audio
# flowing through the pipeline's chunker / VAD without re-buffering.
CHUNK_BYTES = 3200

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Optional("pipeline"): str,
                vol.Optional("contexts"): vol.Schema(
                    {
                        str: vol.Schema(
                            {
                                vol.Required("service"): str,
                                vol.Optional("field", default="transcript"): str,
                                vol.Optional("extract"): str,
                            },
                        ),
                    }
                ),
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the voice-audio endpoint."""
    conf = config.get(DOMAIN) or {}
    pipeline_ref: str | None = conf.get("pipeline")
    contexts = conf.get("contexts") or {}
    hass.http.register_view(AstrionVoiceView(hass, pipeline_ref, contexts))
    _LOGGER.info("astrion_voice: receiving audio at %s (contexts: %s)", DEFAULT_PATH, list(contexts))
    return True


def _resolve_pipeline_id(hass: HomeAssistant, ref: str | None) -> str | None:
    """Resolve a configured pipeline reference to a pipeline id.

    ``ref`` is whatever the user put under ``pipeline:`` in configuration.yaml
    — a ULID id is matched exactly, a human name case-insensitively. ``None``
    means "use the preferred pipeline" (the one flagged in HA's voice settings),
    which is what passing ``None`` to the helper already does, so we just
    return ``None`` in that case.
    """
    if not ref:
        return None
    try:
        return assist_pipeline.async_get_pipeline(hass, ref).id
    except PipelineError:
        pass
    for pipeline in assist_pipeline.async_get_pipelines(hass):
        if pipeline.name.lower() == ref.lower():
            return pipeline.id
    _LOGGER.warning("astrion_voice: pipeline %r not found, using preferred", ref)
    return None


def _stt_metadata(language: str) -> stt.SpeechMetadata:
    """Metadata describing the remote's PCM16 stream.

    Pinned to 16 kHz / mono / PCM16 — exactly what ``MicCapture`` produces and
    what every Assist STT provider accepts. The pipeline overwrites the
    language with its own stt_language during preparation, so the value here
    only needs to be syntactically valid.
    """
    return stt.SpeechMetadata(
        language=language,
        format=stt.AudioFormats.WAV,
        codec=stt.AudioCodecs.PCM,
        bit_rate=stt.AudioBitRates.BITRATE_16,
        sample_rate=stt.AudioSampleRates.SAMPLERATE_16000,
        channel=stt.AudioChannels.CHANNEL_MONO,
    )


def _extract_text(transcript: str, pattern: str | None) -> str | None:
    """Apply a context's extract regex to the transcript.

    Returns capture group 1 if the pattern matches, else the full transcript
    if no pattern is configured, else None if the pattern is configured but
    doesn't match (meaning: don't route to this context — let Assist handle it).
    """
    if not pattern:
        return transcript
    m = re.search(pattern, transcript, re.IGNORECASE)
    if m:
        return m.group(1).strip() if m.groups() else m.group(0).strip()
    return None


class AstrionVoiceView(HomeAssistantView):
    """POST endpoint that turns a chunked PCM16 body into an Assist run."""

    url = DEFAULT_PATH
    name = "api:astrion_voice_audio"
    requires_auth = True

    def __init__(
        self,
        hass: HomeAssistant,
        pipeline_ref: str | None,
        contexts: dict,
    ) -> None:
        self._hass = hass
        self._pipeline_ref = pipeline_ref
        self._contexts = contexts

    async def post(self, request: web.Request) -> web.Response:
        hass: HomeAssistant = request.app["hass"]

        pipeline_id = _resolve_pipeline_id(hass, self._pipeline_ref)
        page = request.headers.get("X-Astrion-Page")
        _LOGGER.info(
            "astrion_voice: request received (pipeline_id=%s, page=%r, content_length=%s, transfer_encoding=%s, content_type=%s)",
            pipeline_id,
            page,
            request.content_length,
            request.headers.get("Transfer-Encoding"),
            request.content_type,
        )

        # Look up a context handler for the current page. Page names from the
        # remote are matched case-insensitively against the config keys.
        context = None
        if page:
            for name, cfg in self._contexts.items():
                if name.lower() == page.lower():
                    context = cfg
                    break

        transcript: str | None = None
        response_text: str | None = None
        error_message: str | None = None
        total_bytes = 0

        def on_event(event) -> None:
            nonlocal transcript, response_text, error_message
            _LOGGER.debug("astrion_voice: pipeline event %s %s", event.type, event.data)
            if event.type == PipelineEventType.STT_END:
                transcript = (event.data or {}).get("stt_output", {}).get("text")
            elif event.type == PipelineEventType.INTENT_END:
                intent_output = (event.data or {}).get("intent_output", {}) or {}
                response_obj = intent_output.get("response", {}) or {}
                speech = response_obj.get("speech", {}) or {}
                plain = speech.get("plain", {}) or {}
                response_text = plain.get("speech")
            elif event.type == PipelineEventType.ERROR:
                data = event.data or {}
                error_message = f"{data.get('code', 'unknown')}: {data.get('message', '')}"
                _LOGGER.warning("astrion_voice: pipeline ERROR -> %s", error_message)

        # The request body IS the live microphone. Iterate it as it arrives so
        # STT begins transcribing while the user is still speaking — the same
        # reason the remote streams rather than buffers.
        async def audio_stream() -> AsyncIterator[bytes]:
            nonlocal total_bytes
            _LOGGER.debug("astrion_voice: audio_stream generator STARTED")
            async for chunk in request.content.iter_chunked(CHUNK_BYTES):
                total_bytes += len(chunk)
                if total_bytes <= CHUNK_BYTES * 3:  # log first few chunks
                    _LOGGER.debug("astrion_voice: yielded chunk of %d bytes (total=%d)", len(chunk), total_bytes)
                yield chunk
            _LOGGER.info("astrion_voice: body ended, %d bytes (~%d ms)", total_bytes, total_bytes // 32)

        # Determine a language for the STT metadata. The pipeline rewrites this
        # with its own stt_language during preparation, so we just need a value
        # from the resolved (or preferred) pipeline to satisfy the schema.
        stt_language = "en"
        try:
            pipeline = assist_pipeline.async_get_pipeline(hass, pipeline_id)
            stt_language = pipeline.stt_language or pipeline.language or "en"
        except PipelineError:
            pass

        try:
            # The public entry point: handles chat-session creation, pipeline
            # resolution, PipelineRun/PipelineInput construction, and the
            # version-correct prepare sequence. End at INTENT — no TTS, since
            # the remote has no speaker; the text reply is shown on screen.
            await assist_pipeline.async_pipeline_from_audio_stream(
                hass,
                context=Context(user_id=request.get("hass_user_id")),
                event_callback=on_event,
                stt_metadata=_stt_metadata(stt_language),
                stt_stream=audio_stream(),
                pipeline_id=pipeline_id,
                conversation_id=None,
                start_stage=PipelineStage.STT,
                end_stage=PipelineStage.INTENT,
            )
        except PipelineError as err:
            _LOGGER.warning("astrion_voice: pipeline error: %s (%s)", err.code, err.message)
            return self.json(
                {"route": "assist", "transcript": transcript, "response": err.message},
                status_code=200,
            )
        except Exception as err:  # noqa: BLE001 — surface unexpected failures
            _LOGGER.exception("astrion_voice: unexpected error running pipeline")
            return self.json(
                {"route": "assist", "transcript": transcript, "response": str(err)},
                status_code=200,
            )

        # ---- context-sensitive routing -------------------------------------
        # STT has produced a transcript. If a context handler is configured for
        # the current page AND the transcript matches its extract regex (or no
        # regex is configured), call the handler's HA service with the extracted
        # text and return that as the response — bypassing the Assist reply.
        # If the regex is configured but doesn't match, fall through to Assist
        # so non-search phrases ("turn off the lights") still work on the same
        # page.
        route = "assist"
        if context and transcript:
            extracted = _extract_text(transcript, context.get("extract"))
            if extracted is not None:
                field = context.get("field", "transcript")
                service = context["service"]
                domain, _, svc = service.partition(".")
                service_data = {field: extracted}
                _LOGGER.info(
                    "astrion_voice: context %r -> service %s data=%r (extracted from %r)",
                    page, service, service_data, transcript,
                )
                try:
                    await hass.services.async_call(domain, svc, service_data, blocking=True)
                except Exception as err:  # noqa: BLE001
                    _LOGGER.warning("astrion_voice: context service %s failed: %s", service, err)
                    return self.json(
                        {"route": "assist", "transcript": transcript, "response": f"Service failed: {err}"},
                        status_code=200,
                    )
                route = (page or "context").lower().replace(" ", "_")
                response_text = extracted
                error_message = None

        _LOGGER.info(
            "astrion_voice: done (bytes=%d, route=%s, transcript=%r, response=%r, error=%s)",
            total_bytes,
            route,
            transcript,
            response_text,
            error_message or "none",
        )
        return self.json(
            {
                "route": route,
                "transcript": transcript,
                "response": error_message if error_message and not response_text else response_text,
            },
            status_code=200,
        )
