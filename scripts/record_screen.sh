#!/bin/bash
# record_screen_all.sh

OUTPUT_DIR="recordings"
mkdir -p "$OUTPUT_DIR"

# 1. Maintain safety: ensure recordings are ignored by git
if ! grep -q "$OUTPUT_DIR/" .gitignore; then
    echo "$OUTPUT_DIR/" >> .gitignore
fi

# 2. Get list of connected devices
DEVICES=$(adb devices | grep -w "device" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ No devices found. Check your ADB connection."
    exit 1
fi

echo "🎥 Starting recording on all detected devices..."

# 3. Record all devices simultaneously in the background
for dev in $DEVICES; do
    SAFE_ID=$(echo $dev | sed 's/[:.]/_/g')
    echo "-> Recording device: $dev"
    adb -s "$dev" shell screenrecord --time-limit 15 "/sdcard/rec_$SAFE_ID.mp4" &
done

wait
echo "✅ Recordings finished. Pulling files..."

# 4. Pull files and clean up devices
for dev in $DEVICES; do
    SAFE_ID=$(echo $dev | sed 's/[:.]/_/g')
    adb -s "$dev" pull "/sdcard/rec_$SAFE_ID.mp4" "$OUTPUT_DIR/"
    adb -s "$dev" shell rm "/sdcard/rec_$SAFE_ID.mp4"
done

# 5. Convert to GIF (only if ffmpeg is installed)
if command -v ffmpeg &> /dev/null; then
    echo "🎨 Converting to GIFs..."
    for dev in $DEVICES; do
        SAFE_ID=$(echo $dev | sed 's/[:.]/_/g')
        ffmpeg -y -i "$OUTPUT_DIR/rec_$SAFE_ID.mp4" -vf "fps=10,scale=320:-1:flags=lanczos" "$OUTPUT_DIR/rec_$SAFE_ID.gif" > /dev/null 2>&1
    done
    echo "✅ GIFs created."
else
    echo "⚠️ ffmpeg not found, skipping GIF conversion. Install it via 'sudo apt install ffmpeg' to enable this feature."
fi

echo "🎉 All files saved to /$OUTPUT_DIR"
