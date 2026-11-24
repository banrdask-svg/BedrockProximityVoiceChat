const disabledStatusPlayers = new Set();

export function setVoiceStatusEnabled(playerName, enabled) {
  if (enabled) {
    disabledStatusPlayers.delete(playerName);
    return;
  }

  disabledStatusPlayers.add(playerName);
}

export function isVoiceStatusEnabled(playerName) {
  return !disabledStatusPlayers.has(playerName);
}
