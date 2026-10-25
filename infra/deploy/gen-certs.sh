#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Generate (or refresh) self-signed TLS certs for the ApartmentOS host.
# Invoked by start.sh before `docker compose up`.
#
# Self-healing: an existing cert is kept only if it is still valid, still
# has the current public IP as a SAN, and is not close to expiry.
# Otherwise it is regenerated. This is what makes the deploy survive an
# EC2 stop/start (which changes the public IP) — the old cert would no
# longer match the address the browser is using.
#
# Runs under Git-Bash on Windows as well as bash on Linux, so it avoids
# constructs whose exit status is platform-dependent (a bare [[ ]] test
# as the last command of an if-body, etc.).
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

CERT_DIR="${1:-/opt/apartmentos/certs}"
DAYS="${CERT_DAYS:-825}"
RENEW_BEFORE_DAYS="${CERT_RENEW_BEFORE_DAYS:-30}"

mkdir -p "$CERT_DIR"

# ── Discover the public IP (IMDSv2, then fallback) ───────────────────
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: ${TOKEN}" \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
if [ -z "${PUBLIC_IP}" ]; then
  PUBLIC_IP=$(curl -s -m 3 https://checkip.amazonaws.com 2>/dev/null | tr -d '\r\n' || true)
fi
if [ -z "${PUBLIC_IP}" ]; then
  PUBLIC_IP="127.0.0.1"
  echo "[certs] WARNING: could not detect public IP; using 127.0.0.1" >&2
fi
echo "[certs] public IP for SAN: ${PUBLIC_IP}"

# ── Decide whether the existing cert can be reused ───────────────────
NEED_GEN=1
if [ -s "$CERT_DIR/server.crt" ] && [ -s "$CERT_DIR/server.key" ]; then
  REUSE=0
  if openssl x509 -in "$CERT_DIR/server.crt" -noout \
       -checkend $((RENEW_BEFORE_DAYS * 86400)) >/dev/null 2>&1; then
    if openssl x509 -in "$CERT_DIR/server.crt" -noout -text 2>/dev/null \
         | grep -q "IP Address:${PUBLIC_IP}"; then
      REUSE=1
    else
      echo "[certs] existing certificate does not cover ${PUBLIC_IP} - regenerating"
    fi
  else
    echo "[certs] existing certificate expires within ${RENEW_BEFORE_DAYS}d - regenerating"
  fi
  if [ "$REUSE" = "1" ]; then
    echo "[certs] existing certificate is valid, matches ${PUBLIC_IP}, and is not near expiry - keeping it"
    NEED_GEN=0
  fi
fi

if [ "$NEED_GEN" = "0" ]; then
  ls -l "$CERT_DIR"
  exit 0
fi

echo "[certs] generating self-signed CA + server certificate in $CERT_DIR"

# 1) Local CA (long-lived). -addext keeps it a real CA for trust-store import.
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Prod/CN=ApartmentOS-Host-CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1

# 2) Server key + CSR
openssl req -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=ApartmentOS/OU=Prod/CN=${PUBLIC_IP}" \
  >/dev/null 2>&1

# 3) SAN extension
{
  echo "basicConstraints=CA:FALSE"
  echo "keyUsage=critical,digitalSignature,keyEncipherment"
  echo "extendedKeyUsage=serverAuth"
  echo "subjectAltName=@alt_names"
  echo "[alt_names]"
  echo "DNS.1=localhost"
  echo "DNS.2=apartmentos"
  echo "DNS.3=nginx"
  echo "IP.1=${PUBLIC_IP}"
  echo "IP.2=127.0.0.1"
  if [ -n "${APARTMENTOS_HOSTNAME:-}" ]; then
    echo "DNS.4=${APARTMENTOS_HOSTNAME}"
  fi
} > "$CERT_DIR/server.ext"

# 4) Sign with our CA
openssl x509 -req -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
  -out "$CERT_DIR/server.crt" -days "$DAYS" -sha256 \
  -extfile "$CERT_DIR/server.ext" >/dev/null 2>&1

# 5) Tidy up (best-effort: chmod is a no-op on some Windows filesystems)
rm -f "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"
chmod 600 "$CERT_DIR/server.key" "$CERT_DIR/ca.key" 2>/dev/null || true
chmod 644 "$CERT_DIR/server.crt" "$CERT_DIR/ca.crt" 2>/dev/null || true

echo "[certs] done:"
ls -l "$CERT_DIR"
