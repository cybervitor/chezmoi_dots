#!/bin/bash

# Cava Terminal Opener für Waybar mit Tiling
# Nutzung: ./cava-opener.sh [top|bottom]

POSITION="$1"

if [ "$POSITION" = "top" ]; then
    REVERSE_POSITION="bottom"
    WINDOW_NAME="cava_top"
    CAVA_CONFIG="$HOME/.config/cava/config_top"
    STATUS_FILE="/tmp/cava_top_was_open"
else
    REVERSE_POSITION="top"
    WINDOW_NAME="cava_bottom"
    CAVA_CONFIG="$HOME/.config/cava/config_bottom"
    STATUS_FILE="/tmp/cava_was_open"
fi

# Prüfen ob Fenster bereits existiert
if hyprctl clients -j | jq -e ".[] | select(.class == \"$WINDOW_NAME\")" > /dev/null; then
    # Fenster existiert, schließen
    kill $(pgrep -f "kitty.*kitten panel.*$WINDOW_NAME")
    # Markiere dass Cava geschlossen ist
    rm -f "$STATUS_FILE"
else
    # Markiere dass Cava offen ist
    touch "$STATUS_FILE"
    
    # Neues Fenster öffnen mit spezifischer Config und Transparenz
    
    kitty +kitten panel --edge=none \
        --layer=background \
        --class "$WINDOW_NAME" \
        --output-name "$WINDOW_NAME" \
        --margin-$REVERSE_POSITION=1000px \
        -o background_opacity=0.0 \
        bash -c "cava -p \"$CAVA_CONFIG\"; exec bash" &
fi
