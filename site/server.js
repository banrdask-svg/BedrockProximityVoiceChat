"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { WebSocketServer } = require("ws");

const configPath = path.join(__dirname, "config.json");
const publicDir = path.join(__dirname, "public");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const voiceClients = new Map();
const gamePlayers = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function normalizeNick(value) {
  return String(value || "").trim().slice(0, 32);
}

function publicPlayer(player) {
  return {
    nick: player.nick,
    x: player.x,
    y: player.y,
    z: player.z,
    dimension: player.dimension,
    lastSeen: player.lastSeen,
    voiceConnected: voiceClients.has(player.nick)
  };
}

function distance(a, b) {
  if (!a || !b || a.dimension !== b.dimension) return Number.POSITIVE_INFINITY;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isAllowedPeer(aNick, bNick) {
  const a = gamePlayers.get(aNick);
  const b = gamePlayers.get(bNick);
  // Voice pairs are allowed only while both players are in game and close enough.
  return Boolean(a && b && distance(a, b) <= config.hearingRadius);
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastProximity() {
  const now = Date.now();

  for (const [nick, player] of gamePlayers) {
    if (now - player.lastSeen > config.stalePlayerMs) {
      gamePlayers.delete(nick);
    }
  }

  for (const [nick, ws] of voiceClients) {
    const player = gamePlayers.get(nick);
    const peers = [];

    if (player) {
      for (const [peerNick] of voiceClients) {
        if (peerNick !== nick && isAllowedPeer(nick, peerNick)) {
          peers.push(peerNick);
        }
      }
    }

    sendJson(ws, {
      type: "peers",
      nick,
      radius: config.hearingRadius,
      inGame: Boolean(player),
      peers
    });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendResponse(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json)
  });
  res.end(json);
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/config") {
    sendResponse(res, 200, {
      hearingRadius: config.hearingRadius,
      iceServers: config.iceServers
    });
    return;
  }

  if (req.method === "GET" && req.url === "/api/status") {
    sendResponse(res, 200, {
      ok: true,
      voiceConnected: [...voiceClients.keys()],
      players: [...gamePlayers.values()].map(publicPlayer)
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/players") {
    const secret = req.headers["x-voice-secret"];
    if (config.apiSecret && secret !== config.apiSecret) {
      sendResponse(res, 401, { ok: false, error: "Invalid API secret." });
      return;
    }

    try {
      const body = JSON.parse(await readBody(req));
      const players = Array.isArray(body.players) ? body.players : [];
      const now = Date.now();

      for (const item of players) {
        const nick = normalizeNick(item.nick);
        if (!nick) continue;
        gamePlayers.set(nick, {
          nick,
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          z: Number(item.z) || 0,
          dimension: String(item.dimension || "minecraft:overworld"),
          lastSeen: now
        });
      }

      const connected = players
        .map(item => normalizeNick(item.nick))
        .filter(nick => nick && voiceClients.has(nick));

      broadcastProximity();
      sendResponse(res, 200, {
        ok: true,
        connected,
        radius: config.hearingRadius
      });
    } catch (error) {
      sendResponse(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  sendResponse(res, 404, { ok: false, error: "Not found." });
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch(error => sendResponse(res, 500, { ok: false, error: error.message }));
    return;
  }
  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", ws => {
  ws.nick = "";

  ws.on("message", raw => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendJson(ws, { type: "error", error: "Invalid JSON message." });
      return;
    }

    if (message.type === "join") {
      const nick = normalizeNick(message.nick);
      if (!nick) {
        sendJson(ws, { type: "error", error: "Enter your Minecraft nickname." });
        return;
      }
      if (voiceClients.has(nick) && voiceClients.get(nick) !== ws) {
        sendJson(ws, { type: "error", error: "This nickname is already connected." });
        return;
      }

      if (ws.nick && voiceClients.get(ws.nick) === ws) {
        voiceClients.delete(ws.nick);
      }

      ws.nick = nick;
      voiceClients.set(nick, ws);
      sendJson(ws, {
        type: "joined",
        nick,
        hearingRadius: config.hearingRadius,
        iceServers: config.iceServers
      });
      broadcastProximity();
      return;
    }

    if (["offer", "answer", "ice"].includes(message.type)) {
      const from = ws.nick;
      const to = normalizeNick(message.to);
      const target = voiceClients.get(to);

      if (!from || !target) return;
      if (!isAllowedPeer(from, to)) {
        sendJson(ws, { type: "peer-blocked", peer: to });
        return;
      }

      // The server only relays WebRTC signaling for currently allowed proximity pairs.
      sendJson(target, {
        type: message.type,
        from,
        payload: message.payload
      });
      return;
    }

    sendJson(ws, { type: "error", error: `Unsupported message type: ${message.type}` });
  });

  ws.on("close", () => {
    if (ws.nick && voiceClients.get(ws.nick) === ws) {
      voiceClients.delete(ws.nick);
      broadcastProximity();
    }
  });

  ws.on("error", error => {
    console.error("WebSocket error:", error.message);
  });
});

setInterval(broadcastProximity, config.proximityUpdateMs);

function getLanUrls() {
  const urls = [`http://127.0.0.1:${config.port}`];
  const interfaces = os.networkInterfaces();

  for (const items of Object.values(interfaces)) {
    for (const item of items || []) {
      if (item.family === "IPv4" && !item.internal) {
        urls.push(`http://${item.address}:${config.port}`);
      }
    }
  }

  return urls;
}

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Change "port" in site/config.json or stop the other server.`);
    process.exit(1);
  }
  console.error("Failed to start voice site:", error.message);
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  console.log("Voice site is running.");
  console.log("Open one of these URLs:");
  for (const url of getLanUrls()) {
    console.log(` - ${url}`);
  }
  console.log(`Hearing radius: ${config.hearingRadius} blocks`);
});
