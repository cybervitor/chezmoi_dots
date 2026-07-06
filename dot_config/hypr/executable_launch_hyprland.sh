#!/bin/bash

# Count the exact number of connected external monitors
CONNECTED_MONITORS=$(grep "^connected" /sys/class/drm/card*-*/status | grep -v -i "edp" | wc -l)

if [ "$CONNECTED_MONITORS" -eq 3 ]; then 				# Check if exactly 3 external monitors connected
    echo "return false" > ~/.config/hypr/edp_state.lua 	# Hard disable the laptop screen
else 													# in case of 0(Undocked)/1/2 monitors connected
    echo "return true" > ~/.config/hypr/edp_state.lua 	# Enable the laptop screen
fi

exec start-hyprland										# Execute Hyprland replacing the current bash process
