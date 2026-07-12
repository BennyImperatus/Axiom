import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to read the Discord Webhook URL dynamically from environment or .env file
function getDiscordWebhookUrl() {
  // 1. Check system environment variable first (typically set in production)
  if (process.env.DISCORD_WEBHOOK_URL && !process.env.DISCORD_WEBHOOK_URL.includes('placeholder')) {
    return process.env.DISCORD_WEBHOOK_URL;
  }

  // 2. Read dynamically from the local .env file (to allow updates without restarting the node server)
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalsIdx = trimmed.indexOf('=');
          if (equalsIdx !== -1) {
            const key = trimmed.substring(0, equalsIdx).trim();
            const val = trimmed.substring(equalsIdx + 1).trim();
            if (key === 'DISCORD_WEBHOOK_URL') {
              const cleanVal = val.replace(/^["']|["']$/g, '');
              if (cleanVal && !cleanVal.includes('placeholder')) {
                return cleanVal;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Backend Error] Failed to read .env file dynamically:', err);
    }
  }
  return null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Route API requests
  if (url.pathname === '/api/contact' && method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { name, email, studio, discord, message } = data;

        // Form Validation
        if (!name || !email || !studio || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'All fields except Discord username are required.' }));
          return;
        }

        // Load the webhook URL dynamically
        const activeWebhookUrl = getDiscordWebhookUrl();
        
        if (!activeWebhookUrl) {
          console.error('[Backend Error] Contact form submitted, but Discord Webhook URL is not configured.');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'Server configuration error. Contact form submission is temporarily unavailable because the Discord Webhook URL is not configured. Please paste your Discord Webhook URL into the .env file.' 
          }));
          return;
        }

        // Send to Discord Webhook
        const currentDateTime = new Date().toISOString();
        const embedPayload = {
          embeds: [
            {
              title: 'New Game Management Lead',
              description: 'A prospective studio has submitted a contact request through the ApexOps website.',
              color: 8854271, // Decimal color for #871BFF (Neon Blue-Purple)
              fields: [
                {
                  name: '👤 Full Name',
                  value: name,
                  inline: true
                },
                {
                  name: '📧 Email Address',
                  value: email,
                  inline: true
                },
                {
                  name: '🎮 Company / Studio',
                  value: studio,
                  inline: true
                },
                {
                  name: '💬 Discord Username',
                  value: discord || 'Not Provided',
                  inline: true
                },
                {
                  name: '📝 Message',
                  value: message
                }
              ],
              footer: {
                text: 'Apex Ops Site Leads'
              },
              timestamp: currentDateTime
            }
          ]
        };

        const response = await fetch(activeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(embedPayload)
        });

        if (response.ok) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Your message has been sent successfully!' }));
        } else {
          const errText = await response.text();
          console.error(`[Webhook Error] Discord returned status ${response.status}: ${errText}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to deliver message to Discord Webhook. Check if the webhook URL is valid.' }));
        }
      } catch (error) {
        console.error('[Server Error] Exception during contact submission:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal server error occurred.' }));
      }
    });
    return;
  }

  // Serve generated logo from the brain directory dynamically
  if (url.pathname === '/logo.jpg') {
    const logoPath = 'C:\\Users\\mrhau\\.gemini\\antigravity\\brain\\9ef571ae-d102-486e-866f-80aec7d80f10\\apexops_logo_1783756850062.jpg';
    if (fs.existsSync(logoPath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      const stream = fs.createReadStream(logoPath);
      stream.on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      });
      stream.pipe(res);
      return;
    }
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  
  // Basic security check to prevent directory traversal
  const relative = path.relative(path.join(__dirname, 'public'), filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  
  if (!isSafe && url.pathname !== '/') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (!path.extname(filePath)) {
        filePath = path.join(__dirname, 'public', 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Serve file
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    });
    stream.pipe(res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server Ready] ApexOps running at http://localhost:${PORT}`);
  console.log(`[Dyn Webhook] Server will read DISCORD_WEBHOOK_URL dynamically from environment or local .env file.`);
});
