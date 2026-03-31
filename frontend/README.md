# SketchRoom Frontend

## Why Mic/Screen Share Fails On LAN HTTP

Browser media APIs (`getUserMedia`, `getDisplayMedia`) require a secure context.
`http://localhost` is allowed, but `http://192.168.x.x` is not.

To use mic/screen-share from other devices on the same network, run the frontend over HTTPS.

## Environment Variables

Use `frontend/.env` (copy from `.env.example`):

- `VITE_BACKEND_TARGET`: backend target for Vite proxy (default `http://localhost:5000`)
- `VITE_DEV_HTTPS`: set to `true` to enable HTTPS mode
- `VITE_HTTPS_CERT_PATH` / `VITE_HTTPS_KEY_PATH`: optional trusted cert files
- `VITE_SHARE_BASE_URL`: share-link base URL

## Quick Start (Localhost)

1. Run backend on port `5000`.
2. In `frontend/.env`, set `VITE_DEV_HTTPS=true`.
3. Run `npm run dev` and open `https://localhost:5173`.

This is enough for mic/screen-share on the same machine.

## Intranet HTTPS (Same Network Devices)

For phones/laptops on the same Wi-Fi, mkcert is the recommended setup.

1. Install mkcert on host machine.
2. Initialize local CA trust on host:

```powershell
mkcert -install
```

3. Generate certs including localhost and current LAN IP:

```powershell
mkcert -cert-file ./certs/sketchroom-lan.pem -key-file ./certs/sketchroom-lan-key.pem localhost 127.0.0.1 ::1 <HOST_LAN_IP>
```

4. Configure `frontend/.env`:

```env
VITE_DEV_HTTPS=true
VITE_HTTPS_CERT_PATH=./certs/sketchroom-lan.pem
VITE_HTTPS_KEY_PATH=./certs/sketchroom-lan-key.pem
VITE_SHARE_BASE_URL=https://<HOST_LAN_IP>:5173
```

5. Run `npm run dev` and open `https://<HOST_LAN_IP>:5173`.

6. Export CA for other devices:

```powershell
mkcert -CAROOT
```

Use the returned folder's `rootCA.pem` on each client device.

7. Trust `rootCA.pem` on all client devices:

- Windows/macOS laptops: import into trusted root certificates.
- Android: install CA certificate in security settings (works for browsers).
- iOS: install profile and enable full trust for the certificate.

## Notes

- HTTP intranet origins cannot be forced to allow mic/screen-share by app code.
- If cert files are not provided, HTTPS may still run in fallback mode, but cross-device trust can fail.
- If LAN IP changes, regenerate mkcert cert with the new IP in SAN list.
