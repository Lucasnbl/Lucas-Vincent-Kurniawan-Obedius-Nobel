import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Server-side API endpoint for AI brainstorming
  app.post('/api/brainstorm', async (req, res): Promise<any> => {
    try {
      const { text, goal, contextNodes } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required to expand' });
      }

      const instructions = `You are a creative brainstorming assistant.
The user wants to brainstorm ideas related to the concept: "${text}".
The objective is: "${goal || 'Expand with diverse sub-topics'}".
${contextNodes && contextNodes.length > 0 ? `To give you broader context, other connected concepts in this map include: ${JSON.stringify(contextNodes)}.` : ''}

Provide a structured, insightful list of exactly 4 new sub-conceptions or actionable child ideas.
Each sub-concept must have:
1. title: A short, concise phrase (1-4 words).
2. type: Can be 'concept', 'question', 'action', or 'resource'.
3. description: A very short 1-sentence supportive explanation or rationale.

Ensure they are creative, highly relative, and intellectually stimulating. Return the response in strict JSON compliance.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Please brainstorm expansion sub-nodes for: "${text}"`,
        config: {
          systemInstruction: instructions,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ideas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Short phrase of the brainstormed idea' },
                    type: {
                      type: Type.STRING,
                      enum: ['concept', 'question', 'action', 'resource'],
                      description: 'The semantic node type'
                    },
                    description: { type: Type.STRING, description: 'One-sentence creative detail' }
                  },
                  required: ['title', 'type', 'description']
                }
              }
            },
            required: ['ideas']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini model did not return any text.');
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(responseText);
    } catch (err: any) {
      console.error('API Error in /api/brainstorm:', err);
      res.status(500).json({ error: err.message || 'Failed to brainstorm child ideas' });
    }
  });

  // Handle client-side assets & Vite development middleware
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In dev, load Vite's middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || 3000;
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server listening on public port http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
