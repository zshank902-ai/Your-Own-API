## Your Own API Nginx SSL Certificates

Place your SSL certificates here:

| Filename   | Description                           |
|------------|---------------------------------------|
| `cert.pem` | SSL Certificate (from Let's Encrypt)  |
| `key.pem`  | SSL Private Key                       |

### For Local Development (Self-Signed Certificate)

Run this from the project root to generate a self-signed certificate valid for 365 days:

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=Dev/L=Dev/O=YourOwnAPIDev/CN=localhost"
```

### For Production (Let's Encrypt / Certbot)

On your server, run Certbot once the containers are running:

```bash
docker run --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot-webroot:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.yourdomain.com \
  --email your@email.com \
  --agree-tos --no-eff-email
```

Then update `nginx.conf` to point to the Certbot cert path.
