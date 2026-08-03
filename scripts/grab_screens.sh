#!/bin/bash

# Exit on error in subshells, treat unset variables as error
set -euo pipefail

# 1. Get list of active ADB devices
devices=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}')

if [ -z "$devices" ]; then
    echo "❌ No devices found! Make sure they are connected and authorized."
    exit 1
fi

echo "✅ Found connected devices:"
echo "$devices"
echo "------------------------------------------------"
echo "Starting capture sequence: 5 shots, 5 seconds apart."
echo "Capturing all devices simultaneously..."
echo "------------------------------------------------"

# Function to capture screenshots for a single device in the background
capture_device() {
    local device_id=$1
    # Replace dots and colons in IP/MAC addresses to make safe file names
    local clean_id=$(echo "$device_id" | sed 's/[:.]/_/g')

    # Create screenshots output directory if it doesn't exist
    local output_dir="./screenshots"
    mkdir -p "$output_dir"

    for i in {1..5}; do
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local remote_file="/sdcard/temp_screen_${clean_id}.png"
        local local_file="${output_dir}/screenshot_${clean_id}_shot${i}_${timestamp}.png"

        # Direct pipeline without writing temporary files to device storage
        # (Much faster and avoids wear on target storage / leaving temporary files behind)
        if adb -s "$device_id" exec-out screencap -p > "$local_file" 2>/dev/null; then
            echo "📸 [Device: $device_id] Saved shot $i/5 as: $local_file"
        else
            # Fallback to remote save & pull if exec-out is unsupported on older Android versions
            adb -s "$device_id" shell screencap -p "$remote_file"
            adb -s "$device_id" pull "$remote_file" "$local_file" > /dev/null 2>&1
            adb -s "$device_id" shell rm -f "$remote_file"
            echo "📸 [Device: $device_id] Saved shot $i/5 (fallback) as: $local_file"
        fi

        # Wait 5 seconds before the next shot (except after the final shot)
        if [ "$i" -lt 5 ]; then
            sleep 5
        fi
    done
    echo "🎉 [Device: $device_id] Completed 5/5 captures!"
}

# Run the capture function in parallel (background) for each device
for dev in $devices; do
    capture_device "$dev" &
done

# Wait for all background tasks to finish before exiting
wait

echo "------------------------------------------------"
echo "✨ All screenshots successfully saved!"