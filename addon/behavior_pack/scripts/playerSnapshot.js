import { world } from "@minecraft/server";

export function getPlayerSnapshot() {
  return world.getAllPlayers().map(player => ({
    nick: player.name,
    x: Number(player.location.x.toFixed(2)),
    y: Number(player.location.y.toFixed(2)),
    z: Number(player.location.z.toFixed(2)),
    dimension: player.dimension.id
  }));
}
