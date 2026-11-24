# Minecraft Bedrock Proximity Voice Chat

Проект состоит из двух частей:

- `site` - Node.js сайт, WebSocket-сервер и WebRTC-сигналинг для голосового чата.
- `addon` - behavior pack для Minecraft Bedrock 1.26.3, который отправляет координаты игроков на сайт.

Радиус слышимости по умолчанию: **25 блоков**.

## Как работает

1. Игрок открывает сайт и вводит свой ник Minecraft.
2. Аддон на сервере Minecraft отправляет на сайт координаты игроков.
3. Сайт сравнивает координаты игроков в одной dimension.
4. Если игроки находятся в радиусе слышимости, сайт разрешает WebRTC-соединение между их браузерами.
5. Если игроки расходятся дальше радиуса, сайт закрывает пару и звук перестает передаваться.

Голос не проходит через Minecraft. Minecraft только сообщает координаты и получает список игроков, подключенных к сайту.

## Запуск сайта

Требуется Node.js 18 или новее.

Windows:

```bat
cd site
start.bat
```

Linux/macOS:

```sh
cd site
chmod +x start.sh
./start.sh
```

После запуска откройте:

```text
http://localhost:3000
```

Для игроков с других устройств используйте IP компьютера, где запущен сайт, например:

```text
http://192.168.1.10:3000
```

## Настройка сайта

Файл: `site/config.json`

```json
{
  "host": "0.0.0.0",
  "port": 3000,
  "hearingRadius": 25,
  "apiSecret": "change-me"
}
```

- `host` - адрес прослушивания сайта.
- `port` - порт сайта.
- `hearingRadius` - радиус слышимости в блоках.
- `apiSecret` - простой секрет между аддоном и сайтом. Такое же значение должно быть в `addon/behavior_pack/scripts/config.js`.

После изменения конфига перезапустите сайт.

## Установка аддона

### Сборка

Windows:

```bat
build.bat
```

Или из папки аддона:

```bat
cd addon
build.bat
```

Готовые файлы появятся в `addon/dist`:

- `ProximityVoiceBridgeBP.mcpack` - только behavior pack.
- `ProximityVoiceBridge.mcaddon` - архив аддона для импорта.

### Установка

1. Соберите аддон через `build.bat` или скопируйте папку `addon/behavior_pack` вручную.
2. Для одиночного мира откройте `.mcpack` или `.mcaddon`, затем подключите pack в настройках мира.
3. Для Bedrock Dedicated Server скопируйте `addon/behavior_pack` в папку `behavior_packs`.
4. Подключите behavior pack к миру.
5. Включите экспериментальные возможности:
   - Beta APIs / Script API.
   - Server Net / HTTP requests for scripts, если этот переключатель есть в вашей версии.
   - Остальные экспериментальные переключатели, которые требуются вашей сборке Minecraft Bedrock 1.26.3.
6. Перезапустите мир или сервер.

Для Bedrock Dedicated Server обычно используется папка:

```text
behavior_packs/ProximityVoiceBridgeBP
```

Содержимое `addon/behavior_pack` можно скопировать в эту папку.

## Настройка IP/порта сайта в аддоне

Файл: `addon/behavior_pack/scripts/config.js`

```js
export const voiceConfig = {
  siteApiUrl: "http://127.0.0.1:3000",
  apiSecret: "change-me",
  updateIntervalTicks: 20
};
```

Если Minecraft-сервер и сайт запущены на разных машинах, замените `127.0.0.1` на IP сайта:

```js
siteApiUrl: "http://192.168.1.10:3000"
```

`apiSecret` должен совпадать с `site/config.json`.

## Подключение к голосовому чату

1. Игрок заходит на Minecraft-сервер.
2. Игрок открывает сайт голосового чата.
3. Игрок вводит точно такой же ник, как в Minecraft.
4. Браузер попросит доступ к микрофону.
5. Если рядом есть другой подключенный игрок, он появится в списке слышимости.

## Индикатор рядом с ником

Аддон меняет `nameTag` игрока:

- подключен к сайту: зеленый `[◆]`
- не подключен к сайту: красный `[⊘]`

Также аддон периодически показывает actionbar-статус: подключен ли игрок к voice-сайту и какой адрес сайта указан в конфиге.

Ограничение: Script API не может надежно вставить настоящую иконку предмета в vanilla name tag. Для настоящих иконок нужен resource pack с кастомными glyph-символами. Текстовые префиксы можно поменять в `addon/behavior_pack/scripts/config.js`.

## Важные ограничения Bedrock API

Bedrock Script API обычно не умеет открывать WebSocket-соединение из аддона. Поэтому:

- сайт использует WebSocket для браузеров;
- сайт использует WebRTC для передачи голоса;
- аддон использует HTTP POST через `@minecraft/server-net`, чтобы отправлять координаты игроков.

Если ваша сборка Bedrock не поддерживает `@minecraft/server-net` или запрещает HTTP-запросы из скриптов, обходной вариант такой:

1. Запускать Bedrock Dedicated Server с включенным Server Net.
2. Использовать внешний bridge-процесс, который читает координаты через доступный серверный API/лог/плагин и отправляет их в `POST /api/players`.
3. Оставить сайт без изменений, потому что его API уже готов принимать координаты.

## API сайта

Аддон отправляет координаты:

```http
POST /api/players
X-Voice-Secret: change-me
Content-Type: application/json
```

```json
{
  "players": [
    {
      "nick": "Steve",
      "x": 10,
      "y": 64,
      "z": 20,
      "dimension": "minecraft:overworld"
    }
  ]
}
```

Ответ:

```json
{
  "ok": true,
  "connected": ["Steve"],
  "radius": 25
}
```

## Проверка

1. Запустите сайт.
2. Откройте две вкладки браузера с разными никами.
3. Отправьте тестовые координаты через curl или PowerShell.
4. Если координаты рядом, вкладки увидят друг друга в списке и установят WebRTC-соединение.

PowerShell пример:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:3000/api/players" `
  -Method Post `
  -Headers @{ "X-Voice-Secret" = "change-me" } `
  -ContentType "application/json" `
  -Body '{"players":[{"nick":"Steve","x":0,"y":64,"z":0,"dimension":"minecraft:overworld"},{"nick":"Alex","x":5,"y":64,"z":0,"dimension":"minecraft:overworld"}]}'
```

## Доступ к микрофону извне

Для подключения игроков через интернет используйте HTTPS и WSS: обычный HTTP по сетевому IP браузер может запретить для микрофона. localhost подходит для локальной проверки. Для сложных NAT может потребоваться TURN-сервер. Доступность server-net зависит от Bedrock Dedicated Server; работа в обычном одиночном мире не гарантируется. Замените change-me одинаковым секретом в конфигурациях сайта и аддона перед открытием сервиса наружу.

Версия сайта: 1.0.1. Версия behavior pack: 1.0.0.
