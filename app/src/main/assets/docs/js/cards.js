// ---- Cards ---------------------------------------------------------------

const NAME_ENTITY_TYPES = ['source_select'];

function updateCardFormInputs() {
  const type = document.getElementById('cardTypeSelect').value;
  const container = document.getElementById('dynamicCardInputs');

  if (NAME_ENTITY_TYPES.includes(type)) {
    container.innerHTML = `
      <label>${I18N.t('web_card_name')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_name_room')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_light')}">
      ${iconFieldHtml('optIcon')}
    `;
  } else if (type === 'title') {
    container.innerHTML = `
      <label>${I18N.t('web_card_title')}</label><input type="text" id="optTitle" placeholder="${I18N.t('web_card_ph_name_room')}">
      <label>${I18N.t('web_card_subtitle_opt')}</label><input type="text" id="optSubtitle" placeholder="${I18N.t('web_card_ph_subtitle')}">
      <label>${I18N.t('web_card_alignment')}</label>
      <select id="optTitleAlignment">
        <option value="start">${I18N.t('web_card_align_start')}</option>
        <option value="center">${I18N.t('web_card_align_center')}</option>
        <option value="end">${I18N.t('web_card_align_end')}</option>
        <option value="justify">${I18N.t('web_card_align_justify')}</option>
      </select>
      ${iconFieldHtml('optTitleIcon')}
      <label class="inline-check"><input type="checkbox" id="optTitleDivider"> ${I18N.t('web_card_title_divider')}</label>
      <label>${I18N.t('web_card_title_color_label')}</label><input type="text" id="optTitleColor" placeholder="#7FB3C4">
      <div class="hint">${I18N.t('web_card_title_hint')}</div>
    `;
  } else if (type === 'switch') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_name_room')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_switch')}">
      <label>${I18N.t('web_card_switch_on_color')}</label>${colorFieldHtml('optOnColor', '', '#FF2E5A46')}
      ${iconFieldHtml('optIcon')}
    `;
  } else if (type === 'cover') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name_optional_friendly')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_cover_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_cover')}">
      ${iconFieldHtml('optIcon')}
      <label>${I18N.t('web_card_layout')}</label>
      <select id="optCoverLayout">
        <option value="default">${I18N.t('web_card_cover_layout_default')}</option>
        <option value="horizontal">${I18N.t('web_card_cover_layout_horizontal')}</option>
        <option value="vertical">${I18N.t('web_card_cover_layout_vertical')}</option>
      </select>
      <label>${I18N.t('web_card_controls_mushroom_cover')}</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlButtons" checked> ${I18N.t('web_card_cover_ctrl_buttons')}</label>
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlPosition"> ${I18N.t('web_card_cover_ctrl_position')}</label>
        <label class="inline-check"><input type="checkbox" id="optCoverCtrlTilt"> ${I18N.t('web_card_cover_ctrl_tilt')}</label>
      </div>
      <div class="hint">${I18N.t('web_card_cover_hint')}</div>
    `;
  } else if (type === 'select') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name_optional_friendly')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_select_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_input_select')}">
      <label>${I18N.t('web_card_select_icon_color')}</label><input type="text" id="optSelectIconColor" placeholder="#6EA8FE">
      <label>${I18N.t('web_card_layout')}</label>
      <select id="optSelectLayout">
        <option value="default">${I18N.t('web_card_select_layout_default')}</option>
        <option value="horizontal">${I18N.t('web_card_select_layout_horizontal')}</option>
        <option value="vertical">${I18N.t('web_card_select_layout_vertical')}</option>
      </select>
      <div class="hint">${I18N.t('web_card_select_hint')}</div>
    `;
  } else if (type === 'light') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name_optional_friendly')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_kitchen')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_light_kitchen')}">
      <label>${I18N.t('web_card_layout')}</label>
      <select id="optLightLayout">
        <option value="default">${I18N.t('web_card_light_layout_default')}</option>
        <option value="horizontal">${I18N.t('web_card_light_layout_horizontal')}</option>
        <option value="vertical">${I18N.t('web_card_light_layout_vertical')}</option>
      </select>
      <label><input type="checkbox" id="optLightUseColor"> ${I18N.t('web_card_light_use_color')}</label>
      <label><input type="checkbox" id="optLightShowBrightness" checked> ${I18N.t('web_card_light_show_brightness')}</label>
      <label>${I18N.t('web_card_controls_mushroom_light')}</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optLightCtrlBrightness" checked> ${I18N.t('web_card_light_ctrl_brightness')}</label>
        <label class="inline-check"><input type="checkbox" id="optLightCtrlColorTemp"> ${I18N.t('web_card_light_ctrl_color_temp')}</label>
        <label class="inline-check"><input type="checkbox" id="optLightCtrlColor"> ${I18N.t('web_card_light_ctrl_color')}</label>
      </div>
      <label><input type="checkbox" id="optLightCollapsible"> ${I18N.t('web_card_light_collapsible')}</label>
      <div class="hint">${I18N.t('web_card_light_hint')}</div>
    `;
  } else if (type === 'media_player') {
    container.innerHTML = `
      <label>${I18N.t('web_card_media_name_label')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_media_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_media_player')}">
      <label>${I18N.t('web_card_variant')}</label>
      <select id="optMediaVariant">
        <option value="compact">${I18N.t('web_card_media_variant_compact')}</option>
        <option value="full">${I18N.t('web_card_media_variant_full')}</option>
      </select>
      <label><input type="checkbox" id="optMediaUseInfo" checked> ${I18N.t('web_card_media_use_info')}</label>
      <label><input type="checkbox" id="optMediaShowVolume"> ${I18N.t('web_card_media_show_volume')}</label>
      <label>${I18N.t('web_card_media_transport_controls')}</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlOnOff"> ${I18N.t('web_card_media_ctrl_power')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlShuffle"> ${I18N.t('web_card_media_ctrl_shuffle')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlPrevious" checked> ${I18N.t('web_card_media_ctrl_previous')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlPlayPause" checked> ${I18N.t('web_card_media_ctrl_play_pause')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlNext" checked> ${I18N.t('web_card_media_ctrl_next')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaCtrlRepeat"> ${I18N.t('web_card_media_ctrl_repeat')}</label>
      </div>
      <label>${I18N.t('web_card_media_volume_controls')}</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optMediaVolMute" checked> ${I18N.t('web_card_media_vol_mute')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaVolButtons" checked> ${I18N.t('web_card_media_vol_buttons')}</label>
        <label class="inline-check"><input type="checkbox" id="optMediaVolSet"> ${I18N.t('web_card_media_vol_slider')}</label>
      </div>
      <div class="hint">${I18N.t('web_card_media_hint')}</div>
      <div id="mediaTopButtonsField" style="display:none">
        <label>${I18N.t('web_card_media_top_buttons_label')}</label>
        <textarea id="optMediaTopButtons" rows="3" placeholder='[{"name":"Group","service":"media_player.join","entity_id":"media_player.salon","data":{"group_members":["media_player.cuisine"]}}]'>[]</textarea>
        <div class="hint">${I18N.t('web_card_media_top_buttons_hint')}</div>
      </div>
    `;
    document.getElementById('optMediaVariant').addEventListener('change', updateMediaTopButtonsVisibility);
    updateMediaTopButtonsVisibility();
  } else if (type === 'camera') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name_optional_friendly')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_camera_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_camera')}">
      <label>${I18N.t('web_card_mode')}</label>
      <select id="optCameraMode">
        <option value="stream">${I18N.t('web_card_camera_mode_stream')}</option>
        <option value="snapshot">${I18N.t('web_card_camera_mode_snapshot')}</option>
      </select>
      <label>${I18N.t('web_card_camera_interval')}</label><input type="number" id="optCameraInterval" value="2" min="1" max="60">
      <label>${I18N.t('web_card_camera_aspect')}</label>
      <select id="optCameraAspect">
        <option value="1.7778">${I18N.t('web_card_aspect_16_9')}</option>
        <option value="1.3333">${I18N.t('web_card_aspect_4_3')}</option>
        <option value="1">${I18N.t('web_card_aspect_1_1')}</option>
        <option value="0.75">${I18N.t('web_card_aspect_3_4')}</option>
      </select>
      <label>${I18N.t('web_card_camera_fit')}</label>
      <select id="optCameraFit">
        <option value="cover">${I18N.t('web_card_fit_cover')}</option>
        <option value="contain">${I18N.t('web_card_fit_contain')}</option>
      </select>
      <div class="hint">${I18N.t('web_card_camera_hint')}</div>
    `;
  } else if (type === 'fan') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_fan_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_fan')}">
      <label>${I18N.t('web_card_layout')}</label>
      <select id="optFanStyle">
        <option value="auto">${I18N.t('web_card_fan_style_auto')}</option>
        <option value="simple">${I18N.t('web_card_fan_style_simple')}</option>
        <option value="step">${I18N.t('web_card_fan_style_step')}</option>
        <option value="full">${I18N.t('web_card_fan_style_full')}</option>
      </select>
      <label>${I18N.t('web_card_fan_preset_modes')}</label><input type="text" id="optFanPresetModes" placeholder="${I18N.t('web_card_ph_fan_presets')}">
      <div id="fanStepWrap">
        <label>${I18N.t('web_card_fan_step')}</label><input type="number" id="optFanStep" value="20" min="1" max="100">
      </div>
      <label><input type="checkbox" id="optFanShowCaptions" checked> ${I18N.t('web_card_fan_show_captions')}</label>
      <div class="hint">${I18N.t('web_card_fan_hint')}</div>
    `;
    document.getElementById('optFanStyle').addEventListener('change', updateFanStepVisibility);
    updateFanStepVisibility();
  } else if (type === 'climate') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_climate_name')}">
      <label>${I18N.t('web_card_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_climate')}">
      <label>${I18N.t('web_card_climate_hvac_modes')}</label><input type="text" id="optHvacModes" placeholder="heat_cool,cool">
      <label>${I18N.t('web_card_climate_hvac_display')}</label>
      <select id="optHvacModeStyle">
        <option value="icons">${I18N.t('web_card_display_icon')}</option>
        <option value="label">${I18N.t('web_card_display_label')}</option>
      </select>
      <label>${I18N.t('web_card_climate_fan_modes')}</label><input type="text" id="optFanModes" placeholder="low,medium,high,auto">
      <label>${I18N.t('web_card_climate_fan_display')}</label>
      <select id="optFanModeStyle">
        <option value="label">${I18N.t('web_card_display_label')}</option>
        <option value="icons">${I18N.t('web_card_display_icon')}</option>
      </select>
      <label>${I18N.t('web_card_climate_swing_modes')}</label><input type="text" id="optSwingModes" placeholder="stop,swing">
      <label>${I18N.t('web_card_climate_swing_display')}</label>
      <select id="optSwingModeStyle">
        <option value="label">${I18N.t('web_card_display_label')}</option>
        <option value="icons">${I18N.t('web_card_display_icon')}</option>
      </select>
      <div class="hint">${I18N.t('web_card_climate_hint')}</div>
      <label><input type="checkbox" id="optShowCaptions" checked> ${I18N.t('web_card_climate_show_captions')}</label>
    `;
  } else if (type === 'button_grid' || type === 'scene_grid') {
    container.innerHTML = `
      <label>${I18N.t('web_card_columns')}</label><input type="number" id="optColumns" value="2" min="1">
      ${type === 'scene_grid' ? `<label><input type="checkbox" id="optShowLabels" checked> ${I18N.t('web_card_grid_show_labels')}</label><label><input type="checkbox" id="optIconFill"> ${I18N.t('web_card_grid_icon_fill')}</label><label>${I18N.t('web_card_grid_tile_height')}</label><input type="number" id="optTileHeight" min="40" max="300" placeholder="${I18N.t('web_card_ph_tile_height')}">` : ''}
      <div id="gridItemsList"></div>
      <div class="section-box" style="margin-top:8px">
        <label>${type === 'button_grid' ? I18N.t('web_card_grid_button_name') : I18N.t('web_card_grid_scene_name')}</label><input type="text" id="giName" placeholder="${type === 'button_grid' ? I18N.t('web_card_ph_button_name') : I18N.t('web_card_ph_scene_name')}">
        ${type === 'button_grid' ? `
          <label>${I18N.t('web_card_grid_service')}</label><input type="text" id="giService" placeholder="${I18N.t('web_card_ph_service')}">
          <label>${I18N.t('web_card_entity_id_optional')}</label><input type="text" id="giEntityId" placeholder="${I18N.t('web_card_ph_media_tv')}">
          <label>${I18N.t('web_card_grid_data_label')}</label><input type="text" id="giData" placeholder='{"media_content_type":"app"}'>
        ` : `
          <label>${I18N.t('web_card_grid_scene_entity')}</label><input type="text" id="giEntityId" placeholder="${I18N.t('web_card_ph_scene_entity')}">
          <label>${I18N.t('web_card_grid_page')}</label><input type="text" id="giPage" placeholder="${I18N.t('web_card_ph_page')}">
          <label>${I18N.t('web_card_grid_harmony_action')}</label>
          <select id="giHarmonyMode" onchange="onGiHarmonyModeChange()">
            <option value="">${I18N.t('web_none')}</option>
            <option value="activity">${I18N.t('web_card_harmony_activity')}</option>
            <option value="command">${I18N.t('web_card_harmony_device_command')}</option>
          </select>
          <div id="giHarmonyPicker"></div>
          <label>${I18N.t('web_card_grid_ir')}</label>
          <select id="giIrDevice" onchange="onGiIrDeviceChange()">
            <option value="">${I18N.t('web_none')}</option>
            ${(dashboardData.irDevices || []).map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
          <input type="text" id="giIrCommand" list="giIrCommandHints" placeholder="${I18N.t('web_card_ph_ir_command')}">
          <datalist id="giIrCommandHints"></datalist>
          ${(dashboardData.irDevices || []).length === 0 ? `<div class="hint">${I18N.t('web_card_grid_no_ir_hint')}</div>` : ''}
          <label>${I18N.t('web_card_grid_composed_activity')}</label>
          <select id="giActivityRef">
            <option value="">${I18N.t('web_none')}</option>
            ${(dashboardData.activities || []).map(a => `<option value="${a.id}">${a.name} (${a.room})</option>`).join('')}
          </select>
          ${(dashboardData.activities || []).length === 0 ? `<div class="hint">${I18N.t('web_card_grid_no_activities_hint')}</div>` : ''}
          <label>${I18N.t('web_card_grid_color')}</label>${colorFieldHtml('giColor', '', '#66009688')}
          <div class="divider" style="margin:12px 0"></div>
          <label><input type="checkbox" id="giTrack" onchange="onGiTrackChange()"> ${I18N.t('web_card_grid_track')}</label>
          <div class="hint">${I18N.t('web_card_grid_track_hint')}</div>
          <div id="giRoomField" style="display:none">
            <label>${I18N.t('web_card_room')}</label><input type="text" id="giRoom" placeholder="${I18N.t('web_card_ph_name_room')}">
            <label>${I18N.t('web_card_grid_devices_label')}</label>
            <input type="text" id="giDevices" placeholder="${I18N.t('web_card_ph_device_ids')}">
            <div class="hint">${I18N.t('web_card_grid_devices_hint')}</div>
          </div>
        `}
        ${iconFieldHtml('giIcon')}
        <button type="button" class="secondary" onclick="addGridItem('${type}')" id="giSubmitBtn" data-add-key="${type === 'button_grid' ? 'web_card_grid_add_button' : 'web_card_grid_add_scene'}">${type === 'button_grid' ? I18N.t('web_card_grid_add_button') : I18N.t('web_card_grid_add_scene')}</button>
        <button type="button" class="secondary" onclick="cancelGridItemEdit()" id="giCancelBtn" style="display:none">${I18N.t('web_cancel_edit')}</button>
      </div>
      <div class="hint">${type === 'button_grid' ? I18N.t('web_card_grid_button_list_hint') : I18N.t('web_card_grid_scene_list_hint')}</div>
    `;
    window._pendingGridItems = window._pendingGridItems || [];
    renderGridItemsList(type);
  } else if (type === 'apple_tv_remote') {
    container.innerHTML = `<div id="atvHarmonyPicker"></div>`;
    renderAppleTvHarmonyFields();
  } else if (type === 'tv_remote') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_tv_name')}">
      <label>${I18N.t('web_card_remote_entity_id')}</label><input type="text" id="optRemoteEntity" placeholder="${I18N.t('web_card_ph_remote')}">
      <label>${I18N.t('web_card_media_entity_id_opt')}</label><input type="text" id="optMediaEntity" placeholder="${I18N.t('web_card_ph_media_tv')}">
      <label>${I18N.t('web_card_mute_entity_id_opt')}</label><input type="text" id="optMuteEntity" placeholder="${I18N.t('web_card_ph_soundbar')}">
    `;
  } else if (type === 'clock_weather') {
    container.innerHTML = `
      <label>${I18N.t('web_card_weather_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_weather')}">
      <label>${I18N.t('web_card_time_format')}</label>
      <select id="optTimeFormat">
        <option value="12">${I18N.t('web_card_time_12h')}</option>
        <option value="24">${I18N.t('web_card_time_24h')}</option>
      </select>
      <label>${I18N.t('web_card_forecast_rows')}</label><input type="number" id="optForecastRows" value="4" min="0" max="10">
      <label>${I18N.t('web_card_calendar_entity')}</label><input type="text" id="optCalendarEntity" placeholder="${I18N.t('web_card_ph_calendar')}">
      <div class="hint">${I18N.t('web_card_clock_weather_hint')}</div>
    `;
  } else if (type === 'vacuum') {
    container.innerHTML = `
      <label>${I18N.t('web_card_name_optional_friendly')}</label><input type="text" id="optName" placeholder="${I18N.t('web_card_ph_vacuum_name')}">
      <label>${I18N.t('web_card_vacuum_entity_id')}</label><input type="text" id="optEntityId" placeholder="${I18N.t('web_card_ph_vacuum')}">
      <label>${I18N.t('web_card_map_image')}</label><input type="text" id="optMapImage" placeholder="${I18N.t('web_card_ph_map_image')}">
      <label>${I18N.t('web_card_map_rotation')}</label><input type="number" id="optMapRotation" value="0" step="90">
      <label>${I18N.t('web_card_map_height')}</label><input type="number" id="optMapHeight" value="200" min="0">
      <div id="vacuumRoomsList"></div>
      <div class="section-box" style="margin-top:8px">
        <label>${I18N.t('web_card_room_name')}</label><input type="text" id="vrName" placeholder="${I18N.t('web_card_ph_kitchen')}">
        <label>${I18N.t('web_card_room_segment_id')}</label><input type="number" id="vrId" placeholder="${I18N.t('web_card_ph_room_id')}">
        <button type="button" class="secondary" onclick="addVacuumRoom()">${I18N.t('web_card_vacuum_add_room')}</button>
      </div>
      <div class="hint">${I18N.t('web_card_vacuum_hint')}</div>

      <label style="margin-top:10px">${I18N.t('web_card_vacuum_room_clean_label')}</label>
      <input type="text" id="optRoomCleanDomain" placeholder="${I18N.t('web_card_ph_room_clean_domain')}">
      <input type="text" id="optRoomCleanService" placeholder="${I18N.t('web_card_ph_room_clean_service')}" style="margin-top:6px">
      <input type="text" id="optRoomCleanParameter" placeholder="${I18N.t('web_card_ph_room_clean_field')}" style="margin-top:6px">
      <div class="hint">${I18N.t('web_card_vacuum_room_clean_hint')}</div>
    `;
    window._pendingVacuumRooms = window._pendingVacuumRooms || [];
    renderVacuumRoomsList();
  } else if (type === 'plex') {
    container.innerHTML = `
      <label>${I18N.t('web_card_plex_host')}</label><input type="text" id="optPlexHost" placeholder="${I18N.t('web_card_ph_plex_host')}">
      <label>${I18N.t('web_card_plex_token')}</label><input type="text" id="optPlexToken" placeholder="${I18N.t('web_card_ph_plex_token')}">
      <label>${I18N.t('web_card_plex_media_entity')}</label><input type="text" id="optPlexMediaEntity" placeholder="${I18N.t('web_card_ph_media_tv')}">
      <label>${I18N.t('web_card_plex_source')}</label><input type="text" id="optPlexSource" value="Plex" placeholder="Plex">
      <label>${I18N.t('web_card_plex_play_entity')}</label><input type="text" id="optPlexPlayEntity" placeholder="${I18N.t('web_card_ph_plex_play_entity')}">
      <label>${I18N.t('web_card_plex_play_type')}</label>
      <select id="optPlexPlayContentType">
        <option value="video">${I18N.t('web_card_plex_type_video')}</option>
        <option value="url">${I18N.t('web_card_plex_type_url')}</option>
      </select>
      <div class="hint">${I18N.t('web_card_plex_client_hint')}</div>
      <label>${I18N.t('web_card_plex_rows')}</label>
      <div class="hint-row">
        <label class="inline-check"><input type="checkbox" id="optPlexShowOnDeck" checked> ${I18N.t('web_card_plex_row_on_deck')}</label>
        <label class="inline-check"><input type="checkbox" id="optPlexShowMovies" checked> ${I18N.t('plex_recently_added_movies')}</label>
        <label class="inline-check"><input type="checkbox" id="optPlexShowShows" checked> ${I18N.t('plex_recently_added_tv')}</label>
      </div>
      <label>${I18N.t('web_card_plex_items_per_row')}</label><input type="number" id="optPlexItemsPerRow" value="12" min="1" max="30">
      <div class="hint">${I18N.t('web_card_plex_rows_hint')}</div>
    `;
  } else {
    // Advanced / custom: raw options JSON, and free type name if "custom"
    container.innerHTML = `
      ${type === 'custom' ? `<label>${I18N.t('web_card_type_string')}</label><input type="text" id="optCustomType" placeholder="${I18N.t('web_card_ph_custom_type')}">` : ''}
      <label>${I18N.t('web_card_options_json')}</label>
      <textarea id="optRawJson" rows="4" placeholder='{"entity_id": "..."}'>{}</textarea>
      <div class="hint">${I18N.t('web_card_custom_hint')}</div>
    `;
  }

  // Attach live entity autocomplete to whichever entity_id fields this card
  // type created. Only attaches when /ha-states data is available (device mode
  // + HA connected); otherwise the inputs stay plain text fields.
  const mainDomain = type === 'clock_weather' ? 'weather'
    : type === 'source_select' ? null
    : type === 'select' ? ['select', 'input_select']
    : type;
  ['optEntityId', 'optRemoteEntity', 'optMediaEntity', 'optMuteEntity',
    'optCalendarEntity', 'optMapImage', 'giEntityId',
    'optPlexMediaEntity', 'optPlexPlayEntity'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const dom = id === 'optEntityId' ? mainDomain
      : id === 'optRemoteEntity' ? 'remote'
      : id === 'optMediaEntity' ? 'media_player'
      : id === 'optMuteEntity' ? 'media_player'
      : id === 'optCalendarEntity' ? 'calendar'
      : id === 'optMapImage' ? 'image'
      : id === 'optPlexMediaEntity' ? 'media_player'
      : id === 'optPlexPlayEntity' ? 'media_player'
      : null; // giEntityId — any domain (scene.*, script.*, media_player.*, …)
    attachEntityAutocomplete(el, dom);
  });
}

// media_player card: top_buttons only make sense on the "full" variant
// (the compact tile has no room for them) — hide the field otherwise.
function updateMediaTopButtonsVisibility() {
  const variantEl = document.getElementById('optMediaVariant');
  const field = document.getElementById('mediaTopButtonsField');
  if (!variantEl || !field) return;
  field.style.display = variantEl.value === 'full' ? '' : 'none';
}

// fan card: percentage step only applies to simple/full layouts — the
// "step" style uses HA's increase_speed/decrease_speed services, so there's
// no numeric step to configure.
function updateFanStepVisibility() {
  const styleEl = document.getElementById('optFanStyle');
  const wrap = document.getElementById('fanStepWrap');
  if (!styleEl || !wrap) return;
  wrap.style.display = styleEl.value === 'step' ? 'none' : '';
}

let editingGridItem = null; // index of the button/scene being edited within _pendingGridItems, or null

function onGiTrackChange() {
  const checked = document.getElementById('giTrack').checked;
  document.getElementById('giRoomField').style.display = checked ? '' : 'none';
}

/**
 * Refreshes the giIrCommand <datalist> for whichever IR device is
 * currently picked — command ids are only actually *known* here for
 * inline devices (their commands map is right there in dashboardData).
 * For an ir-database *reference* device, the real command list only
 * exists on the phone at runtime (the sdcard file); the best this builder
 * can do is suggest whatever ids you typed into "known command ids" while
 * creating that device (see saveIrDevice/irDeviceCommandHints in ir.js) —
 * giIrCommand is a plain text input specifically so an unlisted id still
 * works fine, it's just not autocompleted.
 */
function onGiIrDeviceChange() {
  const deviceId = document.getElementById('giIrDevice').value;
  const datalist = document.getElementById('giIrCommandHints');
  const device = (dashboardData.irDevices || []).find(d => d.id === deviceId);
  if (!device) { datalist.innerHTML = ''; return; }
  const ids = device.commands
    ? Object.keys(device.commands)
    : (typeof irDeviceCommandHints !== 'undefined' ? (irDeviceCommandHints[deviceId] || []) : []);
  datalist.innerHTML = ids.map(id => `<option value="${id}">`).join('');
}

function renderAppleTvHarmonyFields() {
  const container = document.getElementById('atvHarmonyPicker');
  if (!container) return;
  if (harmonyAvailable) {
    renderHarmonyHubSelect(container, 'device', 'atv');
  } else {
    container.innerHTML = `<label>${I18N.t('web_card_atv_device_id')}</label><input type="text" id="optDeviceId" placeholder="${I18N.t('web_card_ph_harmony_device_id')}">`;
  }
}

async function fillAppleTvHarmonyFields(o) {
  renderAppleTvHarmonyFields();
  if (harmonyAvailable) {
    document.getElementById('atvHub').value = o.hub || '';
    if (o.hub) {
      await onHarmonyHubChange('device', 'atv');
      document.getElementById('atvDeviceSelect').value = o.deviceId || '';
    }
  } else {
    document.getElementById('optDeviceId').value = o.deviceId || '';
  }
}

function onGiHarmonyModeChange() {
  const mode = document.getElementById('giHarmonyMode').value;
  const container = document.getElementById('giHarmonyPicker');
  if (!mode) { container.innerHTML = ''; return; }
  if (harmonyAvailable) {
    renderHarmonyHubSelect(container, mode, 'gi');
  } else if (mode === 'activity') {
    container.innerHTML = `<label>${I18N.t('web_card_harmony_activity_id')}</label><input type="text" id="giActivityId" placeholder="${I18N.t('web_card_ph_harmony_activity')}">`;
  } else {
    container.innerHTML = `
      <label>${I18N.t('web_card_harmony_device_id')}</label><input type="text" id="giHarmonyDevice" placeholder="${I18N.t('web_card_ph_harmony_device_id')}">
      <label>${I18N.t('web_card_harmony_command')}</label><input type="text" id="giHarmonyCommand" placeholder="${I18N.t('web_card_ph_harmony_command')}">
    `;
  }
}

function renderGridItemsList(type) {
  const list = document.getElementById('gridItemsList');
  if (!list) return;
  list.innerHTML = '';
  (window._pendingGridItems || []).forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${item.name || I18N.t('web_unnamed')}</span><span><span class="remove" style="color:#00E5FF" onclick="editGridItem('${type}', ${i})">✎</span> <span class="remove" onclick="removeGridItem('${type}', ${i})">✕</span></span>`;
    list.appendChild(el);
  });
}

function fillGridItemForm(type, item) {
  document.getElementById('giName').value = item.name || '';
  document.getElementById('giIcon').value = item.icon || '';
  updateIconThumb('giIcon');
  if (type === 'button_grid') {
    document.getElementById('giService').value = item.service || '';
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giData').value = item.data ? JSON.stringify(item.data) : '';
  } else {
    document.getElementById('giEntityId').value = item.entity_id || '';
    document.getElementById('giPage').value = item.page || '';
    if (item.irDevice) {
      document.getElementById('giIrDevice').value = item.irDevice;
      onGiIrDeviceChange();
      document.getElementById('giIrCommand').value = item.irCommand || '';
    }
    const actRefSel = document.getElementById('giActivityRef');
    if (actRefSel) actRefSel.value = item.activity || '';
    setColorFieldValue('giColor', item.color || '');
    document.getElementById('giTrack').checked = item.track === true;
    document.getElementById('giRoom').value = item.room || '';
    document.getElementById('giDevices').value = (item.devices || []).join(', ');
    onGiTrackChange();
  }
}

/**
 * Restores a scene/button item's Harmony fields into the form when editing.
 * Deliberately does NOT default `hub` to "the first configured hub" when the
 * item has none — with more than one hub configured, guessing is exactly
 * the kind of silent wrong-hub bug that bit us before. An item saved before
 * `hub` was mandatory just shows the Hub select empty, forcing an explicit
 * pick before it can be saved again (see the validation in addGridItem()).
 */
async function fillGiHarmonySection(item) {
  const modeSel = document.getElementById('giHarmonyMode');
  if (!modeSel) return; // button_grid form has no Harmony section
  const mode = item.activityId ? 'activity' : (item.harmonyDevice && item.harmonyCommand) ? 'command' : '';
  modeSel.value = mode;
  onGiHarmonyModeChange();
  if (!mode) return;
  if (harmonyAvailable) {
    document.getElementById('giHub').value = item.hub || '';
    if (item.hub) {
      await onHarmonyHubChange(mode, 'gi');
      if (mode === 'activity') {
        document.getElementById('giActivitySelect').value = item.activityId || '';
      } else {
        document.getElementById('giDeviceSelect').value = item.harmonyDevice || '';
        onHarmonyDeviceChange('gi');
        document.getElementById('giCommandSelect').value = item.harmonyCommand || '';
      }
    }
  } else if (mode === 'activity') {
    document.getElementById('giActivityId').value = item.activityId || '';
  } else {
    document.getElementById('giHarmonyDevice').value = item.harmonyDevice || '';
    document.getElementById('giHarmonyCommand').value = item.harmonyCommand || '';
  }
}

async function editGridItem(type, i) {
  editingGridItem = i;
  const item = window._pendingGridItems[i];
  fillGridItemForm(type, item);
  if (type !== 'button_grid') await fillGiHarmonySection(item);
  document.getElementById('giSubmitBtn').textContent = I18N.t(type === 'button_grid' ? 'web_card_grid_save_button' : 'web_card_grid_save_scene');
  document.getElementById('giCancelBtn').style.display = '';
}

function cancelGridItemEdit() {
  editingGridItem = null;
  document.getElementById('giName').value = '';
  document.getElementById('giIcon').value = '';
  updateIconThumb('giIcon');
  ['giService', 'giEntityId', 'giData', 'giPage', 'giIrDevice', 'giIrCommand', 'giActivityRef'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setColorFieldValue('giColor', '');
  const trackEl = document.getElementById('giTrack');
  if (trackEl) { trackEl.checked = false; document.getElementById('giRoom').value = ''; document.getElementById('giDevices').value = ''; onGiTrackChange(); }
  const harmonyModeSel = document.getElementById('giHarmonyMode');
  if (harmonyModeSel) { harmonyModeSel.value = ''; onGiHarmonyModeChange(); }
  const btn = document.getElementById('giSubmitBtn');
  if (btn && btn.dataset.addKey) btn.textContent = I18N.t(btn.dataset.addKey);
  document.getElementById('giCancelBtn').style.display = 'none';
}

function addGridItem(type) {
  const name = document.getElementById('giName').value.trim();
  const icon = document.getElementById('giIcon').value.trim();
  let item = { name };
  if (icon) item.icon = icon;
  if (type === 'button_grid') {
    item.service = document.getElementById('giService').value.trim();
    const entityId = document.getElementById('giEntityId').value.trim();
    if (entityId) item.entity_id = entityId;
    const rawData = document.getElementById('giData').value.trim();
    if (rawData) {
      try { item.data = JSON.parse(rawData); } catch (e) { alert(I18N.t('web_card_alert_data_json')); return; }
    }
  } else {
    const entityId = document.getElementById('giEntityId').value.trim();
    const page = document.getElementById('giPage').value.trim();
    const irDevice = document.getElementById('giIrDevice')?.value || '';
    const irCommand = document.getElementById('giIrCommand')?.value || '';
    const activityRef = document.getElementById('giActivityRef')?.value || '';
    const color = colorFieldValue('giColor');
    if (entityId) item.entity_id = entityId;
    if (page) item.page = page;
    if (irDevice && irCommand) { item.irDevice = irDevice; item.irCommand = irCommand; }
    else if (irDevice && !irCommand) { alert(I18N.t('web_card_alert_pick_ir_command')); return; }
    if (activityRef) item.activity = activityRef;
    if (color) item.color = color;

    const harmonyMode = document.getElementById('giHarmonyMode')?.value || '';
    if (harmonyMode === 'activity') {
      if (harmonyAvailable) {
        const hub = document.getElementById('giHub').value.trim();
        const activityId = document.getElementById('giActivitySelect').value.trim();
        if (!hub || !activityId) { alert(I18N.t('web_card_alert_pick_hub_activity')); return; }
        item.hub = hub;
        item.activityId = activityId;
      } else {
        const activityId = document.getElementById('giActivityId').value.trim();
        if (activityId) item.activityId = activityId;
      }
    } else if (harmonyMode === 'command') {
      if (harmonyAvailable) {
        const hub = document.getElementById('giHub').value.trim();
        const device = document.getElementById('giDeviceSelect').value.trim();
        const command = document.getElementById('giCommandSelect').value.trim();
        if (!hub || !device || !command) { alert(I18N.t('web_card_alert_pick_hub_device_command')); return; }
        item.hub = hub;
        item.harmonyDevice = device;
        item.harmonyCommand = command;
      } else {
        item.harmonyDevice = document.getElementById('giHarmonyDevice').value.trim();
        item.harmonyCommand = document.getElementById('giHarmonyCommand').value.trim();
      }
    }

    const track = document.getElementById('giTrack')?.checked || false;
    if (track) {
      const room = document.getElementById('giRoom').value.trim();
      if (!room) { alert(I18N.t('web_card_alert_track_needs_room')); return; }
      item.track = true;
      item.room = room;
      const devices = document.getElementById('giDevices').value.split(',').map(s => s.trim()).filter(Boolean);
      if (devices.length) item.devices = devices;
    }
  }
  window._pendingGridItems = window._pendingGridItems || [];
  if (editingGridItem !== null) {
    window._pendingGridItems[editingGridItem] = item;
  } else {
    window._pendingGridItems.push(item);
  }
  cancelGridItemEdit();
  renderGridItemsList(type);
}

function removeGridItem(type, i) {
  window._pendingGridItems.splice(i, 1);
  if (editingGridItem === i) cancelGridItemEdit();
  renderGridItemsList(type);
}

// Fake example entity — used to preview a `climate` card that has no
// hvac_modes/fan_modes/swing_modes override, so the builder still shows a
// realistic result instead of an empty shell. Based on a real Daikin unit.

function renderVacuumRoomsList() {
  const list = document.getElementById('vacuumRoomsList');
  if (!list) return;
  list.innerHTML = '';
  (window._pendingVacuumRooms || []).forEach((room, i) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span>${room.name || I18N.t('web_unnamed')} — ${I18N.t('web_card_room_id_display', room.id)}</span><span class="remove" onclick="removeVacuumRoom(${i})">✕</span>`;
    list.appendChild(el);
  });
}

function addVacuumRoom() {
  const name = document.getElementById('vrName').value.trim();
  const idRaw = document.getElementById('vrId').value.trim();
  const id = parseInt(idRaw, 10);
  if (!name || isNaN(id)) { alert(I18N.t('web_card_alert_room_name_id')); return; }
  window._pendingVacuumRooms = window._pendingVacuumRooms || [];
  window._pendingVacuumRooms.push({ name, id });
  document.getElementById('vrName').value = '';
  document.getElementById('vrId').value = '';
  renderVacuumRoomsList();
}

function removeVacuumRoom(i) {
  window._pendingVacuumRooms.splice(i, 1);
  updateCardFormInputs();
}

// Opens the card dialog — the single entry point for both "+ Add card" and
// the ✎ edit icon on a card in the preview, same as clicking "+ ADD CARD" or
// a card's own edit action in the Home Assistant dashboard editor.
function openCardDialog(idx) {
  editingCard = idx;
  const isNew = idx === null;
  document.getElementById('cardEditorTitle').textContent = isNew ? I18N.t('web_modal_add_card') : I18N.t('web_modal_edit_card');
  document.getElementById('addCardBtn').innerText = isNew ? I18N.t('web_modal_add_card_to_page') : I18N.t('web_save_changes');

  const select = document.getElementById('cardTypeSelect');
  if (isNew) {
    select.value = select.options[0].value;
    updateCardFormInputs();
  } else {
    const card = dashboardData.pages[currentActivePage].cards[idx];
    const known = Array.from(select.options).map(o => o.value).filter(v => v !== 'custom');
    select.value = known.includes(card.type) ? card.type : 'custom';
    updateCardFormInputs();
    fillCardForm(card);
  }

  document.getElementById('cardEditorModal').classList.add('open');
}

function editCard(idx) {
  openCardDialog(idx);
}

function fillCardForm(card) {
  const type = card.type;
  const o = card.options || {};
  if (NAME_ENTITY_TYPES.includes(type)) {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
  } else if (type === 'title') {
    document.getElementById('optTitle').value = o.title || '';
    document.getElementById('optSubtitle').value = o.subtitle || '';
    document.getElementById('optTitleAlignment').value = ['center', 'end', 'justify'].includes(o.alignment) ? o.alignment : 'start';
    document.getElementById('optTitleIcon').value = o.icon || '';
    updateIconThumb('optTitleIcon');
    document.getElementById('optTitleDivider').checked = o.divider === true;
    document.getElementById('optTitleColor').value = o.color || '';
  } else if (type === 'switch') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    setColorFieldValue('optOnColor', o.on_color || '');
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
  } else if (type === 'cover') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optIcon').value = o.icon || '';
    updateIconThumb('optIcon');
    document.getElementById('optCoverLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
    // Mirrors CoverCard.kt: if none of the 3 flags are set at all, the app
    // falls back to "buttons only" — reflect that same default here.
    const hasCoverCtrlOpts = ('show_buttons_control' in o) || ('show_position_control' in o) || ('show_tilt_position_control' in o);
    document.getElementById('optCoverCtrlButtons').checked = hasCoverCtrlOpts ? (o.show_buttons_control === true) : true;
    document.getElementById('optCoverCtrlPosition').checked = o.show_position_control === true;
    document.getElementById('optCoverCtrlTilt').checked = o.show_tilt_position_control === true;
  } else if (type === 'select') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optSelectIconColor').value = o.icon_color || '';
    document.getElementById('optSelectLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
  } else if (type === 'light') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optLightLayout').value = ['horizontal', 'vertical'].includes(o.layout) ? o.layout : 'default';
    document.getElementById('optLightUseColor').checked = o.use_light_color === true;
    document.getElementById('optLightShowBrightness').checked = o.show_brightness !== false;
    // Mirrors LightCard.kt: if none of the 3 flags are set at all, the app
    // falls back to "brightness control only" — reflect that same default here.
    const hasLightCtrlOpts = ('show_brightness_control' in o) || ('show_color_temp_control' in o) || ('show_color_control' in o);
    document.getElementById('optLightCtrlBrightness').checked = hasLightCtrlOpts ? (o.show_brightness_control === true) : true;
    document.getElementById('optLightCtrlColorTemp').checked = o.show_color_temp_control === true;
    document.getElementById('optLightCtrlColor').checked = o.show_color_control === true;
    document.getElementById('optLightCollapsible').checked = o.collapsible_controls === true;
  } else if (type === 'media_player') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optMediaVariant').value = o.variant === 'full' ? 'full' : 'compact';
    document.getElementById('optMediaUseInfo').checked = o.use_media_info !== false;
    document.getElementById('optMediaShowVolume').checked = o.show_volume_level === true;
    const mCtrls = (o.media_controls || 'previous,play_pause,next').split(',').map(s => s.trim());
    document.getElementById('optMediaCtrlOnOff').checked = mCtrls.includes('on_off');
    document.getElementById('optMediaCtrlShuffle').checked = mCtrls.includes('shuffle');
    document.getElementById('optMediaCtrlPrevious').checked = mCtrls.includes('previous');
    document.getElementById('optMediaCtrlPlayPause').checked = mCtrls.includes('play_pause');
    document.getElementById('optMediaCtrlNext').checked = mCtrls.includes('next');
    document.getElementById('optMediaCtrlRepeat').checked = mCtrls.includes('repeat');
    const vCtrls = (o.volume_controls || 'mute,buttons').split(',').map(s => s.trim());
    document.getElementById('optMediaVolMute').checked = vCtrls.includes('mute');
    document.getElementById('optMediaVolButtons').checked = vCtrls.includes('buttons');
    document.getElementById('optMediaVolSet').checked = vCtrls.includes('set');
    document.getElementById('optMediaTopButtons').value = JSON.stringify(o.top_buttons || [], null, 2);
    updateMediaTopButtonsVisibility();
  } else if (type === 'camera') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optCameraMode').value = o.mode === 'snapshot' ? 'snapshot' : 'stream';
    document.getElementById('optCameraInterval').value = o.snapshot_interval ?? 2;
    // Snap the aspect dropdown to the stored value when it matches a preset;
    // an unusual custom aspect just shows the default here (the JSON keeps its
    // own value until the card is re-saved from this form).
    const aspSel = document.getElementById('optCameraAspect');
    aspSel.value = (o.aspect != null) ? String(o.aspect) : '1.7778';
    if (!aspSel.value) aspSel.value = '1.7778';
    document.getElementById('optCameraFit').value = o.fit === 'contain' ? 'contain' : 'cover';
  } else if (type === 'fan') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optFanStyle').value = ['simple', 'step', 'full'].includes(o.style) ? o.style : 'auto';
    document.getElementById('optFanPresetModes').value = (o.preset_modes || []).join(',');
    document.getElementById('optFanStep').value = o.step ?? 20;
    updateFanStepVisibility();
    document.getElementById('optFanShowCaptions').checked = o.show_captions !== false;
  } else if (type === 'climate') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optHvacModes').value = (o.hvac_modes || []).join(',');
    document.getElementById('optHvacModeStyle').value = o.hvac_mode_style === 'label' ? 'label' : 'icons';
    document.getElementById('optFanModes').value = (o.fan_modes || []).join(',');
    document.getElementById('optFanModeStyle').value = o.fan_mode_style === 'icons' ? 'icons' : 'label';
    document.getElementById('optSwingModes').value = (o.swing_modes || []).join(',');
    document.getElementById('optSwingModeStyle').value = o.swing_mode_style === 'icons' ? 'icons' : 'label';
    document.getElementById('optShowCaptions').checked = o.show_captions !== false;
  } else if (type === 'button_grid' || type === 'scene_grid') {
    document.getElementById('optColumns').value = o.columns || 2;
    if (type === 'scene_grid') {
      document.getElementById('optShowLabels').checked = o.show_labels !== false;
      document.getElementById('optIconFill').checked = o.icon_fill === true;
      document.getElementById('optTileHeight').value = o.tile_height || '';
    }
    window._pendingGridItems = JSON.parse(JSON.stringify(o.buttons || o.scenes || []));
    renderGridItemsList(type);
  } else if (type === 'apple_tv_remote') {
    fillAppleTvHarmonyFields(o);
  } else if (type === 'tv_remote') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optRemoteEntity').value = o.remote_entity || '';
    document.getElementById('optMediaEntity').value = o.media_entity || '';
    document.getElementById('optMuteEntity').value = o.mute_entity || '';
  } else if (type === 'clock_weather') {
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optTimeFormat').value = (o.time_format === 24) ? '24' : '12';
    document.getElementById('optForecastRows').value = (o.forecast_rows ?? 4);
    document.getElementById('optCalendarEntity').value = o.calendar_entity || '';
  } else if (type === 'vacuum') {
    document.getElementById('optName').value = o.name || '';
    document.getElementById('optEntityId').value = o.entity_id || '';
    document.getElementById('optMapImage').value = o.map_image || '';
    document.getElementById('optMapRotation').value = o.map_rotation ?? 0;
    document.getElementById('optMapHeight').value = o.map_height ?? 200;
    window._pendingVacuumRooms = JSON.parse(JSON.stringify(o.rooms || []));
    renderVacuumRoomsList();
    const rca = o.room_clean_action || {};
    document.getElementById('optRoomCleanDomain').value = rca.domain || '';
    document.getElementById('optRoomCleanService').value = rca.service || '';
    document.getElementById('optRoomCleanParameter').value = rca.parameter || '';
  } else if (type === 'plex') {
    document.getElementById('optPlexHost').value = o.host || '';
    document.getElementById('optPlexToken').value = o.token || '';
    document.getElementById('optPlexMediaEntity').value = o.media_entity || '';
    document.getElementById('optPlexSource').value = o.source || 'Plex';
    document.getElementById('optPlexPlayEntity').value = o.play_entity || '';
    document.getElementById('optPlexPlayContentType').value = o.play_content_type || 'video';
    document.getElementById('optPlexShowOnDeck').checked = o.show_on_deck !== false;
    document.getElementById('optPlexShowMovies').checked = o.show_recently_added_movies !== false;
    document.getElementById('optPlexShowShows').checked = o.show_recently_added_shows !== false;
    document.getElementById('optPlexItemsPerRow').value = o.items_per_row ?? 12;
  } else {
    const customField = document.getElementById('optCustomType');
    if (customField) customField.value = type;
    document.getElementById('optRawJson').value = JSON.stringify(o, null, 2);
  }
}

function cancelCardEdit() {
  editingCard = null;
  window._pendingGridItems = [];
  window._pendingVacuumRooms = [];
  document.getElementById('addCardBtn').innerText = I18N.t('web_modal_add_card_to_page');
  document.getElementById('cardEditorModal').classList.remove('open');
}

// Reorder helpers — used by the ↑/↓ buttons and by drag-and-drop in
// preview.js's enhanceCardControls().
function moveCard(idx, direction) {
  const cards = dashboardData.pages[currentActivePage].cards;
  const target = idx + direction;
  if (target < 0 || target >= cards.length) return;
  [cards[idx], cards[target]] = [cards[target], cards[idx]];
  renderPreview(); updateJsonOutput();
}

function reorderCard(fromIdx, toIdx) {
  const cards = dashboardData.pages[currentActivePage].cards;
  if (fromIdx < 0 || fromIdx >= cards.length || toIdx < 0 || toIdx >= cards.length) return;
  const [moved] = cards.splice(fromIdx, 1);
  cards.splice(toIdx, 0, moved);
  renderPreview(); updateJsonOutput();
}

function addCardToPage() {
  const pageIndex = currentActivePage;
  const type = document.getElementById('cardTypeSelect').value;
  let newCard = { type: type, options: {} };

  if (NAME_ENTITY_TYPES.includes(type)) {
    newCard.options.name = document.getElementById('optName').value || 'Component';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'domain.entity';
    const icon = document.getElementById('optIcon').value.trim();
    if (icon) newCard.options.icon = icon;
  } else if (type === 'title') {
    const title = document.getElementById('optTitle').value.trim();
    const subtitle = document.getElementById('optSubtitle').value.trim();
    if (!title && !subtitle) { alert(I18N.t('web_card_alert_title_required')); return; }
    if (title) newCard.options.title = title;
    if (subtitle) newCard.options.subtitle = subtitle;
    const alignment = document.getElementById('optTitleAlignment').value;
    if (alignment !== 'start') newCard.options.alignment = alignment;
    const titleIcon = document.getElementById('optTitleIcon').value.trim();
    if (titleIcon) newCard.options.icon = titleIcon;
    if (document.getElementById('optTitleDivider').checked) newCard.options.divider = true;
    const titleColor = document.getElementById('optTitleColor').value.trim();
    if (titleColor) newCard.options.color = titleColor;
  } else if (type === 'switch') {
    newCard.options.name = document.getElementById('optName').value || 'Switch';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'switch.entity';
    const onColor = colorFieldValue('optOnColor');
    if (onColor) newCard.options.on_color = onColor;
    const icon = document.getElementById('optIcon').value.trim();
    if (icon) newCard.options.icon = icon;
  } else if (type === 'cover') {
    const coverName = document.getElementById('optName').value.trim();
    if (coverName) newCard.options.name = coverName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'cover.entity';
    const coverIcon = document.getElementById('optIcon').value.trim();
    if (coverIcon) newCard.options.icon = coverIcon;
    const coverLayout = document.getElementById('optCoverLayout').value;
    if (coverLayout !== 'default') newCard.options.layout = coverLayout;
    // Written explicitly (even when checked/default) so the app's "any flag
    // present => only what's set shows" logic is unambiguous once the
    // builder has touched this card.
    newCard.options.show_buttons_control = document.getElementById('optCoverCtrlButtons').checked;
    newCard.options.show_position_control = document.getElementById('optCoverCtrlPosition').checked;
    newCard.options.show_tilt_position_control = document.getElementById('optCoverCtrlTilt').checked;
  } else if (type === 'select') {
    const selectName = document.getElementById('optName').value.trim();
    if (selectName) newCard.options.name = selectName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'input_select.entity';
    const selectIconColor = document.getElementById('optSelectIconColor').value.trim();
    if (selectIconColor) newCard.options.icon_color = selectIconColor;
    const selectLayout = document.getElementById('optSelectLayout').value;
    if (selectLayout !== 'default') newCard.options.layout = selectLayout;
  } else if (type === 'light') {
    const lightName = document.getElementById('optName').value.trim();
    if (lightName) newCard.options.name = lightName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'light.entity';
    const lightLayout = document.getElementById('optLightLayout').value;
    if (lightLayout !== 'default') newCard.options.layout = lightLayout;
    if (document.getElementById('optLightUseColor').checked) newCard.options.use_light_color = true;
    if (!document.getElementById('optLightShowBrightness').checked) newCard.options.show_brightness = false;
    // Written explicitly (even when checked/default) so the app's "any flag
    // present => only what's set shows" logic is unambiguous once the
    // builder has touched this card.
    newCard.options.show_brightness_control = document.getElementById('optLightCtrlBrightness').checked;
    newCard.options.show_color_temp_control = document.getElementById('optLightCtrlColorTemp').checked;
    newCard.options.show_color_control = document.getElementById('optLightCtrlColor').checked;
    if (document.getElementById('optLightCollapsible').checked) newCard.options.collapsible_controls = true;
  } else if (type === 'media_player') {
    const mediaName = document.getElementById('optName').value.trim();
    if (mediaName) newCard.options.name = mediaName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'media_player.entity';
    const mediaVariant = document.getElementById('optMediaVariant').value;
    if (mediaVariant === 'full') newCard.options.variant = 'full';
    if (!document.getElementById('optMediaUseInfo').checked) newCard.options.use_media_info = false;
    if (document.getElementById('optMediaShowVolume').checked) newCard.options.show_volume_level = true;
    const mediaControls = [];
    if (document.getElementById('optMediaCtrlOnOff').checked) mediaControls.push('on_off');
    if (document.getElementById('optMediaCtrlShuffle').checked) mediaControls.push('shuffle');
    if (document.getElementById('optMediaCtrlPrevious').checked) mediaControls.push('previous');
    if (document.getElementById('optMediaCtrlPlayPause').checked) mediaControls.push('play_pause');
    if (document.getElementById('optMediaCtrlNext').checked) mediaControls.push('next');
    if (document.getElementById('optMediaCtrlRepeat').checked) mediaControls.push('repeat');
    if (mediaControls.join(',') !== 'previous,play_pause,next') newCard.options.media_controls = mediaControls.join(',');
    const volumeControls = [];
    if (document.getElementById('optMediaVolMute').checked) volumeControls.push('mute');
    if (document.getElementById('optMediaVolButtons').checked) volumeControls.push('buttons');
    if (document.getElementById('optMediaVolSet').checked) volumeControls.push('set');
    if (volumeControls.join(',') !== 'mute,buttons') newCard.options.volume_controls = volumeControls.join(',');
    if (mediaVariant === 'full') {
      try {
        const topButtons = JSON.parse(document.getElementById('optMediaTopButtons').value || '[]');
        if (Array.isArray(topButtons) && topButtons.length) newCard.options.top_buttons = topButtons;
      } catch (e) {
        alert(I18N.t('web_card_alert_top_buttons_json'));
        return;
      }
    }
  } else if (type === 'camera') {
    const camName = document.getElementById('optName').value.trim();
    if (camName) newCard.options.name = camName;
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'camera.entity';
    if (document.getElementById('optCameraMode').value === 'snapshot') newCard.options.mode = 'snapshot';
    const camInterval = parseInt(document.getElementById('optCameraInterval').value, 10);
    if (Number.isFinite(camInterval) && camInterval !== 2) newCard.options.snapshot_interval = camInterval;
    const camAspect = parseFloat(document.getElementById('optCameraAspect').value);
    if (Number.isFinite(camAspect) && Math.abs(camAspect - 1.7778) > 0.001) newCard.options.aspect = camAspect;
    if (document.getElementById('optCameraFit').value === 'contain') newCard.options.fit = 'contain';
  } else if (type === 'fan') {
    newCard.options.name = document.getElementById('optName').value || 'Fan';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'fan.entity';
    if (document.getElementById('optFanStyle').value !== 'auto') newCard.options.style = document.getElementById('optFanStyle').value;
    const presetModes = document.getElementById('optFanPresetModes').value.trim();
    if (presetModes) newCard.options.preset_modes = presetModes.split(',').map(s => s.trim()).filter(Boolean);
    const step = parseInt(document.getElementById('optFanStep').value, 10);
    if (!isNaN(step) && step !== 20) newCard.options.step = step;
    if (!document.getElementById('optFanShowCaptions').checked) newCard.options.show_captions = false;
  } else if (type === 'climate') {
    newCard.options.name = document.getElementById('optName').value || 'Climate';
    newCard.options.entity_id = document.getElementById('optEntityId').value || 'climate.entity';
    const hvacModes = document.getElementById('optHvacModes').value.trim();
    if (hvacModes) newCard.options.hvac_modes = hvacModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optHvacModeStyle').value === 'label') newCard.options.hvac_mode_style = 'label';
    const fanModes = document.getElementById('optFanModes').value.trim();
    if (fanModes) newCard.options.fan_modes = fanModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optFanModeStyle').value === 'icons') newCard.options.fan_mode_style = 'icons';
    const swingModes = document.getElementById('optSwingModes').value.trim();
    if (swingModes) newCard.options.swing_modes = swingModes.split(',').map(s => s.trim()).filter(Boolean);
    if (document.getElementById('optSwingModeStyle').value === 'icons') newCard.options.swing_mode_style = 'icons';
    if (!document.getElementById('optShowCaptions').checked) newCard.options.show_captions = false;
  } else if (type === 'button_grid') {
    newCard.options.columns = parseInt(document.getElementById('optColumns').value, 10) || 2;
    newCard.options.buttons = window._pendingGridItems || [];
    window._pendingGridItems = [];
  } else if (type === 'scene_grid') {
    newCard.options.columns = parseInt(document.getElementById('optColumns').value, 10) || 2;
    newCard.options.scenes = window._pendingGridItems || [];
    if (!document.getElementById('optShowLabels').checked) newCard.options.show_labels = false;
    if (document.getElementById('optIconFill').checked) newCard.options.icon_fill = true;
    var _th = parseInt(document.getElementById('optTileHeight').value, 10);
    if (_th) newCard.options.tile_height = _th;
    window._pendingGridItems = [];
  } else if (type === 'apple_tv_remote') {
    if (harmonyAvailable) {
      const hub = document.getElementById('atvHub').value.trim();
      const deviceId = document.getElementById('atvDeviceSelect').value.trim();
      if (!hub || !deviceId) { alert(I18N.t('web_card_alert_pick_hub_device')); return; }
      newCard.options.hub = hub;
      newCard.options.deviceId = deviceId;
    } else {
      newCard.options.deviceId = document.getElementById('optDeviceId').value || '';
    }
  } else if (type === 'tv_remote') {
    newCard.options.name = document.getElementById('optName').value || 'TV';
    newCard.options.remote_entity = document.getElementById('optRemoteEntity').value || '';
    const mediaEntity = document.getElementById('optMediaEntity').value.trim();
    const muteEntity = document.getElementById('optMuteEntity').value.trim();
    if (mediaEntity) newCard.options.media_entity = mediaEntity;
    if (muteEntity) newCard.options.mute_entity = muteEntity;
  } else if (type === 'clock_weather') {
    newCard.options.entity_id = document.getElementById('optEntityId').value.trim() || 'weather.forecast_home';
    newCard.options.time_format = parseInt(document.getElementById('optTimeFormat').value, 10) || 12;
    newCard.options.forecast_rows = parseInt(document.getElementById('optForecastRows').value, 10);
    if (isNaN(newCard.options.forecast_rows)) newCard.options.forecast_rows = 4;
    const calendarEntity = document.getElementById('optCalendarEntity').value.trim();
    if (calendarEntity) newCard.options.calendar_entity = calendarEntity;
  } else if (type === 'vacuum') {
    const vName = document.getElementById('optName').value.trim();
    if (vName) newCard.options.name = vName;
    newCard.options.entity_id = document.getElementById('optEntityId').value.trim() || 'vacuum.entity';
    const mapImage = document.getElementById('optMapImage').value.trim();
    if (mapImage) newCard.options.map_image = mapImage;
    const mapRotation = parseInt(document.getElementById('optMapRotation').value, 10);
    if (!isNaN(mapRotation) && mapRotation !== 0) newCard.options.map_rotation = mapRotation;
    const mapHeight = parseInt(document.getElementById('optMapHeight').value, 10);
    newCard.options.map_height = isNaN(mapHeight) ? 200 : mapHeight;
    newCard.options.rooms = window._pendingVacuumRooms || [];
    window._pendingVacuumRooms = [];
    const rcaDomain = document.getElementById('optRoomCleanDomain').value.trim();
    const rcaService = document.getElementById('optRoomCleanService').value.trim();
    const rcaParameter = document.getElementById('optRoomCleanParameter').value.trim();
    if (rcaDomain || rcaService || rcaParameter) {
      if (!rcaDomain || !rcaService || !rcaParameter) {
        alert(I18N.t('web_card_alert_room_clean_fields'));
        return;
      }
      newCard.options.room_clean_action = { domain: rcaDomain, service: rcaService, parameter: rcaParameter };
    }
  } else if (type === 'plex') {
    const plexHost = document.getElementById('optPlexHost').value.trim();
    const plexToken = document.getElementById('optPlexToken').value.trim();
    const plexMediaEntity = document.getElementById('optPlexMediaEntity').value.trim();
    if (!plexHost || !plexToken || !plexMediaEntity) {
      alert(I18N.t('web_card_alert_plex_fields'));
      return;
    }
    newCard.options.host = plexHost;
    newCard.options.token = plexToken;
    newCard.options.media_entity = plexMediaEntity;
    const plexSource = document.getElementById('optPlexSource').value.trim();
    if (plexSource && plexSource !== 'Plex') newCard.options.source = plexSource;
    const plexPlayEntity = document.getElementById('optPlexPlayEntity').value.trim();
    if (plexPlayEntity) {
      newCard.options.play_entity = plexPlayEntity;
      const plexPlayContentType = document.getElementById('optPlexPlayContentType').value;
      if (plexPlayContentType !== 'video') newCard.options.play_content_type = plexPlayContentType;
    }
    // Written explicitly (even when checked/default) so the app's "any flag
    // present => only what's set shows" logic is unambiguous once the
    // builder has touched this card.
    newCard.options.show_on_deck = document.getElementById('optPlexShowOnDeck').checked;
    newCard.options.show_recently_added_movies = document.getElementById('optPlexShowMovies').checked;
    newCard.options.show_recently_added_shows = document.getElementById('optPlexShowShows').checked;
    const plexItemsPerRow = parseInt(document.getElementById('optPlexItemsPerRow').value, 10);
    if (!isNaN(plexItemsPerRow) && plexItemsPerRow !== 12) newCard.options.items_per_row = plexItemsPerRow;
  } else {
    if (type === 'custom') newCard.type = document.getElementById('optCustomType').value.trim() || 'custom';
    try {
      newCard.options = JSON.parse(document.getElementById('optRawJson').value || '{}');
    } catch (e) { alert(I18N.t('web_card_alert_options_json')); return; }
  }

  if (editingCard !== null) {
    dashboardData.pages[pageIndex].cards[editingCard] = newCard;
  } else {
    dashboardData.pages[pageIndex].cards.push(newCard);
  }
  cancelCardEdit();
  renderPreview(); updateJsonOutput();
}


function removeCard(idx) {
  dashboardData.pages[currentActivePage].cards.splice(idx, 1);
  if (editingCard === idx) cancelCardEdit();
  renderPreview(); updateJsonOutput();
}

// ---- Icon / color helpers for scene_grid & button_grid previews -----------
// Icons are configured as absolute on-device paths (e.g.
// "/sdcard/astrion/icons/disco.png"). The browser preview can't read the
// device filesystem directly, but when this page is served by the remote's
// own local web server (http://<remote-ip>:8080/builder/) that server also
// exposes those files at /icons/<filename> (see ConfigServer.kt), so we just
// point an <img> there and gracefully fall back (blank/no icon) if it 404s —
// e.g. when running the standalone GitHub Pages copy with no device behind it.
function iconUrl(path) {
  if (!path) return null;
  const name = String(path).split(/[\\/]/).pop();
  return name ? `/icons/${encodeURIComponent(name)}` : null;
}

// Mirrors SceneGridCard.kt's parseHexColor: "#RRGGBB" is treated as opaque,
// "#AARRGGBB" carries its own alpha channel.
function parseHexColorCss(hex) {
  if (!hex) return null;
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(clean)) return null;
  if (clean.length === 6) return `#${clean}`;
  const a = parseInt(clean.slice(0, 2), 16) / 255;
  const r = parseInt(clean.slice(2, 4), 16);
  const g = parseInt(clean.slice(4, 6), 16);
  const b = parseInt(clean.slice(6, 8), 16);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// Mirrors SceneGridCard.kt's luminance() + textColor threshold (0.75).
function textColorForBg(cssColor) {
  const m = cssColor.match(/rgba?\(([^)]+)\)/);
  let r, g, b;
  if (m) {
    [r, g, b] = m[1].split(',').map(s => parseFloat(s));
  } else {
    const clean = cssColor.replace('#', '');
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return luminance > 0.75 ? '#141414' : '#F0F2F6';
}

// Icon not found (wrong filename, or previewing outside the remote's own
// server where /icons/ isn't served) — fall back to the same blank-spacer
// look the real app uses when BitmapFactory.decodeFile() returns null.
function onSceneIconError(img) {
  const spacer = document.createElement('div');
  spacer.className = 'st-icon-spacer';
  img.replaceWith(spacer);
}

function onButtonIconError(img) {
  const tile = img.closest('.preview-button-tile');
  img.remove();
  if (tile) tile.classList.replace('has-icon', 'no-icon');
}

// ---- Icon field: text input + live thumbnail + picker button --------------
// Every card option that takes an icon path (optIcon on name/entity cards and
// cover, giIcon on scene_grid/button_grid items) renders through this one
// helper, so the picker/thumbnail behaviour stays identical everywhere
// instead of hand-typing a path being the only option.

function iconFieldHtml(id) {
  return `
    <label>${I18N.t('web_card_icon_label')}</label>
    <div class="icon-field-row">
      <input type="text" id="${id}" placeholder="/sdcard/astrion/icons/xxx.png" oninput="updateIconThumb('${id}')">
      <img class="icon-field-thumb" id="${id}Thumb" alt="">
      <button type="button" class="secondary" onclick="openIconPicker('${id}')">${I18N.t('web_icon_choose')}</button>
    </div>
  `;
}

// Keeps the little thumbnail next to an icon field in sync with its current
// value — called on typing (oninput, see iconFieldHtml) and whenever a field
// is populated programmatically (editing an existing card/item). Same
// silent-fallback rule as everywhere else: no thumbnail if the path is empty,
// unresolvable, or this copy of the builder has no device behind /icons/.
function updateIconThumb(id) {
  const input = document.getElementById(id);
  const thumb = document.getElementById(id + 'Thumb');
  if (!input || !thumb) return;
  const url = iconUrl(input.value.trim());
  if (!url) {
    thumb.classList.remove('shown');
    return;
  }
  thumb.onerror = () => thumb.classList.remove('shown');
  thumb.src = url;
  thumb.classList.add('shown');
}

// Which icon field the picker modal is currently filling in — set by
// openIconPicker, read by selectIcon.
let iconPickerTarget = null;

// Opens the icon-picker modal for the given field id, listing every icon
// already uploaded to the device (GET /icons-list, see ConfigServer.kt) as
// clickable thumbnails. Only resolves anything when this copy of the builder
// is served by the device itself (http://<remote-ip>:8080/builder/) — the
// standalone GitHub Pages copy, or opening index.html straight from disk,
// has no device behind it to list icons from, so the grid explains that
// instead of silently doing nothing.
async function openIconPicker(targetId) {
  iconPickerTarget = targetId;
  const grid = document.getElementById('iconPickerGrid');
  grid.innerHTML = `<div class="icon-picker-empty">${I18N.t('media_loading')}</div>`;
  document.getElementById('iconPickerModal').classList.add('open');

  let names;
  try {
    const res = await fetch('/icons-list');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    names = await res.json();
  } catch (e) {
    grid.innerHTML = `
      <div class="icon-picker-error">
        ${I18N.t('web_icon_error')}
      </div>`;
    return;
  }

  if (!names.length) {
    grid.innerHTML = `<div class="icon-picker-empty">${I18N.t('web_icon_empty_hint')}</div>`;
    return;
  }

  grid.innerHTML = names.map(name => `
    <div class="icon-picker-item" onclick="selectIcon('${name.replace(/'/g, "\\'")}')">
      <img src="${iconUrl(name)}" alt="" loading="lazy">
      <span>${name}</span>
    </div>
  `).join('');
}

function selectIcon(name) {
  if (!iconPickerTarget) return;
  document.getElementById(iconPickerTarget).value = `/sdcard/astrion/icons/${name}`;
  updateIconThumb(iconPickerTarget);
  closeIconPicker();
}

function closeIconPicker() {
  document.getElementById('iconPickerModal').classList.remove('open');
  iconPickerTarget = null;
}
