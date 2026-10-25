FROM nginx:1.27-alpine

# tzdata = India timezone; openssl = self-signed cert generation
RUN apk add --no-cache tzdata openssl && \
    cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# ═══════════════════════════════════════════════════════════════════
# Self-signed TLS certificate (built into the image)
#
# A bind-mount at /etc/nginx/certs would hide anything baked into the
# image, so we also expose the generator and run it from the entrypoint
# at runtime. This guarantees certs exist whether or not the host dir
# already contains them.
# ═══════════════════════════════════════════════════════════════════
COPY generate-certs.sh /usr/local/bin/generate-certs.sh
RUN chmod +x /usr/local/bin/generate-certs.sh && \
    /usr/local/bin/generate-certs.sh /etc/nginx/certs

# Entrypoint: ensure certs exist, then hand off to the stock nginx entrypoint.
COPY docker-entrypoint.d/40-generate-certs.sh /docker-entrypoint.d/40-generate-certs.sh
RUN chmod +x /docker-entrypoint.d/40-generate-certs.sh

EXPOSE 80 443
