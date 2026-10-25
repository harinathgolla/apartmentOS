# Nginx + self-signed TLS

Google OAuth refuses non-HTTPS redirect URIs, so the local stack terminates TLS at nginx.

## How certificates are produced

`generate-certs.sh` creates a local CA plus a server certificate whose SAN covers
`localhost`, `nginx`, `backend`, `frontend`, `apt-*`, `127.0.0.1`, `::1`.

It runs in **two** places so a cert always exists:

1. **At image build** — `Dockerfile` runs it into `/etc/nginx/certs`.
2. **At container start** — `/docker-entrypoint.d/40-generate-certs.sh` re-runs it,
   because `docker-compose.yml` bind-mounts `./nginx/certs` over that path (which would
   hide the baked-in files). If real certs are present in the mount the script exits
   without overwriting them.

Files in `nginx/certs/`:

| File | Purpose |
|------|---------|
| `server.crt` / `server.key` | cert/key nginx serves |
| `ca.crt` | local CA — import into browser/OS to silence the warning |

## Ports / behaviour

- `:80` — everything 301-redirects to `https://<host>…` (`/healthz` returns 200).
- `:443` — TLS termination; proxies `/api/`, `/oauth2/`, `/login/oauth2/` to
  `backend:8080` and `/` to `frontend:3000`, always sending `X-Forwarded-Proto: https`.

The backend sets `SERVER_FORWARD_HEADERS_STRATEGY=framework` so Spring builds
`https://localhost/...` OAuth redirect URIs from those headers.

## Usage

```bash
cd containers
./scripts/up.sh prod          # builds nginx (generates certs) + full stack
# open https://localhost  (accept the self-signed warning, or import ca.crt)

# optional: pre-generate certs on the host to import ca.crt first
./scripts/gen-certs.sh
```

## Google Cloud Console

Register these **Authorized redirect URIs** for your OAuth client:

- `https://localhost/login/oauth2/code/google`
- `https://localhost/oauth2/authorization/google` (not strictly required, but handy)

For the remote host use `https://<ec2-ip-or-domain>/login/oauth2/code/google`.

## Production note

Self-signed certs are for local/dev only. On AWS put the real certificate on the
ALB / CloudFront / a Let's Encrypt cert on the instance, and drop this generator.
