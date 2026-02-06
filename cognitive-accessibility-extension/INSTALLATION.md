# CogniClear - Installation & Testing Guide

Complete step-by-step guide to install, configure, and test the CogniClear browser extension.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([download here](https://nodejs.org/))
- **pnpm** package manager: `npm install -g pnpm`
- **Chrome or Edge browser**
- **Google Gemini API key** ([get one here](https://makersuite.google.com/app/apikey))

## Part 1: Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

### Step 4: Start the Backend Server

```bash
pnpm dev
```

You should see:

```
🚀 CogniClear Backend Server running on port 3000
📍 API endpoint: http://localhost:3000/api/simplify
💚 Health check: http://localhost:3000/health
```

### Step 5: Test the Backend

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "CogniClear Backend",
  "timestamp": "2026-02-05T21:00:00.000Z"
}
```

**Keep this terminal running!** The backend needs to stay active for the extension to work.

---

## Part 2: Extension Installation

### Step 1: Navigate to Extension Directory

Open a **new terminal** (keep the backend running in the first one):

```bash
cd extension
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Build the Extension

```bash
pnpm build
```

This creates a `dist/` folder with the compiled extension.

### Step 4: Load Extension in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Select the `extension/dist` folder

5. The CogniClear extension should now appear in your extensions list!

### Step 5: Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "CogniClear - Cognitive Accessibility Assistant"
3. Click the pin icon to keep it visible

---

## Part 3: Configuration

### Step 1: Open Extension Popup

Click the CogniClear icon in your toolbar.

### Step 2: Configure API Endpoint

In the Settings section:

1. **API Endpoint** field should show: `http://localhost:3000/api/simplify`
2. If it's different, update it
3. Click **"Save"**

You should see "Saved!" confirmation.

---

## Part 4: Testing the Extension

### Test 1: Simple Webpage

1. Navigate to a simple website like:
   - https://example.com
   - https://www.wikipedia.org

2. Click the CogniClear extension icon

3. Click **"Simplify This Page"**

4. Wait 2-5 seconds for processing

5. A sidebar should appear on the right showing:
   - **Navigation** section
   - **Action/Task** section
   - **Help/Support** section

6. Click any simplified button to trigger the original element

7. Click **"✕ Close"** or click **"Show Original Page"** in the popup to toggle back

### Test 2: Complex Form

1. Navigate to a form-heavy website:
   - https://forms.gle (Google Forms)
   - Any job application page
   - Any e-commerce checkout

2. Click **"Simplify This Page"**

3. Observe how vague labels like "Submit" are renamed to clearer text

4. Check that the elements are properly categorized

### Test 3: E-commerce Site

1. Navigate to:
   - https://www.amazon.com
   - https://www.ebay.com

2. Click **"Simplify This Page"**

3. Verify that:
   - Shopping cart, checkout buttons appear in **Action/Task**
   - Menu items appear in **Navigation**
   - Help/Contact links appear in **Help/Support**
   - Ads and promotional content are filtered out

### Test 4: Caching

1. Simplify a page (e.g., wikipedia.org)

2. Click **"Show Original Page"** to toggle off

3. Click **"Simplify This Page"** again

4. Notice it loads **instantly** (from cache)

5. In the popup, check **Settings** → Cache info shows "(1 pages cached)"

---

## Part 5: Troubleshooting

### Issue: "Error: Failed to process page"

**Cause:** Backend is not running or API endpoint is wrong

**Solution:**
1. Check that backend terminal is still running
2. Verify API endpoint in extension settings is `http://localhost:3000/api/simplify`
3. Test backend health: `curl http://localhost:3000/health`

### Issue: "GEMINI_API_KEY not set" warning

**Cause:** Missing or invalid API key

**Solution:**
1. Check `backend/.env` file exists
2. Verify API key is correct
3. Restart backend server: `pnpm dev`

### Issue: Extension not appearing in Chrome

**Cause:** Build failed or wrong folder selected

**Solution:**
1. Rebuild extension: `cd extension && pnpm build`
2. In Chrome extensions, click "Load unpacked" again
3. Select the `extension/dist` folder (not `extension`)

### Issue: Sidebar doesn't appear

**Cause:** No interactive elements found or page blocked content scripts

**Solution:**
1. Check browser console (F12) for errors
2. Try a different website
3. Refresh the page and try again

### Issue: Slow processing (>10 seconds)

**Cause:** Large number of elements or slow API response

**Solution:**
1. This is normal for complex pages
2. Subsequent loads will be cached and instant
3. Check your internet connection
4. Consider using a faster Gemini model in `backend/server.js`

---

## Part 6: Development Tips

### Reload Extension After Changes

After modifying extension code:

1. Rebuild: `cd extension && pnpm build`
2. Go to `chrome://extensions/`
3. Click the refresh icon on CogniClear extension
4. Reload the webpage you're testing

### View Extension Logs

**Content Script logs:**
- Open webpage
- Press F12 (Developer Tools)
- Go to Console tab
- Look for `[CogniClear]` messages

**Background Script logs:**
- Go to `chrome://extensions/`
- Find CogniClear
- Click "service worker" link
- Console opens with background logs

**Popup logs:**
- Right-click extension icon
- Select "Inspect popup"
- Console shows popup logs

### Backend Logs

All backend activity is logged in the terminal where you ran `pnpm dev`.

---

## Part 7: Demo Preparation

### For Live Demo

1. **Prepare test websites:**
   - Bookmark 3-5 websites that work well
   - Test them beforehand to ensure they process correctly

2. **Clear cache before demo:**
   - Open extension popup
   - Click "Clear Cache"
   - This ensures you can show real-time processing

3. **Have backup:**
   - Record a video of the extension working
   - Take screenshots of simplified views
   - Prepare slides explaining the system

### Recommended Demo Websites

✅ **Good for demos:**
- Wikipedia.org (clear categorization)
- Forms.google.com (form simplification)
- Gov.uk (government forms)
- Simple e-commerce sites

❌ **Avoid for demos:**
- Single-page apps with heavy JavaScript
- Sites with CAPTCHAs
- Sites that block content scripts
- Sites with very few interactive elements

---

## Part 8: Packaging for Submission

### Create Extension ZIP

```bash
cd extension/dist
zip -r cogniclear-extension.zip .
```

### Create Source Code ZIP

```bash
cd ../..  # Back to project root
zip -r cogniclear-source.zip . -x "node_modules/*" "*/node_modules/*" "*/dist/*" ".git/*"
```

### GitHub Repository

```bash
git add .
git commit -m "Complete CogniClear extension for INTUition 2026"
git branch -M main
git remote add origin https://github.com/yourusername/cogniclear-extension.git
git push -u origin main
```

---

## Quick Reference Commands

### Start Backend
```bash
cd backend && pnpm dev
```

### Build Extension
```bash
cd extension && pnpm build
```

### Test Backend Health
```bash
curl http://localhost:3000/health
```

### Clear Extension Cache
Click extension icon → Settings → Clear Cache

### Reload Extension
`chrome://extensions/` → Click refresh icon

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in browser console and backend terminal
3. Verify all prerequisites are installed
4. Try the extension on a simple website first

Good luck with your hackathon! 🚀
