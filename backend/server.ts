// Express server for Velxio Project Generator API with Streaming Support

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateVelxioProject, validateProject, latestProject, setLatestProject, getLatestProject, getLatestPrompt } from './api/generate';
import { CatalogService } from './catalog/CatalogService';

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

    // Store the project and prompt for later retrieval
    setLatestProject(project, prompt);

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
  const project = getLatestProject();
  if (!project) {
    return res.status(404).json({ error: 'No project has been generated yet.' });
  }
  res.json(project);
});

app.get('/api/project/latest/wokwi', (req, res) => {
  const project = getLatestProject();
  if (!project) {
    return res.status(404).json({ error: 'No project has been generated yet.' });
  }

  // Return in Wokwi-compatible format
  res.json({
    version: 1,
    name: project.projectMetadata?.name || 'Generated Project',
    prompt: getLatestPrompt(),
    parts: project.components.map(c => ({
      id: c.id,
      type: c.type,
      x: c.x,
      y: c.y,
      properties: c.properties || {},
    })),
    wires: project.connections.map(c => ({
      from: c.from,
      to: c.to,
      color: c.color || '#4ade80',
    })),
    code: project.firmware?.code || '',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


//skip
async function startServer() {
  await CatalogService.init();

  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
