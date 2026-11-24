import { world } from "@minecraft/server";
import { voiceConfig } from "./config.js";

let connectedPlayers = new Set();

export function setConnectedPlayers(nicks) {
  connectedPlayers = new Set(nicks);
}

export function isVoiceConnected(nick) {
  return connectedPlayers.has(nick);
}

export function updateNameTags() {
  for (const player of world.getAllPlayers()) {
    // Vanilla name tags cannot display real item icons reliably, so prefixes are configurable text.
    const prefix = connectedPlayers.has(player.name)
      ? voiceConfig.connectedPrefix
      : voiceConfig.disconnectedPrefix;
    player.nameTag = `${prefix}${player.name}`;
  }
}
