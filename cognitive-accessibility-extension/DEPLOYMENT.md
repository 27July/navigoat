# CogniClear - Deployment Guide

Complete guide to deploy the backend service to production.

---

## Option 1: Railway (Recommended - Easiest)

Railway provides free hosting with automatic deployments from GitHub.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify your email

### Step 2: Install Railway CLI (Optional)

```bash
npm install -g @railway/cli
```

### Step 3: Deploy from GitHub

1. Push your code to GitHub:
```bash
cd /path/to/cognitive-accessibility-extension
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/cogniclear-extension.git
git push -u origin main
```

2. Go to [railway.app/new](https://railway.app/new)

3. Click "Deploy from GitHub repo"

4. Select your repository

5. Railway will auto-detect Node.js

6. Click "Deploy Now"

### Step 4: Configure Environment Variables

1. In Railway dashboard, click your project

2. Go to "Variables" tab

3. Add:
   - `GEMINI_API_KEY` = your_gemini_api_key
   - `PORT` = (Railway sets this automatically)

4. Click "Deploy" to restart with new variables

### Step 5: Get Your Deployment URL

1. Go to "Settings" tab

2. Under "Domains", click "Generate Domain"

3. Copy the URL (e.g., `https://cogniclear-backend-production.up.railway.app`)

### Step 6: Update Extension

1. Open extension popup

2. Settings → API Endpoint

3. Enter: `https://your-railway-domain.up.railway.app/api/simplify`

4. Click "Save"

**Done!** Your backend is now live.

---

## Option 2: Vercel (Serverless)

Vercel offers serverless functions with automatic scaling.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Prepare for Vercel

Create `vercel.json` in the `backend/` directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### Step 3: Deploy

```bash
cd backend
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (select your account)
- Link to existing project? **N**
- Project name? **cogniclear-backend**
- Directory? **.**

### Step 4: Set Environment Variables

```bash
vercel env add GEMINI_API_KEY
```

Paste your API key when prompted.

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

Copy the production URL and update your extension settings.

---

## Option 3: Google Cloud Run (Professional)

For production-grade deployment with Google Cloud.

### Step 1: Install Google Cloud CLI

Download from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

### Step 2: Create Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### Step 3: Build and Deploy

```bash
cd backend

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud run deploy cogniclear-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_api_key
```

### Step 4: Get Service URL

```bash
gcloud run services describe cogniclear-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

Update your extension with this URL.

---

## Option 4: Heroku

### Step 1: Install Heroku CLI

Download from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Create Procfile

Create `backend/Procfile`:

```
web: node server.js
```

### Step 3: Deploy

```bash
cd backend

heroku login
heroku create cogniclear-backend

git init
git add .
git commit -m "Initial commit"

heroku git:remote -a cogniclear-backend
git push heroku main

heroku config:set GEMINI_API_KEY=your_api_key
```

### Step 4: Open App

```bash
heroku open
```

Copy the URL and update your extension.

---

## Testing Deployed Backend

### Test Health Endpoint

```bash
curl https://your-deployed-url.com/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "CogniClear Backend",
  "timestamp": "2026-02-05T21:00:00.000Z"
}
```

### Test Simplify Endpoint

```bash
curl -X POST https://your-deployed-url.com/api/simplify \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [
      {
        "id": "test-1",
        "text": "Submit",
        "ariaLabel": "",
        "parentText": "Contact Form",
        "type": "button"
      }
    ],
    "pageUrl": "https://example.com",
    "pageTitle": "Test Page"
  }'
```

---

## Updating Extension After Deployment

### Method 1: Via Popup

1. Click extension icon
2. Settings → API Endpoint
3. Enter: `https://your-deployed-url.com/api/simplify`
4. Click "Save"

### Method 2: Update Default in Code

Edit `extension/src/background/background.js`:

```javascript
const CONFIG = {
  API_ENDPOINT: 'https://your-deployed-url.com/api/simplify',
  // ...
};
```

Then rebuild:

```bash
cd extension
pnpm build
```

Reload extension in Chrome.

---

## Monitoring & Maintenance

### Railway

- Dashboard shows logs, metrics, and deployments
- Automatic deployments on git push
- Free tier: 500 hours/month

### Vercel

- Dashboard at vercel.com
- View logs and analytics
- Free tier: 100GB bandwidth/month

### Google Cloud Run

- Console at console.cloud.google.com
- View logs in Cloud Logging
- Pay-per-use pricing

---

## Cost Estimates

### Free Tier Limits

| Platform | Free Tier | Estimated Usage |
|----------|-----------|-----------------|
| Railway | 500 hours/month | ~1 user: 10-20 requests/day |
| Vercel | 100GB bandwidth | ~1000 users: 50 requests/day each |
| Cloud Run | 2M requests/month | ~10,000 users |
| Gemini API | 60 requests/minute | With caching: plenty |

**For hackathon demo:** All platforms' free tiers are more than sufficient.

---

## Security Considerations

### For Production

1. **Enable CORS restrictions:**

Edit `backend/server.js`:

```javascript
app.use(cors({
  origin: 'chrome-extension://your-extension-id'
}));
```

2. **Add rate limiting:**

```bash
cd backend
pnpm add express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

3. **Add API key authentication:**

```javascript
app.use('/api/', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

---

## Troubleshooting Deployment

### "Application Error" on Railway

- Check logs in Railway dashboard
- Verify `GEMINI_API_KEY` is set
- Ensure `package.json` has correct start script

### "Function Timeout" on Vercel

- Gemini API can be slow (2-5 seconds)
- Vercel free tier has 10-second timeout
- Consider upgrading or using Railway instead

### "Permission Denied" on Cloud Run

- Ensure service is set to `--allow-unauthenticated`
- Check IAM permissions in Google Cloud Console

---

## Rollback Plan

If deployment fails during demo:

1. **Fallback to localhost:**
   - Keep backend running locally
   - Use `http://localhost:3000/api/simplify` in extension

2. **Use cached responses:**
   - Extension caches results
   - Pre-load demo websites before presentation

3. **Show fallback categorization:**
   - Extension works without AI backend
   - Demonstrates resilience

---

## Post-Hackathon

After the hackathon, consider:

1. **Custom domain:** Add your own domain to Railway/Vercel
2. **Analytics:** Track usage with Google Analytics
3. **User feedback:** Add feedback form in extension
4. **Continuous deployment:** Auto-deploy on git push
5. **Monitoring:** Set up uptime monitoring (UptimeRobot)

---

## Quick Reference

### Railway Deployment

```bash
# One-time setup
git push origin main
# Deploy via Railway dashboard

# Update
git push origin main
# Auto-deploys
```

### Vercel Deployment

```bash
# Deploy
vercel --prod

# Update
vercel --prod
```

### Test Deployment

```bash
curl https://your-url.com/health
```

---

## Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Cloud Run Docs: [cloud.google.com/run/docs](https://cloud.google.com/run/docs)

Good luck with deployment! 🚀
