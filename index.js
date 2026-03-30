const express = require('express');
const app = express();

app.use(express.json());

// ── CORS — allows Netlify frontend to call this server ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static('public'));

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const OPENAI_KEY = process.env.OPENAI_KEY;

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    claude: CLAUDE_KEY ? 'configured' : 'missing',
    openai: OPENAI_KEY ? 'configured' : 'not set'
  });
});

// ── Generate posts ──
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'CLAUDE_KEY not set in Render environment variables.' });
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
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ── Generate image ──
app.post('/api/image', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_KEY not set in Render environment variables.' });
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
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ── Brand recommendations ──
app.post('/api/recommend', async (req, res) => {
  const { brandProfile } = req.body;
  if (!brandProfile) return res.status(400).json({ error: 'Missing brand profile' });
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'CLAUDE_KEY not set.' });

  const prompt = `You are a world-class social media strategist for Brandlift Creative.
Based on this brand profile, generate 5 specific post ideas for this week.
Business: ${brandProfile.businessName}
Industry: ${brandProfile.industry}
Audience: ${brandProfile.audience}
Voice: ${brandProfile.voice}
Content pillars: ${brandProfile.pillars}
Goals: ${brandProfile.goals}
Respond ONLY with raw JSON:
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
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Brandlift Social running on port ${PORT}`));
