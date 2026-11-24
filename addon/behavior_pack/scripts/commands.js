import * as mc from "@minecraft/server";
import { voiceConfig } from "./config.js";
import { setVoiceStatusEnabled } from "./voiceState.js";

const { system, world } = mc;

function sendHelp(player) {
  player.sendMessage(`\u00a7aVoice site:\u00a7r ${voiceConfig.siteApiUrl}`);
  player.sendMessage("\u00a77Commands: /voice:voice on, /voice:voice off, /voice:voice site");
  player.sendMessage("\u00a77Fallback chat commands: !voice on, !voice off, !voice site");
}

function applyVoiceCommand(player, mode) {
  const value = String(mode || "site").toLowerCase();

  if (value === "on") {
    setVoiceStatusEnabled(player.name, true);
    player.sendMessage(`\u00a7aVoice reminders enabled.\u00a7r Site: ${voiceConfig.siteApiUrl}`);
    return;
  }

  if (value === "off") {
    setVoiceStatusEnabled(player.name, false);
    player.onScreenDisplay.setActionBar("");
    player.sendMessage("\u00a7cVoice reminders disabled.\u00a7r Use /voice:voice on to enable them again.");
    return;
  }

  sendHelp(player);
}

function getCommandPlayer(origin) {
  const source = origin && (origin.sourceEntity || origin.source);
  if (source && source.typeId === "minecraft:player") {
    return source;
  }
  return undefined;
}

export function registerVoiceCommands() {
  if (system.beforeEvents && system.beforeEvents.startup) {
    system.beforeEvents.startup.subscribe(event => {
      const registry = event.customCommandRegistry;
      const paramType = mc.CustomCommandParamType;
      const permissionLevel = mc.CustomCommandPermissionLevel;

      if (!registry || !paramType || !permissionLevel) {
        console.warn("[ProximityVoice] Custom slash commands are not available. Use !voice on/off/site in chat.");
        return;
      }

      registry.registerEnum("voice:mode", ["on", "off", "site"]);
      registry.registerCommand(
        {
          name: "voice:voice",
          description: "Show or toggle the proximity voice chat site reminder.",
          permissionLevel: permissionLevel.Any,
          optionalParameters: [{ type: paramType.Enum, name: "voice:mode" }]
        },
        (origin, mode) => {
          const player = getCommandPlayer(origin);
          if (!player) {
            return;
          }

          system.run(() => applyVoiceCommand(player, mode));
        }
      );
    });
  }

  world.beforeEvents.chatSend.subscribe(event => {
    const message = event.message.trim();
    if (!message.toLowerCase().startsWith("!voice")) {
      return;
    }

    event.cancel = true;
    const [, mode] = message.split(/\s+/, 2);
    system.run(() => applyVoiceCommand(event.sender, mode));
  });
}
