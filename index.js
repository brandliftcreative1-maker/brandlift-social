const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ── Claude API proxy ──
app.post('/api/generate', async (req, res) => {
  const { prompt, claudeKey } = req.body;
  if (!prompt || !claudeKey) return res.status(400).json({ error: 'Missing prompt or API key' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
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
  const { prompt, openaiKey } = req.body;
  if (!prompt || !openaiKey) return res.status(400).json({ error: 'Missing prompt or OpenAI key' });
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
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
  const { brandProfile, claudeKey } = req.body;
  if (!brandProfile || !claudeKey) return res.status(400).json({ error: 'Missing data' });
  const prompt = `You are a world-class social media strategist for Brandlift Creative.

Based on this brand profile, generate 5 specific, actionable post ideas for this week.

Brand Profile:
- Business: ${brandProfile.businessName}
- Industry: ${brandProfile.industry}
- Target audience: ${brandProfile.audience}
- Brand voice: ${brandProfile.voice}
- Content pillars: ${brandProfile.pillars}
- Goals: ${brandProfile.goals}

Generate 5 post recommendations. Each should include:
- A compelling post topic/angle
- Which platform it works best for
- The emotional hook to use
- Why it will resonate with their specific audience

Respond ONLY with raw JSON, no markdown:
{"recommendations":[{"topic":"...","platform":"Facebook","hook":"Inspirational story","reason":"...","cta":"..."}]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
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
