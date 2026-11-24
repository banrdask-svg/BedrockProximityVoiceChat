# Proximity Voice Bridge Addon

Behavior pack for Minecraft Bedrock 1.26.3.

## Files

- `behavior_pack/manifest.json` - pack manifest with Script API dependencies.
- `behavior_pack/scripts/config.js` - site URL, API secret and name tag prefixes.
- `behavior_pack/scripts/main.js` - scheduler that sends player positions to the site.
- `behavior_pack/scripts/httpClient.js` - HTTP bridge to the external site.
- `behavior_pack/scripts/playerSnapshot.js` - player coordinate collection.
- `behavior_pack/scripts/nameTags.js` - connected/disconnected name tag display.
- `behavior_pack/scripts/statusDisplay.js` - actionbar connection status.
- `build.bat` - Windows build script.
- `build.ps1` - packaging helper used by `build.bat`.

## Build

Run:

```bat
build.bat
```

Output files:

- `dist/ProximityVoiceBridgeBP.mcpack`
- `dist/ProximityVoiceBridge.mcaddon`

## Bedrock limitations

Minecraft Bedrock Script API does not provide a normal WebSocket client for scripts. This pack therefore uses `@minecraft/server-net` HTTP requests to send coordinates to the Node.js site. The site still uses WebSocket and WebRTC for browser voice chat.

Real item icons cannot be placed next to a player name tag from script in a reliable vanilla way. The pack uses colored text prefixes by default:

- connected: `§a[EMERALD]§r`
- disconnected: `§c[BARRIER]§r`

The default pack now uses compact text symbols:

- connected: `§a[◆]§r`
- disconnected: `§c[⊘]§r`

To use exact item icons, add a resource pack with custom font glyphs and replace `connectedPrefix` and `disconnectedPrefix` in `scripts/config.js`.

## Required experimental settings

Enable experiments for the world/server:

- Beta APIs / Script API.
- Server Net / HTTP requests for scripts, if exposed by your Bedrock server build.
- Any other experimental toggles required by your Minecraft Bedrock 1.26.3 preview/server build.

On Bedrock Dedicated Server, external HTTP access may also require server configuration that allows `@minecraft/server-net`.
