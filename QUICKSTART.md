# CogniClear - Quick Start Guide

**Get up and running in 5 minutes!**

---

## Prerequisites

- Node.js 18+ and pnpm installed
- Chrome browser
- Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))

---

## Step 1: Clone or Download

```bash
# If from GitHub
git clone https://github.com/yourusername/cogniclear-extension.git
cd cogniclear-extension

# Or extract the ZIP file and navigate to the folder
```

---

## Step 2: Setup Backend (2 minutes)

```bash
cd backend
pnpm install
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

Start the server:

```bash
pnpm dev
```

✅ You should see: `🚀 CogniClear Backend Server running on port 3000`

**Keep this terminal open!**

---

## Step 3: Build Extension (1 minute)

Open a **new terminal**:

```bash
cd extension
pnpm install
pnpm build
```

✅ Extension built in `extension/dist/` folder

---

## Step 4: Load in Chrome (1 minute)

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/dist` folder
5. Pin the extension to your toolbar

✅ CogniClear icon should appear in toolbar

---

## Step 5: Test It! (1 minute)

1. Navigate to https://www.wikipedia.org
2. Click the CogniClear icon
3. Click **"Simplify This Page"**
4. Wait 2-3 seconds
5. Sidebar appears with simplified elements!

✅ **You're done!**

---

## What's Next?

- **Read INSTALLATION.md** for detailed setup and troubleshooting
- **Read DEMO_SCRIPT.md** for presentation tips
- **Read DEPLOYMENT.md** to deploy the backend
- **Customize** the extension for your needs

---

## Troubleshooting

### Backend won't start

- Check that you created `.env` file
- Verify your Gemini API key is correct
- Make sure port 3000 is not in use

### Extension won't load

- Make sure you selected the `dist` folder, not `extension`
- Rebuild: `cd extension && pnpm build`
- Check for errors in `chrome://extensions/`

### Sidebar doesn't appear

- Check that backend is running
- Open browser console (F12) and look for errors
- Try a different website (some sites block extensions)

---

## Support

For detailed help, see:
- **INSTALLATION.md** - Complete setup guide
- **README.md** - Project overview
- **backend/README.md** - Backend API docs

---

**Enjoy using CogniClear!** 🚀
