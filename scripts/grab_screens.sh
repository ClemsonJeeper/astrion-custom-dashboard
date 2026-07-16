#!/bin/bash

# 1. Get list of active ADB devices
devices=$(adb devices | grep -v "List" | grep "device" | awk '{print $1}')

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
    # Replace dots and colons in IP addresses (for wireless ADB) to make safe filenames
    local clean_id=$(echo "$device_id" | sed 's/[:.]/_/g')

    for i in {1..5}; do
        local timestamp=$(date +"%H%M%S")
        local remote_file="/sdcard/temp_screen_${clean_id}.png"
        local local_file="./screenshot_${clean_id}_shot${i}_${timestamp}.png"

        # Capture on device
        adb -s "$device_id" shell screencap -p "$remote_file"

        # Pull to computer
        adb -s "$device_id" pull "$remote_file" "$local_file" > /dev/null 2>&1

        # Delete temp file from device
        adb -s "$device_id" shell rm "$remote_file"

        echo "📸 [Device: $device_id] Saved shot $i/5 as: $local_file"

        # Wait 5 seconds before the next shot (except after the final shot)
        if [ $i -lt 5 ]; then
            sleep 5
        fi
    done
    echo "🎉 [Device: $device_id] Done!"
}

# Run the capture function in parallel (background) for each device
for dev in $devices; do
    capture_device "$dev" &
done

# Wait for all background tasks to finish before exiting the script
wait

echo "------------------------------------------------"
echo "All screenshots successfully pulled to your computer!"
