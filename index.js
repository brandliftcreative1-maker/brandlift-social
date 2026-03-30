const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Keys stored securely on the server — users never see them
const CLAUDE_KEY = process.env.CLAUDE_KEY;
const OPENAI_KEY = process.env.OPENAI_KEY;

// ── Claude API proxy ──
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Server not configured — please add CLAUDE_KEY environment variable in Render.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Claude API error' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OpenAI DALL-E image generation proxy ──
app.post('/api/image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured — please add OPENAI_KEY environment variable in Render.' });
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Brand recommendations proxy ──
app.post('/api/recommend', async (req, res) => {
  const { brandProfile } = req.body;
  if (!brandProfile) return res.status(400).json({ error: 'Missing brand profile' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Server not configured.' });

  const prompt = `You are a world-class social media strategist for Brandlift Creative.

Based on this brand profile, generate 5 specific, actionable post ideas for this week.

Brand Profile:
- Business: ${brandProfile.businessName}
- Industry: ${brandProfile.industry}
- Target audience: ${brandProfile.audience}
- Brand voice: ${brandProfile.voice}
- Content pillars: ${brandProfile.pillars}
- Goals: ${brandProfile.goals}

Generate 5 post recommendations. Each should include a compelling topic, best platform, emotional hook, and why it resonates with their audience.

Respond ONLY with raw JSON, no markdown:
{"recommendations":[{"topic":"...","platform":"Facebook","hook":"Inspirational story","reason":"...","cta":"..."}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Brandlift Social running on port ${PORT}`));
