"use strict";

const form = document.querySelector("#joinForm");
const nickInput = document.querySelector("#nick");
const statusEl = document.querySelector("#status");
const peersEl = document.querySelector("#peers");
const radiusEl = document.querySelector("#radius");
const muteButton = document.querySelector("#muteButton");

let socket;
let localStream;
let nick = "";
let muted = true;
let iceServers = [];
const peerConnections = new Map();

function setStatus(text) {
  statusEl.textContent = text;
}

function setMuted(nextMuted) {
  muted = nextMuted;
  if (localStream) {
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }
  muteButton.textContent = muted ? "Микрофон: выкл" : "Микрофон: вкл";
}

async function ensureMicrophone() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });
  setMuted(false);
  return localStream;
}

function send(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function closePeer(peerNick) {
  const entry = peerConnections.get(peerNick);
  if (!entry) return;
  entry.pc.close();
  if (entry.audio) entry.audio.remove();
  peerConnections.delete(peerNick);
}

function createPeer(peerNick, polite) {
  const existing = peerConnections.get(peerNick);
  if (existing) return existing;

  const pc = new RTCPeerConnection({ iceServers });
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.dataset.peer = peerNick;
  document.body.appendChild(audio);

  pc.ontrack = event => {
    audio.srcObject = event.streams[0];
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      send({ type: "ice", to: peerNick, payload: event.candidate });
    }
  };

  pc.onnegotiationneeded = async () => {
    if (!polite) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "offer", to: peerNick, payload: pc.localDescription });
    } catch (error) {
      console.error("Negotiation failed:", error);
    }
  };

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  const entry = { pc, audio, polite };
  peerConnections.set(peerNick, entry);
  return entry;
}

async function syncPeers(allowedPeers) {
  const allowed = new Set(allowedPeers);

  for (const peerNick of [...peerConnections.keys()]) {
    if (!allowed.has(peerNick)) {
      closePeer(peerNick);
    }
  }

  for (const peerNick of allowed) {
    const polite = nick.localeCompare(peerNick) < 0;
    createPeer(peerNick, polite);
  }

  peersEl.innerHTML = "";
  if (allowed.size === 0) {
    const li = document.createElement("li");
    li.textContent = "Рядом нет подключенных игроков";
    peersEl.appendChild(li);
    return;
  }

  for (const peerNick of allowed) {
    const li = document.createElement("li");
    li.textContent = peerNick;
    peersEl.appendChild(li);
  }
}

async function handleSignal(message) {
  const from = message.from;
  const entry = createPeer(from, false);
  const pc = entry.pc;

  try {
    if (message.type === "offer") {
      await pc.setRemoteDescription(message.payload);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", to: from, payload: pc.localDescription });
      return;
    }

    if (message.type === "answer") {
      await pc.setRemoteDescription(message.payload);
      return;
    }

    if (message.type === "ice" && message.payload) {
      await pc.addIceCandidate(message.payload);
    }
  } catch (error) {
    console.error("Signal handling failed:", error);
  }
}

async function connect(nextNick) {
  nick = nextNick.trim();
  await ensureMicrophone();

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/ws`);

  socket.addEventListener("open", () => {
    send({ type: "join", nick });
    setStatus("Подключение к серверу...");
  });

  socket.addEventListener("message", async event => {
    const message = JSON.parse(event.data);

    if (message.type === "joined") {
      iceServers = message.iceServers || [];
      radiusEl.textContent = `Радиус: ${message.hearingRadius} блоков`;
      muteButton.disabled = false;
      setStatus(`Подключено как ${message.nick}`);
      return;
    }

    if (message.type === "peers") {
      radiusEl.textContent = `Радиус: ${message.radius} блоков`;
      setStatus(message.inGame ? `В игре: ${message.nick}` : "Сайт подключен, но игрок не найден на сервере");
      await syncPeers(message.peers || []);
      return;
    }

    if (["offer", "answer", "ice"].includes(message.type)) {
      await handleSignal(message);
      return;
    }

    if (message.type === "peer-blocked") {
      closePeer(message.peer);
      return;
    }

    if (message.type === "error") {
      setStatus(message.error);
    }
  });

  socket.addEventListener("close", () => {
    setStatus("Соединение закрыто");
    muteButton.disabled = true;
    for (const peerNick of [...peerConnections.keys()]) {
      closePeer(peerNick);
    }
  });

  socket.addEventListener("error", () => {
    setStatus("Ошибка WebSocket-соединения");
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  connect(nickInput.value).catch(error => {
    console.error(error);
    setStatus(error.message);
  });
});

muteButton.addEventListener("click", () => setMuted(!muted));
