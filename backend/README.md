# CogniClear Backend Service

AI processing backend for the CogniClear browser extension using Google Gemini.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
```

### 3. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into your `.env` file

## Running the Server

### Development Mode (with auto-reload)

```bash
pnpm dev
```

### Production Mode

```bash
pnpm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /api/simplify

Process webpage elements and return simplified version.

**Request Body:**
```json
{
  "elements": [
    {
      "id": "btn-1",
      "text": "Submit",
      "ariaLabel": "",
      "parentText": "Application Form",
      "type": "button"
    }
  ],
  "pageUrl": "https://example.com",
  "pageTitle": "Example Page"
}
```

**Response:**
```json
{
  "success": true,
  "simplified": [
    {
      "id": "btn-1",
      "originalText": "Submit",
      "simplifiedText": "Send My Application",
      "category": "Action/Task",
      "importance": "essential"
    }
  ],
  "processingTime": 234,
  "totalElements": 1,
  "essentialElements": 1
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "CogniClear Backend",
  "timestamp": "2026-02-05T21:00:00.000Z"
}
```

## Deployment

### Option 1: Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Set environment variables in Railway dashboard:
   - `GEMINI_API_KEY`
   - `PORT` (Railway sets this automatically)

### Option 2: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables:
```bash
vercel env add GEMINI_API_KEY
```

### Option 3: Google Cloud Run

1. Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

2. Deploy:
```bash
gcloud run deploy cogniclear-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Testing

Test the API with curl:

```bash
curl -X POST http://localhost:3000/api/simplify \
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

## Performance

- Average processing time: 200-500ms per request
- Supports up to 100 elements per request
- Automatic response caching in the extension
- Rate limiting recommended for production

## Troubleshooting

### "GEMINI_API_KEY not set" warning

Make sure you've created a `.env` file with your API key.

### "Invalid JSON response from AI"

The Gemini API occasionally returns malformed JSON. The server will automatically retry. If it persists, check your API quota.

### CORS errors

The server allows all origins by default. For production, configure CORS in `server.js`:

```javascript
app.use(cors({
  origin: 'chrome-extension://your-extension-id'
}));
```

## License

MIT
