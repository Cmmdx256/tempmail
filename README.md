# Temp-Mail

**Pure GitHub Pages Architecture** - Complete disposable email service running entirely on GitHub's free infrastructure.

## Description

A revolutionary temporary email service that leverages GitHub Pages, GitHub Actions, and repository storage to provide a fully functional disposable email system without any external hosting costs.

## ✨ Features

### **🚀 Domain-Free Operation (Primary)**
- ✅ **Zero Cost**: Entirely free - no domain, no hosting, no external services
- ✅ **Real Email Addresses**: Working addresses from 1secmail.com and Mail.tm
- ✅ **One-click deployment**: GitHub Pages + Actions
- ✅ **Near real-time polling**: 15-second email updates
- ✅ **Multiple providers**: Automatic fallback between services
- ✅ **Modern UI**: React + Tailwind CSS interface
- ✅ **Mobile responsive**: Works on all devices

### **🔧 Advanced Features (Optional)**
- ✅ **Custom domain support**: Use your own domain with Mailgun
- ✅ **Webhook processing**: GitHub Actions email processing
- ✅ **JSON-based storage**: GitHub repository as database
- ✅ **Automatic cleanup**: TTL-based expiration
- ✅ **Admin dashboard**: System statistics and monitoring
- ✅ **Attachment support**: File handling capabilities

## 🏗️ Architecture Overview

### **Option 1: Domain-Free (Recommended)**
```
User Interface (GitHub Pages)
        ↓ Direct API calls
1secmail API / Mail.tm API
        ↓ Real email addresses
External Temp-Mail Services
        ↓ Email delivery
Real Emails to User Addresses
```

### **Option 2: Custom Domain + GitHub Processing**
```
User Interface (GitHub Pages)
        ↓ fetch() API calls
GitHub Raw Content URLs
        ↓ JSON files
GitHub Repository (/api/messages/)
        ↓ GitHub Actions
Mailgun Webhooks → Repository Dispatch
        ↓ Email Processing
Incoming Emails
```

## 🚀 Quickstart (5 Minutes Setup - NO DOMAIN REQUIRED!)

### 🎯 **DOMAIN-FREE DEPLOYMENT (Recommended)**

**No domain registration, no external services needed! Your temp-mail service will work immediately with real emails!**

1. **Fork this repository** to your GitHub account
2. **Enable GitHub Pages**:
   - Go to repository **Settings → Pages**
   - Set **Source** to "GitHub Actions"
3. **Update homepage** in `packages/web/package.json`:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/temp-mail"
   ```
4. **Push to main branch** - GitHub Actions will deploy automatically
5. **Your temp-mail service is live!** 🎉

**That's it!** Your service will work with real emails from:
- **1secmail.com** domains (@1secmail.com, @1secmail.org, @esiix.com)
- **Mail.tm** domains (@mail.tm, @firemail.cc, @chickenkiller.com)

### 📧 How It Works (No Setup Required)

1. **User clicks "Generate Random Email"**
2. **Frontend fetches from 1secmail/Mail.tm APIs**
3. **Gets real email address** (e.g., `abc123@1secmail.com`)
4. **User can send emails to this address**
5. **Emails appear in inbox** via direct API polling
6. **Near real-time updates** (15-second polling)

### 🔧 Advanced Setup (Custom Domain)

If you want to use your own domain and email service:

#### 1. Fork & Setup Repository
1. Fork this repository to your GitHub account
2. Go to **Settings → Pages**
3. Set **Source** to "GitHub Actions"

#### 2. Configure Environment
Update `packages/web/.env`:
```bash
REACT_APP_GITHUB_USERNAME=your-username
REACT_APP_GITHUB_REPO=temp-mail
REACT_APP_DOMAIN=yourdomain.com
REACT_APP_ADMIN_KEY=your-admin-password
```

#### 3. Set up Email Processing
1. Sign up for [Mailgun](https://mailgun.com)
2. Add your domain to Mailgun
3. Configure DNS records (MX, SPF, DKIM)
4. Set webhook URL: `https://api.github.com/repos/YOUR_USERNAME/temp-mail/dispatches`

#### 4. Deploy
Push changes to main branch - GitHub Actions will handle everything automatically!

## How It Works

### Email Flow
1. **User creates address**: `abc123@yourdomain.com`
2. **DNS routing**: MX records point to Mailgun
3. **Email reception**: Mailgun receives email
4. **Webhook trigger**: Calls GitHub repository dispatch
5. **GitHub Actions**: Processes email and stores as JSON
6. **Frontend fetch**: User sees email in real-time

### Data Storage
```
data/
├── messages/
│   ├── abc123.json
│   └── xyz789.json
├── attachments/
│   └── (base64 encoded files)
└── stats.json
```

### JSON Structure
```json
{
  "address": "abc123@yourdomain.com",
  "created_at": "2025-09-17T15:30:00Z",
  "expires_at": "2025-09-17T16:30:00Z",
  "messages": [
    {
      "id": "msg_001",
      "from": "sender@example.com",
      "subject": "Hello!",
      "body_text": "Message content...",
      "body_html": "<p>Message content...</p>",
      "attachments": [],
      "received_at": "2025-09-17T15:35:00Z"
    }
  ]
}
```

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start frontend development
cd packages/web
npm start
```

### Testing Email Processing
```bash
# Test GitHub Actions workflow locally
npm run test:actions
```

## Configuration

### Environment Variables

**Frontend (.env)**
```bash
REACT_APP_GITHUB_USERNAME=your-username
REACT_APP_GITHUB_REPO=temp-mail
REACT_APP_GITHUB_BRANCH=main
REACT_APP_DOMAIN=yourdomain.com
REACT_APP_ADMIN_KEY=admin123
```

**GitHub Secrets (Repository Settings)**
```
MAILGUN_WEBHOOK_SIGNING_KEY=your-mailgun-signing-key
GITHUB_TOKEN=github_pat_...
```

### Mailgun Setup

1. **Domain Configuration**:
   ```
   MX: mail.yourdomain.com → mxa.mailgun.org, mxb.mailgun.org
   TXT: v=spf1 include:mailgun.org ~all
   TXT: mailgun._domainkey.yourdomain.com → k=rsa; p=...
   ```

2. **Webhook Configuration**:
   - URL: `https://api.github.com/repos/YOUR_USERNAME/temp-mail/dispatches`
   - Events: `delivered`, `failed`, `unsubscribed`
   - Headers: Include Mailgun signature for verification

## GitHub Actions Workflows

### 1. Email Processing (`handle-mail.yml`)
- Triggered by repository dispatch
- Parses incoming email data
- Stores as JSON in repository
- Commits and pushes changes

### 2. Cleanup (`cleanup-expired.yml`)
- Runs hourly via cron schedule
- Removes expired address files
- Updates system statistics
- Commits cleanup changes

### 3. Deployment (`deploy.yml`)
- Builds React frontend
- Deploys to GitHub Pages
- Automatic on main branch push

## Admin Features

Access admin panel by clicking "Show Admin Panel" and entering the admin key.

**Features**:
- Total addresses count
- Total messages count
- System health status
- Real-time statistics

## Security & Privacy

- **No external dependencies**: Everything runs on GitHub
- **Automatic cleanup**: Expired data removed hourly
- **Rate limiting**: Frontend-based address creation limits
- **Admin authentication**: Protected admin panel
- **Data isolation**: Each address in separate JSON file

## Limitations

- **Processing delay**: 1-2 minutes for emails to appear (GitHub Actions)
- **Storage limits**: GitHub repository size limits
- **No WebSockets**: Uses polling instead of real-time connections
- **GitHub rate limits**: API call limitations

## 💰 Cost Comparison

| Service | Monthly Cost | Features |
|---------|-------------|----------|
| **🎉 Temp-Mail (Domain-Free)** | **$0** ⭐ | Real emails, no setup, instant deployment |
| **Temp-Mail (GitHub + Mailgun)** | **$15** | Custom domain, full control, webhooks |
| Mailgun Basic | $15 | Email sending/receiving |
| Vercel + DB | $25+ | Hosting + database |
| VPS (Hetzner) | $5+ | Full control |

## 🎯 **Recommended Approach**

### **For Most Users: Domain-Free (⭐ Recommended)**
- ✅ **Zero cost, zero setup**
- ✅ **Real working email addresses**
- ✅ **Instant deployment**
- ✅ **No domain registration needed**
- ✅ **Multiple provider fallback**

### **For Advanced Users: Custom Domain**
- ✅ **Your own domain name**
- ✅ **Full control over email processing**
- ✅ **Professional appearance**
- ✅ **Custom branding**
- ✅ **Advanced webhook processing**

## Troubleshooting

### Common Issues

1. **Emails not appearing**:
   - Check Mailgun webhook configuration
   - Verify GitHub Actions workflow runs
   - Check repository dispatch events

2. **GitHub Pages not updating**:
   - Ensure workflow has proper permissions
   - Check build logs for errors

3. **Admin panel not working**:
   - Verify `REACT_APP_ADMIN_KEY` environment variable

### Debug Commands

```bash
# Check GitHub Actions logs
# Go to repository → Actions tab

# Test webhook manually
curl -X POST https://api.github.com/repos/YOUR_USERNAME/temp-mail/dispatches \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.com" \
  -d '{"event_type":"inbound_mail","client_payload":{"address":"test","mail_data":{}}}'
```

## Contributing

See CONTRIBUTING.md for development guidelines.

## License

MIT - Free for personal and commercial use.

---

**🎉 This is a complete, production-ready temp-mail service running entirely on GitHub's free infrastructure!**