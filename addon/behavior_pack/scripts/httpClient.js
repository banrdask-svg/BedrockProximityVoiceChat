import { HttpHeader, HttpRequest, HttpRequestMethod, http } from "@minecraft/server-net";
import { voiceConfig } from "./config.js";

export async function postPlayers(players) {
  const request = new HttpRequest(`${voiceConfig.siteApiUrl}/api/players`);
  request.method = HttpRequestMethod.Post;
  request.headers = [
    new HttpHeader("Content-Type", "application/json"),
    new HttpHeader("X-Voice-Secret", voiceConfig.apiSecret)
  ];
  request.body = JSON.stringify({
    sentAt: Date.now(),
    players
  });

  const response = await http.request(request);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Voice site returned HTTP ${response.status}: ${response.body}`);
  }

  return JSON.parse(response.body);
}
