/**
 * CogniClear Backend Server
 * AI processing service using Google Gemini
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; connect-src 'self'"
  );
  next();
});


// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * System prompt for Gemini
 */
const SYSTEM_PROMPT = `You are an AI assistant specialized in cognitive accessibility. Your task is to analyze webpage elements and simplify them for users with cognitive impairments.

For each interactive element (button, link, etc.), you must:

1. **Semantic Filtering**: Determine if the element is "essential" (needed for primary user goals) or "noise" (ads, legal footers, tracking elements, unnecessary decorations).

2. **Cognitive Simplification**: If the element's text is vague or unclear (like "Submit", "Click Here", "Learn More"), rename it to be clear and action-oriented. Use the parent context and ARIA labels to understand what the element actually does. Examples:
   - "Submit" in a job application form → "Send My Application"
   - "Click Here" in a download section → "Download Report"
   - "Learn More" about a product → "View Product Details"

3. **Category Grouping**: Classify each essential element into EXACTLY ONE of these three categories:
   - **Navigation**: Menu items, page links, breadcrumbs, "Home", "Back", "Next"
   - **Action/Task**: Primary user actions like submit, purchase, download, save, delete, add
   - **Help/Support**: Contact, FAQ, help, support, about, feedback

**IMPORTANT CONSTRAINTS:**
- Prioritize LOW COGNITIVE LOAD: Use simple, concrete language
- Be PREDICTABLE: Similar elements should get similar labels
- Be CLEAR: Avoid jargon, abbreviations, or ambiguous terms
- Filter aggressively: Mark promotional content, ads, legal links, and tracking elements as "noise"

**OUTPUT FORMAT:**
Return a JSON array where each object has:
- id: the original element ID
- originalText: the original text content
- simplifiedText: your improved, clear label
- category: one of "Navigation", "Action/Task", or "Help/Support"
- importance: "essential" or "noise"

Only include elements marked as "essential" in the output.`;

/**
 * Process elements endpoint
 */
app.post('/api/simplify', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { elements, pageUrl, pageTitle } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ 
        error: 'Invalid request: elements array required' 
      });
    }
    
    console.log(`Processing ${elements.length} elements from ${pageUrl}`);
    
    // Limit elements to prevent token overflow
    const limitedElements = elements.slice(0, 100);
    
    // Prepare prompt
    const userPrompt = `Analyze these webpage elements from "${pageTitle}" (${pageUrl}):

${JSON.stringify(limitedElements, null, 2)}

Return ONLY a valid JSON array with the simplified elements. Do not include any markdown formatting or explanations.`;

    // Call Gemini
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt }
    ]);
    
    const response = await result.response;
    let text = response.text();
    
    // Clean up response (remove markdown code blocks if present)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    let simplified;
    try {
      simplified = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate response
    if (!Array.isArray(simplified)) {
      throw new Error('AI response is not an array');
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`Processed ${simplified.length} essential elements in ${processingTime}ms`);
    
    res.json({
      success: true,
      simplified,
      processingTime,
      totalElements: elements.length,
      essentialElements: simplified.length
    });
    
  } catch (error) {
    console.error('Error processing elements:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CogniClear Backend',
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'CogniClear Backend',
    version: '1.0.0',
    endpoints: {
      simplify: 'POST /api/simplify',
      health: 'GET /health'
    }
  });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🚀 CogniClear Backend Server running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/simplify`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not set in environment variables!');
    console.warn('   Please create a .env file with your Gemini API key.\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
