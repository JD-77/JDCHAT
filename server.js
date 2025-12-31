const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Serve static HTML + WebSocket
const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  
  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

const clients = new Map();

let clientId = 0;

wss.on('connection', (ws) => {
  const id = ++clientId;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'username') {
        clients.set(ws, { name: data.username, id });
        broadcastUserCount();
        return;
      }
      
      if (data.type === 'typing') {
        const clientData = clients.get(ws);
        if (clientData) {
          const typingData = {
            type: 'typing',
            isTyping: data.isTyping,
            username: clientData.name
          };
          broadcast(JSON.stringify(typingData), ws);
        }
        return;
      }
      
      const clientData = clients.get(ws);
      if (clientData) {
        const chatMsg = {
          type: 'message',
          username: clientData.name,
          text: data.text,
          timestamp: new Date().toISOString()
        };
        broadcast(JSON.stringify(chatMsg));
      }
    } catch (e) {
      console.log('Invalid message');
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastUserCount();
  });
});

function broadcast(message, excludeWs = null) {
  for (const [client, data] of clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(message);
    }
  }
}

function broadcastUserCount() {
  const count = clients.size;
  broadcast(JSON.stringify({ type: 'userCount', count }));
}

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT}`);
});
