#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# Self-signed TLS certificate generator (run at image build time).
#
# Produces a single cert covering the hostnames the browser and the
# containers use, so one certificate works for:
#   - https://localhost        (browser → nginx)
#   - https://127.0.0.1        (browser → nginx)
#   - https://nginx            (in-network)
#   - https://backend          (in-network)
#   - https://frontend         (in-network)
#
# Outputs (into /etc/nginx/certs):
#   server.crt  – public certificate (PEM)
#   server.key  – private key (PEM)
#   ca.crt      – the CA that signed it (import this once into the
#                 browser / OS trust store to silence warnings)
# ═══════════════════════════════════════════════════════════════════
set -eu

CERT_DIR="${1:-/etc/nginx/certs}"
DAYS="${CERT_DAYS:-825}"
SUBJ="/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Dev/CN=localhost"

mkdir -p "$CERT_DIR"

# Skip if a real certificate was mounted in (so the image build does not
# clobber operator-supplied certs when /etc/nginx/certs is a bind mount).
if [ -s "$CERT_DIR/server.crt" ] && [ -s "$CERT_DIR/server.key" ]; then
  echo "[certs] existing certificate found in $CERT_DIR — leaving it untouched"
  exit 0
fi

echo "[certs] generating self-signed CA + server certificate in $CERT_DIR"

# 1) Root CA (long-lived) -------------------------------------------------
openssl req -x509 -nodes -newkey rsa:2048 \
  -days 3650 \
  -keyout "$CERT_DIR/ca.key" \
  -out "$CERT_DIR/ca.crt" \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Dev/CN=ApartmentOS-Dev-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  2>/dev/null

# 2) Server key + CSR -----------------------------------------------------
openssl req -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -subj "$SUBJ" \
  2>/dev/null

# 3) SAN extension file (hostnames + IPs) --------------------------------
cat > "$CERT_DIR/server.ext" <<'EOF'
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names
[alt_names]
DNS.1=localhost
DNS.2=nginx
DNS.3=backend
DNS.4=frontend
DNS.5=apt-nginx
DNS.6=apt-backend
DNS.7=apt-frontend
IP.1=127.0.0.1
IP.2=::1
EOF

# 4) Sign the CSR with our CA --------------------------------------------
openssl x509 -req \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days "$DAYS" \
  -sha256 \
  -extfile "$CERT_DIR/server.ext" \
  2>/dev/null

# 5) Tidy up intermediate artefacts, keep key + certs ---------------------
rm -f "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"
chmod 600 "$CERT_DIR/server.key" "$CERT_DIR/ca.key"
chmod 644 "$CERT_DIR/server.crt" "$CERT_DIR/ca.crt"

echo "[certs] done:"
ls -l "$CERT_DIR"
