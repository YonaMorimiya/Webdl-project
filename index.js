/*
• Jasa pembuatan website 
• Menerima perbaikan script atau fitur bot
• Menerima pembuatan fitur bot
• Menerima semua kebutuhan bot
• Menerima dia dengan segala kekurangannya;)
ℹ️ Information

• Bisa bayar di awal atau akhir
• Pembayaran melalu QRIS Only
• Testimoni Banyak

        ••JANGAN HAPUS INI••
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (6282389924037)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const config = require('./api/config');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Favicon SVG (inline, no 404) ────────────────────────────────────────────
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#007AFF"/>
  <path d="M50 20 L50 65 M35 52 L50 67 L65 52" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="28" y="72" width="44" height="7" rx="3.5" fill="white"/>
</svg>`;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// ─── Favicon (prevents browser 404) ──────────────────────────────────────────
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(FAVICON_SVG);
});
app.get('/favicon.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(FAVICON_SVG);
});
app.get('/apple-touch-icon.png', (req, res) => res.redirect('/favicon.svg'));
app.get('/apple-touch-icon-precomposed.png', (req, res) => res.redirect('/favicon.svg'));
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('User-agent: *\nDisallow: /api/\n');
});
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'lizdll',
    short_name: 'lizdll',
    description: 'Free All-in-One Media Downloader — No Watermark, HD Quality',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#007AFF',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
  });
});

// ─── Pages ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('pinterest.com') || host.includes('pin.it')) return 'pinterest';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('capcut.com')) return 'capcut';
    if (host.includes('icocofun.com')) return 'cocofun';
    if (host.includes('snackvideo.com')) return 'snackvideo';
    if (host.includes('spotify.com')) return 'spotify';
    if (host.includes('drive.google.com')) return 'gdrive';
    return null;
  } catch {
    return null;
  }
}

// ─── API Fetch Helper ─────────────────────────────────────────────────────────
async function fetchAPI(endpoint, url) {
  const apiUrl = `${config.API_BASE}${endpoint}?apikey=${config.API_KEY}&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Upstream API error ${response.status}`);
    return response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

// ─── Download Endpoint ────────────────────────────────────────────────────────
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const platform = detectPlatform(url.trim());
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform not supported or URL not recognized' });
    }

    const endpoint = config.ENDPOINTS[platform];
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Platform endpoint not configured' });
    }

    let data = await fetchAPI(endpoint, url.trim());

    if (platform === 'tiktok') {
      const isPhotoUrl = url.includes('/photo/');
      const r = data.result;
      const hasNoVideo = !r?.video || r.video.length === 0;
      const hasImages = r?.images && r.images.length > 0;
      if (isPhotoUrl || (hasNoVideo && hasImages)) {
        try {
          const slideData = await fetchAPI(config.ENDPOINTS.tiktokslide, url.trim());
          if (slideData?.result?.images?.length) {
            data = { ...slideData, _slideMode: true };
          }
        } catch { /* keep original */ }
      }
    }

    return res.json({ success: true, platform, data });
  } catch (err) {
    const message = err.message || 'Failed to fetch media';
    return res.status(502).json({ success: false, error: message });
  }
});

// ─── Status Endpoint ──────────────────────────────────────────────────────────
const PLATFORM_NAMES = {
  tiktok: 'TikTok', tiktokslide: 'TikTok Slide', instagram: 'Instagram',
  youtube: 'YouTube', facebook: 'Facebook', pinterest: 'Pinterest',
  threads: 'Threads', capcut: 'CapCut', cocofun: 'CocoFun',
  snackvideo: 'SnackVideo', spotify: 'Spotify', gdrive: 'Google Drive'
};

app.get('/api/status', async (req, res) => {
  const results = [];

  await Promise.allSettled(
    Object.entries(config.TEST_URLS).map(async ([platform, testUrl]) => {
      const endpoint = config.ENDPOINTS[platform];
      const name = PLATFORM_NAMES[platform] || platform;
      const start = Date.now();
      try {
        const data = await fetchAPI(endpoint, testUrl);
        const latency = Date.now() - start;
        const ok = data && (data.status === true || (data.result && Object.keys(data.result).length > 0));
        results.push({ platform, name, status: ok ? 'online' : 'error', latency, message: ok ? 'Operational' : 'Unexpected response' });
      } catch (err) {
        results.push({ platform, name, status: 'offline', latency: Date.now() - start, message: 'Unreachable' });
      }
    })
  );

  results.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, checked: results.length, timestamp: Date.now(), results });
});

// ─── Catch-all: 404 → back to index (SPA-style, no console error) ─────────────
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.status(404).json({ success: false, error: 'Not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lizdown server running on port ${PORT}`);
});

// ─── Graceful shutdown (prevents EADDRINUSE on restart) ────────────────────────
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

module.exports = app;
