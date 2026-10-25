#!/usr/bin/env bash
# Generate the self-signed TLS certificates on the HOST (alternative to the
# build-time generation inside the nginx image). Run this once before
# `up.sh prod` if you want to import ca.crt into your browser/OS trust store.
set -euo pipefail
cd "$(dirname "$0")/.."

CERT_DIR="nginx/certs"
mkdir -p "$CERT_DIR"

if [[ -s "$CERT_DIR/server.crt" && -s "$CERT_DIR/server.key" ]]; then
  echo "✔ Certificates already exist in $CERT_DIR (delete them to regenerate)"
  exit 0
fi

echo "Generating certificates with host openssl..."
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Dev/CN=ApartmentOS-Dev-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

openssl req -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Dev/CN=localhost"

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

openssl x509 -req -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
  -out "$CERT_DIR/server.crt" -days 825 -sha256 -extfile "$CERT_DIR/server.ext"

rm -f "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"
echo "✔ Generated:"
ls -l "$CERT_DIR"
echo ""
echo "Import $CERT_DIR/ca.crt into your browser/OS trust store to silence warnings."
