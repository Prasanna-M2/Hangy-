// server.js - Hangly for Windows Server & Web Studio Host
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const SETTINGS_FILE = path.join(__dirname, 'hangly_settings.json');
const CUSTOM_CHARMS_FILE = path.join(__dirname, 'custom_charms.json');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'assets', 'custom');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Default settings matching Hangly OverlaySettings.swift
const defaultSettings = {
  overlay: {
    isEnabled: true,
    anchor: 'topTrailing', // topLeading, topCenter, topTrailing, taskbar, pin
    scale: 1.0,
    opacity: 1.0,
    horizontalOffset: 0,
    verticalOffset: 0,
    isClickThrough: false,
    anchorsToScreenEdge: true,
    charm: 'daruma',
    hangMode: 'topTrailing', // topTrailing, topCenter, topLeading, taskbar, pin, breeze, pendulum, magnetic, elastic, calm
    customPinX: 0.5,
    customPinY: 0.05
  },
  physics: {
    segmentCount: 20,
    segmentLength: 11,
    gravity: 2000,
    damping: 0.999,
    constraintIterations: 256,
    maxStretchRatio: 1.02,
    restSpeed: 4.0,
    framesBeforeSleep: 60,
    initialAngle: 0.38
  },
  sound: {
    enabled: true,
    volume: 0.75
  },
  studio: {
    theme: 'windows-bloom-dark',
    showFps: true
  }
};

function loadSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...defaultSettings, ...data };
    } catch (e) {
      console.warn('[Hangly] Could not read settings file, using defaults.', e.message);
    }
  }
  return defaultSettings;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[Hangly] Error saving settings:', e.message);
    return false;
  }
}

function loadCustomCharms() {
  if (fs.existsSync(CUSTOM_CHARMS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CUSTOM_CHARMS_FILE, 'utf8'));
    } catch (e) {
      console.warn('[Hangly] Error reading custom charms file:', e.message);
    }
  }
  return [];
}

function saveCustomCharms(charms) {
  try {
    fs.writeFileSync(CUSTOM_CHARMS_FILE, JSON.stringify(charms, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[Hangly] Error saving custom charms:', e.message);
    return false;
  }
}

let currentSettings = loadSettings();

// WebSocket broadcast for real-time synchronization
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', ws => {
  // Send current settings on connect
  ws.send(JSON.stringify({ type: 'settings', data: currentSettings }));

  ws.on('message', message => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'update_settings') {
        currentSettings = { ...currentSettings, ...parsed.data };
        saveSettings(currentSettings);
        broadcast({ type: 'settings', data: currentSettings });
      } else if (parsed.type === 'trigger_swing') {
        broadcast({ type: 'trigger_swing', force: parsed.force });
      }
    } catch (err) {
      console.error('[WebSocket] Message parse error:', err.message);
    }
  });
});

// REST API
app.get('/api/settings', (req, res) => {
  res.json(currentSettings);
});

app.post('/api/settings', (req, res) => {
  currentSettings = { ...currentSettings, ...req.body };
  saveSettings(currentSettings);
  broadcast({ type: 'settings', data: currentSettings });
  res.json({ status: 'ok', settings: currentSettings });
});

app.get('/api/library', (req, res) => {
  const libraryPath = path.join(PUBLIC_DIR, 'assets', 'CharmLibrary.json');
  if (fs.existsSync(libraryPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read CharmLibrary.json' });
    }
  } else {
    res.status(404).json({ error: 'CharmLibrary.json not found' });
  }
});

app.get('/api/custom-charms', (req, res) => {
  res.json(loadCustomCharms());
});

app.post('/api/custom-charms', (req, res) => {
  const { name, dataUrl, mass, sound, beadCount, description } = req.body;
  if (!dataUrl || !name) {
    return res.status(400).json({ error: 'Missing charm name or image data' });
  }

  const id = 'custom-' + Date.now();
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const ext = dataUrl.includes('image/svg+xml') ? 'svg' : 'png';
  const fileName = `${id}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  fs.writeFile(filePath, base64Data, 'base64', err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save image' });
    }

    const charms = loadCustomCharms();
    const newCharm = {
      id,
      name,
      fileName: `/assets/custom/${fileName}`,
      mass: parseFloat(mass) || 3.0,
      sound: sound || 'wood',
      beadCount: parseInt(beadCount, 10) || 2,
      description: description || 'Custom user charm',
      createdAt: Date.now()
    };
    charms.unshift(newCharm);
    saveCustomCharms(charms);

    broadcast({ type: 'custom_charms_updated', charms });
    res.json({ status: 'ok', charm: newCharm });
  });
});

app.delete('/api/custom-charms/:id', (req, res) => {
  const { id } = req.params;
  let charms = loadCustomCharms();
  const charm = charms.find(c => c.id === id);
  if (charm && charm.fileName) {
    const p = path.join(PUBLIC_DIR, charm.fileName);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (_) {}
    }
  }
  charms = charms.filter(c => c.id !== id);
  saveCustomCharms(charms);
  broadcast({ type: 'custom_charms_updated', charms });
  res.json({ status: 'ok' });
});

// Serve frontend static assets
app.use(express.static(PUBLIC_DIR));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const net = require('net');

function getAvailablePort(startPort) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => {
      resolve(getAvailablePort(startPort + 1));
    });
    tester.once('listening', () => {
      tester.close(() => resolve(startPort));
    });
    tester.listen(startPort);
  });
}

const requestedPort = parseInt(process.env.PORT, 10) || 3030;
getAvailablePort(requestedPort).then((activePort) => {
  server.listen(activePort, () => {
    console.log(`====================================================`);
    console.log(`  Hangly for Windows — Web Studio & Physics Engine  `);
    console.log(`  Running at: http://localhost:${activePort}        `);
    console.log(`====================================================`);
  });
});


