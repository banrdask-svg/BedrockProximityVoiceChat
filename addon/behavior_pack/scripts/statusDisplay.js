import { world } from "@minecraft/server";
import { voiceConfig } from "./config.js";
import { isVoiceConnected } from "./nameTags.js";
import { isVoiceStatusEnabled } from "./voiceState.js";

export function updateStatusDisplay() {
  for (const player of world.getAllPlayers()) {
    if (!isVoiceStatusEnabled(player.name)) {
      continue;
    }

    const message = isVoiceConnected(player.name)
      ? `\u00a7aVoice chat connected\u00a7r | ${voiceConfig.siteApiUrl}`
      : `\u00a7cVoice chat not connected\u00a7r | Open ${voiceConfig.siteApiUrl} and enter ${player.name}`;

    player.onScreenDisplay.setActionBar(message);
  }
}
