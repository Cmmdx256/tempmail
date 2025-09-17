# Temp-Mail Deployment Guide

This guide covers different deployment options for the temp-mail service.

## Table of Contents

1. [GitHub Pages + Vercel Backend](#github-pages--vercel-backend)
2. [GitHub Pages + VPS Backend](#github-pages--vps-backend)
3. [Full VPS Deployment](#full-vps-deployment)
4. [Mailgun Integration](#mailgun-integration)

## GitHub Pages + Vercel Backend

### Step 1: Frontend Deployment

1. Fork this repository to your GitHub account
2. Go to repository Settings → Pages
3. Set source to "GitHub Actions"
4. Update `packages/web/package.json`:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/temp-mail"
   ```
5. Update `packages/web/.env`:
   ```
   REACT_APP_API_BASE_URL=https://your-vercel-app.vercel.app/api
   REACT_APP_WS_URL=wss://your-vercel-app.vercel.app
   ```
6. Push changes to main branch - GitHub Actions will deploy automatically

### Step 2: Backend Deployment (Vercel)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy the API:
   ```bash
   cd packages/api
   vercel
   ```

3. Follow the prompts to create a new project
4. Add environment variables in Vercel dashboard:
   - `DOMAIN_LIST`: yourdomain.com
   - `JWT_SECRET`: your-secret-key

5. Update frontend `.env` with the Vercel deployment URL

## GitHub Pages + VPS Backend

### Step 1: VPS Setup

1. Get a VPS (recommended: Hetzner, OVH, or Contabo)
2. Update system packages:
   ```bash
   sudo apt update && sudo apt upgrade
   ```

3. Install Docker and Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### Step 2: Deploy Backend

1. Clone repository on VPS:
   ```bash
   git clone https://github.com/YOUR_USERNAME/temp-mail.git
   cd temp-mail
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your settings
   ```

3. Start services:
   ```bash
   docker-compose -f infra/docker-compose.yml up -d
   ```

### Step 3: DNS Configuration

1. Point your domain's A record to VPS IP
2. Add MX record: `mail.yourdomain.com` → VPS IP
3. Configure reverse DNS if possible

## Full VPS Deployment

### Step 1: Domain and DNS

1. Register a domain (e.g., temp-mail-demo.com)
2. Set DNS records:
   ```
   A     mail.temp-mail-demo.com    VPS_IP
   MX    temp-mail-demo.com         mail.temp-mail-demo.com
   CNAME www.temp-mail-demo.com     temp-mail-demo.com
   ```

### Step 2: SSL Certificates

1. Install Certbot:
   ```bash
   sudo apt install certbot
   ```

2. Get SSL certificate:
   ```bash
   sudo certbot certonly --standalone -d temp-mail-demo.com -d mail.temp-mail-demo.com
   ```

### Step 3: Nginx Configuration

1. Install Nginx:
   ```bash
   sudo apt install nginx
   ```

2. Configure Nginx (see infra/nginx.conf)

### Step 4: Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 25/tcp  # SMTP
sudo ufw allow 587/tcp # SMTP submission
sudo ufw --force enable
```

## Mailgun Integration

### Step 1: Mailgun Setup

1. Sign up for Mailgun account
2. Add your domain to Mailgun
3. Verify domain ownership
4. Set DNS records as instructed by Mailgun

### Step 2: Webhook Configuration

1. In Mailgun dashboard, go to "Webhooks"
2. Add webhook for "Permanent Failure" and "Temporary Failure"
3. Set webhook URL to your backend endpoint:
   ```
   https://your-backend.com/api/webhooks/mailgun
   ```

### Step 3: Backend Webhook Handler

Add to `packages/api/index.js`:

```javascript
// Mailgun webhook endpoint
fastify.post('/webhooks/mailgun', async (request, reply) => {
  const { event, recipient, sender, subject, body } = request.body;

  // Process incoming email
  // Save to database, etc.

  return { status: 'ok' };
});
```

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_BASE_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
```

### Backend (.env)
```
DB_URL=postgresql://user:pass@localhost:5432/temp_mail
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
SMTP_BIND_PORT=25
API_PORT=3000
DOMAIN_LIST=yourdomain.com
JWT_SECRET=your-secret-key
```

## Monitoring and Maintenance

### Logs
```bash
# View container logs
docker-compose -f infra/docker-compose.yml logs -f

# View specific service logs
docker-compose -f infra/docker-compose.yml logs -f api
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f infra/docker-compose.yml up --build -d
```

### Backup
```bash
# Database backup
docker exec temp-mail_postgres_1 pg_dump -U user temp_mail > backup.sql

# MinIO data backup
docker cp temp-mail_minio_1:/data ./minio_backup
```

## Troubleshooting

### Common Issues

1. **Port 25 blocked**: Some VPS providers block port 25. Use port 587 or contact support.

2. **CORS errors**: Ensure CORS is properly configured in your backend.

3. **GitHub Pages routing**: For client-side routing, add a `404.html` file.

4. **Mailgun webhooks**: Ensure webhook endpoint returns 200 status quickly.

### Performance Optimization

1. Enable gzip compression in Nginx
2. Set up Redis caching
3. Configure database indexes
4. Use CDN for static assets

## Cost Estimation

### Free Tier
- GitHub Pages: Free
- Vercel: Free (100GB bandwidth/month)
- Mailgun: Free (5,000 emails/month)

### Paid Options
- VPS: $5-20/month
- Domain: $10-20/year
- Mailgun: $20-100/month (depending on volume)