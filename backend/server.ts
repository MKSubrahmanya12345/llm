// Express server for Velxio Project Generator API with Streaming Support

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateVelxioProject, validateProject, latestProject } from './api/generate';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  const sendEvent = (data: any) => {
    res.write(JSON.stringify(data) + '\n');
  };

  try {
    console.log(`Generating project stream for prompt: "${prompt}"`);

    // Call the generator passing our streaming progress handler
    const project = await generateVelxioProject(prompt, (evt) => {
      sendEvent({ type: 'progress', evtType: evt.type, message: evt.message });
    });

    const validation = await validateProject(project);

    // Send final success event
    sendEvent({
      type: 'done',
      project,
      validation,
      success: validation.valid,
    });
    res.end();
  } catch (error: any) {
    console.error('Generation error:', error);
    sendEvent({
      type: 'error',
      message: error?.message || 'Failed to generate project'
    });
    res.end();
  }
});

app.get('/api/project/latest', (req, res) => {
  if (!latestProject) {
    return res.status(404).json({ error: 'No project has been generated yet.' });
  }
  res.json(latestProject);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


//skip
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
