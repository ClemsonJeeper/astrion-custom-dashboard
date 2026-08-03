#!/bin/bash

# Exit on error in subshells, treat unset variables as error
set -euo pipefail

OUTPUT_DIR="recordings"
mkdir -p "$OUTPUT_DIR"

# 1. Maintain safety: ensure recordings directory is ignored by git
if [ -f .gitignore ]; then
    if ! grep -q "^${OUTPUT_DIR}/" .gitignore; then
        echo -e "\n# Local recording files\n${OUTPUT_DIR}/" >> .gitignore
        echo "🔒 Added ${OUTPUT_DIR}/ to .gitignore"
    fi
fi

# 2. Get list of active connected devices (excluding "unauthorized" or "offline")
DEVICES=$(adb devices | grep -v "List" | grep -w "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No active devices found. Check your ADB connection."
    exit 1
fi

echo "🎥 Starting recording (15s limit) on all detected devices..."

# 3. Record all devices simultaneously in the background
for dev in $DEVICES; do
    SAFE_ID=$(echo "$dev" | sed 's/[:.]/_/g')
    echo "-> Recording device: $dev"
    # Run screenrecord in background
    adb -s "$dev" shell screenrecord --time-limit 15 "/sdcard/rec_${SAFE_ID}.mp4" &
done

# Wait for all background screenrecord processes to complete
wait
echo "✅ Recordings finished on all devices. Pulling files..."

# 4. Pull files and clean up temporary storage on devices
for dev in $DEVICES; do
    SAFE_ID=$(echo "$dev" | sed 's/[:.]/_/g')
    REMOTE_FILE="/sdcard/rec_${SAFE_ID}.mp4"
    LOCAL_FILE="${OUTPUT_DIR}/rec_${SAFE_ID}.mp4"

    echo "⬇️ Pulling recording from $dev..."
    if adb -s "$dev" pull "$REMOTE_FILE" "$LOCAL_FILE" > /dev/null 2>&1; then
        adb -s "$dev" shell rm -f "$REMOTE_FILE"
        echo "  ↳ Saved to: $LOCAL_FILE"
    else
        echo "⚠️ Failed to pull recording from $dev"
    fi
done

# 5. Convert MP4 to GIF (only if ffmpeg is available)
if command -v ffmpeg &> /dev/null; then
    echo "🎨 Converting MP4 recordings to optimized GIFs..."
    for dev in $DEVICES; do
        SAFE_ID=$(echo "$dev" | sed 's/[:.]/_/g')
        MP4_INPUT="${OUTPUT_DIR}/rec_${SAFE_ID}.mp4"
        GIF_OUTPUT="${OUTPUT_DIR}/rec_${SAFE_ID}.gif"

        if [ -f "$MP4_INPUT" ]; then
            # High-quality palette generation for crisp GIFs
            ffmpeg -y -i "$MP4_INPUT" \
                -vf "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
                "$GIF_OUTPUT" > /dev/null 2>&1
            echo "  ↳ Created GIF: $GIF_OUTPUT"
        fi
    done
    echo "✅ GIF conversion complete!"
else
    echo "⚠️ 'ffmpeg' not installed. Skipping GIF conversion."
    echo "   (Install via 'sudo apt install ffmpeg' or 'brew install ffmpeg')"
fi

echo "------------------------------------------------"
echo "🎉 Process complete! All files saved to ./${OUTPUT_DIR}/"