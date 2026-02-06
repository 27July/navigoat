# CogniClear - Fixes Applied & Setup Instructions

## Issues Fixed ✅

### 1. Extension Build Issue
**Problem:** popup.html was in wrong directory structure  
**Solution:** Rebuilt extension with correct file placement  
**Status:** ✅ FIXED

### 2. Backend Not Running
**Problem:** Backend server wasn't started  
**Solution:** Instructions provided below  
**Status:** ⚠️ NEEDS YOUR ACTION

---

## Step-by-Step Setup (DO THIS NOW)

### Step 1: Get Your Gemini API Key (2 minutes)

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

### Step 2: Configure Backend (1 minute)

The `.env` file already exists at `backend/.env`. Edit it:

```bash
cd /home/ubuntu/cognitive-accessibility-extension/backend
nano .env
```

Replace `REPLACE_WITH_YOUR_ACTUAL_API_KEY` with your actual Gemini API key:

```
GEMINI_API_KEY=AIzaSyC-your-actual-key-here
PORT=3000
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 3: Start Backend Server (30 seconds)

```bash
cd /home/ubuntu/cognitive-accessibility-extension/backend
pnpm dev
```

You should see:
```
🚀 CogniClear Backend Server running on port 3000
📍 API endpoint: http://localhost:3000/api/simplify
💚 Health check: http://localhost:3000/health
```

**IMPORTANT:** Keep this terminal window open! The server must stay running.

### Step 4: Test Backend (30 seconds)

Open a **NEW terminal** and run:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "CogniClear Backend",
  "timestamp": "2026-02-05T22:00:00.000Z"
}
```

If you see this, backend is working! ✅

### Step 5: Reload Extension in Chrome (1 minute)

1. Go to: `chrome://extensions/`
2. Find **CogniClear** extension
3. Click the **🔄 Reload** button (circular arrow icon)
4. The error should disappear

### Step 6: Test the Extension (1 minute)

1. Navigate to: https://www.wikipedia.org
2. Click the **CogniClear** icon in toolbar
3. Click **"Simplify This Page"**
4. Wait 2-5 seconds
5. Sidebar should appear with simplified elements!

---

## Common Issues & Solutions

### Issue: "Cannot GET /api/simplify"

**Cause:** You're trying to access the API endpoint in a web browser. This endpoint only accepts POST requests, not GET.

**Solution:** 
- Don't open `http://localhost:3000/api/simplify` in your browser
- The extension will call this endpoint automatically
- To test manually, use the curl command in Step 4

### Issue: "GEMINI_API_KEY not set"

**Cause:** The .env file doesn't have your API key

**Solution:**
1. Edit `backend/.env`
2. Add your actual Gemini API key
3. Restart the backend server

### Issue: Extension popup doesn't open

**Cause:** Extension needs to be reloaded after rebuild

**Solution:**
1. Go to `chrome://extensions/`
2. Click reload button on CogniClear
3. Try clicking the icon again

### Issue: "Failed to fetch" error in extension

**Cause:** Backend server is not running

**Solution:**
1. Open terminal
2. Run: `cd /home/ubuntu/cognitive-accessibility-extension/backend && pnpm dev`
3. Keep terminal open

### Issue: Port 3000 already in use

**Cause:** Another process is using port 3000

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
# Edit backend/.env and change PORT=3000 to PORT=3001
# Then update extension settings to use http://localhost:3001/api/simplify
```

---

## Quick Test Commands

### Test Backend Health
```bash
curl http://localhost:3000/health
```

### Test Backend API (Full Test)
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

Expected response:
```json
{
  "success": true,
  "simplified": [
    {
      "id": "test-1",
      "originalText": "Submit",
      "simplifiedText": "Send Contact Form",
      "category": "Action/Task",
      "importance": "essential"
    }
  ],
  "processingTime": 234,
  "totalElements": 1,
  "essentialElements": 1
}
```

### Check if Backend is Running
```bash
ps aux | grep "node.*server.js" | grep -v grep
```

If you see output, backend is running. If not, start it.

---

## File Locations

- **Extension source:** `/home/ubuntu/cognitive-accessibility-extension/extension/`
- **Extension built:** `/home/ubuntu/cognitive-accessibility-extension/extension/dist/`
- **Backend:** `/home/ubuntu/cognitive-accessibility-extension/backend/`
- **Backend config:** `/home/ubuntu/cognitive-accessibility-extension/backend/.env`

---

## What's Been Fixed

✅ Extension rebuilt with correct structure  
✅ popup.html in correct location  
✅ All JavaScript files properly bundled  
✅ Icons copied correctly  
✅ Manifest.json in place  
✅ Backend dependencies installed  
✅ .env file created (needs your API key)  

---

## What You Need To Do

1. ⚠️ **Get Gemini API key** (2 minutes)
2. ⚠️ **Add API key to backend/.env** (1 minute)
3. ⚠️ **Start backend server** (30 seconds)
4. ⚠️ **Reload extension in Chrome** (30 seconds)
5. ✅ **Test on Wikipedia** (1 minute)

**Total time: 5 minutes**

---

## After Setup

Once everything is working:

1. **Keep backend terminal open** during testing
2. **Test on multiple websites** (Wikipedia, Amazon, forms)
3. **Practice your demo** using DEMO_SCRIPT.md
4. **Deploy backend** to Railway (see DEPLOYMENT.md)

---

## Need Help?

If you're still having issues:

1. Check that backend terminal shows "Server running on port 3000"
2. Test health endpoint: `curl http://localhost:3000/health`
3. Check extension console (F12) for errors
4. Verify API key is correct in backend/.env
5. Try restarting both backend and Chrome

---

## Quick Start Command (All-in-One)

After adding your API key to `.env`, run this:

```bash
# Terminal 1: Start backend
cd /home/ubuntu/cognitive-accessibility-extension/backend && pnpm dev
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Reload CogniClear extension
3. Visit wikipedia.org
4. Click extension icon → "Simplify This Page"

**That's it!** 🚀

---

## Status Check

Run this to verify everything:

```bash
echo "=== CogniClear Status Check ===" && \
echo "" && \
echo "1. Backend files:" && \
ls -la /home/ubuntu/cognitive-accessibility-extension/backend/server.js && \
echo "" && \
echo "2. Extension dist:" && \
ls -la /home/ubuntu/cognitive-accessibility-extension/extension/dist/popup.html && \
echo "" && \
echo "3. .env file:" && \
ls -la /home/ubuntu/cognitive-accessibility-extension/backend/.env && \
echo "" && \
echo "4. Backend running:" && \
(curl -s http://localhost:3000/health > /dev/null && echo "✅ Backend is running!" || echo "❌ Backend is NOT running - start it with: cd backend && pnpm dev") && \
echo "" && \
echo "=== All checks complete ==="
```

---

**You're almost there! Just add your API key and start the backend.** 🎉
