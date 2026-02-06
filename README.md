# CogniClear - AI-Driven Browser Extension for Cognitive Accessibility

**INTUition 2026 Hackathon Submission**

## Overview

CogniClear is an AI-powered browser extension that transforms complex web interfaces into simplified, predictable experiences for users with cognitive impairments. The system uses advanced language models to analyze webpage elements, filter out noise, rename vague labels into clear action-oriented text, and categorize elements into three intuitive groups.

## Problem Statement

Users with cognitive impairments face significant barriers when navigating modern websites:
- Information overload from cluttered interfaces
- Vague or ambiguous button labels ("Submit", "Click Here")
- Unpredictable layouts that increase cognitive load
- Inability to complete tasks independently

## Solution

CogniClear provides:
1. **Semantic Filtering**: Identifies essential elements vs. noise (ads, legal footers)
2. **Cognitive Simplification**: Renames vague labels into clear, action-oriented text
3. **Category Grouping**: Organizes elements into Navigation, Action/Task, and Help/Support
4. **Real-time Processing**: Fast AI-driven analysis with intelligent caching
5. **Reversible Adaptations**: Users can toggle between simplified and original views

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Webpage   │ ───> │ Content Script   │ ───> │ Service Worker  │
└─────────────┘      └──────────────────┘      └─────────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ AI Backend  │
                                                  │  (Gemini)   │
                                                  └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ Simplified  │
                                                  │  UI Overlay │
                                                  └─────────────┘
```

## Tech Stack

### Browser Extension
- Manifest V3 (Chrome/Edge)
- TypeScript
- Vite (bundler)
- Tailwind CSS

### Backend Service
- Node.js + Express
- Google Gemini API
- In-memory caching

### Deployment
- Extension: Chrome Developer Mode / GitHub Releases
- Backend: Railway / Vercel

## Installation

### Prerequisites
- Node.js 18+ and pnpm
- Chrome or Edge browser
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
pnpm install
```

2. Create a `.env` file:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

3. Start the backend server:
```bash
pnpm dev
```

The backend will run on `http://localhost:3000`

### Extension Setup

1. Navigate to the extension directory:
```bash
cd extension
pnpm install
```

2. Build the extension:
```bash
pnpm build
```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

4. Configure the API endpoint:
   - Click the extension icon
   - Enter your backend URL (e.g., `http://localhost:3000` or your deployed URL)
   - Save settings

## Usage

1. Navigate to any webpage
2. Click the CogniClear extension icon
3. Click "Simplify Page" to activate
4. View the simplified interface with categorized elements
5. Toggle back to original view anytime

## Testing

Test on these recommended websites:
- E-commerce: Amazon, eBay
- Government: IRS.gov, USA.gov
- Banking: Any bank login/dashboard
- Forms: Google Forms, Typeform

## Judging Criteria Alignment

### Impact (25%)
- Clearly addresses cognitive load reduction
- Enables independent task completion
- Broadly applicable across any website

### Real-time Performance (25%)
- Fast processing with caching
- Progressive enhancement
- Graceful degradation

### Design (25%)
- Fully functional end-to-end system
- Intuitive, accessible UI
- Reversible adaptations

### Innovation (25%)
- AI-driven dynamic simplification
- Context-aware categorization
- Extensible to other impairments

## Project Structure

```
cognitive-accessibility-extension/
├── extension/              # Chrome extension
│   ├── src/
│   │   ├── content/       # Content scripts
│   │   ├── background/    # Service worker
│   │   ├── popup/         # Extension popup UI
│   │   └── overlay/       # Simplified UI overlay
│   ├── public/            # Static assets
│   └── manifest.json      # Extension manifest
├── backend/               # AI processing service
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # AI service logic
│   │   └── utils/         # Helper functions
│   └── server.js          # Express server
└── README.md
```

## API Documentation

### POST /api/simplify

Processes webpage elements and returns simplified version.

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
  "simplified": [
    {
      "id": "btn-1",
      "originalText": "Submit",
      "simplifiedText": "Send My Application",
      "category": "Action/Task",
      "importance": "essential"
    }
  ],
  "processingTime": 234
}
```

## Deployment

### Backend Deployment (Railway)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
cd backend
railway login
railway init
railway up
```

3. Set environment variables in Railway dashboard

### Extension Distribution

1. Create a ZIP file:
```bash
cd extension/dist
zip -r cogniclear-extension.zip .
```

2. Distribute via:
   - GitHub Releases
   - Chrome Web Store (requires developer account)
   - Direct sharing of ZIP file

## Future Enhancements

- Multi-language support
- Voice navigation integration
- Mobile browser support
- Customizable categorization rules
- User feedback learning system

## License

MIT License - Built for INTUition 2026 Hackathon

## Team

[Your Team Name]

## Acknowledgments

- IEEE NTU Student Chapter
- Jane Street (Sponsor)
- Google Gemini API
