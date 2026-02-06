/**
 * CogniClear Backend Server
 * AI processing service using Groq (much faster than Gemini)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq AI (faster inference than Gemini)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * System prompt for AI
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
 * Process elements endpoint (batch processing)
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
    
    // Reduce data sent to API to prevent token overflow
    // Only send essential fields: id, text, ariaLabel, parentText (truncated)
    const compactElements = elements.slice(0, 50).map(el => ({
      id: el.id,
      text: (el.text || '').substring(0, 100),
      ariaLabel: (el.ariaLabel || '').substring(0, 50),
      parentText: (el.parentText || '').substring(0, 50),
      type: el.type
    }));
    
    console.log(`Sending ${compactElements.length} compact elements to Groq`);
    
    // Prepare prompt
    const userPrompt = `Analyze these webpage elements from "${pageTitle}":

${JSON.stringify(compactElements)}

Return ONLY a valid JSON array with the simplified elements. No markdown, no explanations.`;

    // Call Groq (much faster than Gemini - typically <1 second)
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile', // Fast and accurate
      temperature: 0.3,
      max_tokens: 4096,
    });
    
    let text = completion.choices[0]?.message?.content || '';
    
    // Clean up response (remove markdown code blocks if present)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    let simplified;
    try {
      simplified = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate response
    if (!Array.isArray(simplified)) {
      throw new Error('AI response is not an array');
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Processed ${simplified.length} essential elements in ${processingTime}ms`);
    
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
 * Progressive processing endpoint (process in chunks for faster initial response)
 */
app.post('/api/simplify-progressive', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { elements, pageUrl, pageTitle, chunkSize = 5 } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ 
        error: 'Invalid request: elements array required' 
      });
    }
    
    console.log(`Progressive processing: ${elements.length} elements in chunks of ${chunkSize}`);
    
    // Process first chunk immediately
    const firstChunk = elements.slice(0, chunkSize);
    const remainingElements = elements.slice(chunkSize, 100); // Limit total to 100
    
    // Process first chunk
    const firstResult = await processChunk(firstChunk, pageUrl, pageTitle);
    
    const firstProcessingTime = Date.now() - startTime;
    
    console.log(`✅ First chunk (${firstChunk.length} elements) processed in ${firstProcessingTime}ms`);
    
    // Return first chunk immediately
    res.json({
      success: true,
      simplified: firstResult,
      processingTime: firstProcessingTime,
      totalElements: elements.length,
      essentialElements: firstResult.length,
      isPartial: remainingElements.length > 0,
      processedCount: chunkSize,
      remainingCount: remainingElements.length
    });
    
  } catch (error) {
    console.error('Error in progressive processing:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime
    });
  }
});

/**
 * Helper function to process a chunk of elements
 */
async function processChunk(elements, pageUrl, pageTitle) {
  // Compact elements to reduce token usage
  const compactElements = elements.map(el => ({
    id: el.id,
    text: (el.text || '').substring(0, 100),
    ariaLabel: (el.ariaLabel || '').substring(0, 50),
    parentText: (el.parentText || '').substring(0, 50),
    type: el.type
  }));
  
  const userPrompt = `Analyze these webpage elements from "${pageTitle}":

${JSON.stringify(compactElements)}

Return ONLY a valid JSON array with the simplified elements. No markdown, no explanations.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 4096,
  });
  
  let text = completion.choices[0]?.message?.content || '';
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  const simplified = JSON.parse(text);
  
  if (!Array.isArray(simplified)) {
    throw new Error('AI response is not an array');
  }
  
  return simplified;
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CogniClear Backend (Groq)',
    timestamp: new Date().toISOString(),
    apiConfigured: !!process.env.GROQ_API_KEY
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'CogniClear Backend',
    version: '2.0.0',
    aiProvider: 'Groq (Llama 3.3 70B)',
    endpoints: {
      simplify: 'POST /api/simplify (batch processing)',
      simplifyProgressive: 'POST /api/simplify-progressive (progressive chunks)',
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
  console.log(`📍 API endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/simplify (batch)`);
  console.log(`   - http://localhost:${PORT}/api/simplify-progressive (progressive)`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ AI Provider: Groq (Llama 3.3 70B - ultra-fast inference)\n`);
  
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  WARNING: GROQ_API_KEY not set in environment variables!');
    console.warn('   Get your free API key at: https://console.groq.com/keys\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
