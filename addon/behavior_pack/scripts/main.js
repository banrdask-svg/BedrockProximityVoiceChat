import { system, world } from "@minecraft/server";
import { voiceConfig } from "./config.js";
import { postPlayers } from "./httpClient.js";
import { getPlayerSnapshot } from "./playerSnapshot.js";
import { setConnectedPlayers, updateNameTags } from "./nameTags.js";
import { updateStatusDisplay } from "./statusDisplay.js";
import { registerVoiceCommands } from "./commands.js";

let lastErrorLogTick = -1200;
let syncInProgress = false;

function logThrottled(message) {
  const tick = system.currentTick;
  if (tick - lastErrorLogTick >= 1200) {
    lastErrorLogTick = tick;
    console.warn(`[ProximityVoice] ${message}`);
  }
}

async function syncVoiceState() {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  const players = getPlayerSnapshot();

  if (players.length === 0) {
    setConnectedPlayers([]);
    syncInProgress = false;
    return;
  }

  try {
    // Bedrock scripts cannot host browser voice; this HTTP bridge sends only positions.
    const result = await postPlayers(players);
    if (!result.ok || !Array.isArray(result.connected)) {
      throw new Error("Voice site returned an invalid response.");
    }
    setConnectedPlayers(result.connected);
  } catch (error) {
    setConnectedPlayers([]);
    logThrottled(error.message);
  } finally {
    updateNameTags();
    syncInProgress = false;
  }
}

world.afterEvents.playerSpawn.subscribe(event => {
  if (event.initialSpawn) {
    event.player.sendMessage(`\u00a77Proximity voice site: ${voiceConfig.siteApiUrl}`);
    event.player.sendMessage("\u00a77Use /voice:voice site or !voice site to show voice chat info.");
  }
});

registerVoiceCommands();

system.runInterval(() => {
  syncVoiceState();
}, voiceConfig.updateIntervalTicks);

system.runInterval(() => {
  updateStatusDisplay();
}, voiceConfig.statusMessageIntervalTicks);
