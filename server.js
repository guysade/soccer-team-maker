const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'soccer-data.json');
const PORT = 3001;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return null;
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // GET /data - Load data
  if (req.method === 'GET' && req.url === '/data') {
    const data = loadData();
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, data }));
    return;
  }

  // POST /data - Save data
  if (req.method === 'POST' && req.url === '/data') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const success = saveData(data);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success }));
      } catch (error) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // 404
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Soccer Team Maker - Data Server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
