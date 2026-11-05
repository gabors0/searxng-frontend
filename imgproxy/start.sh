#!/bin/sh
# Runs the image proxy next to Caddy. Caddy stays PID 1, so it gets the container's stop signal.
imgproxy &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
