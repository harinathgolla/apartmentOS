#!/bin/sh
# Runs on every container start (the nginx image auto-executes /docker-entrypoint.d/*.sh).
# Ensures a certificate exists in /etc/nginx/certs even when that path is a bind
# mount from the host (which would otherwise hide the certs baked into the image).
set -eu
/usr/local/bin/generate-certs.sh /etc/nginx/certs
