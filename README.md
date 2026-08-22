# 🌾 Inaka Life — 田舎暮らし

A cozy pixel-art Japanese countryside life sim that runs entirely in your browser.
No build step, no dependencies, no assets — every sprite, sound, and song is
generated procedurally in code.

## Run it

**Double-click `index.html`** — that's it. (Or serve the folder with any static
server: `python -m http.server`. A zero-dependency `node server.js` also works.)

### Live

[Inaka Life Production](https://railway.app)


Desktop + keyboard. Chrome/Edge/Firefox. Progress autosaves to `localStorage`
(sleeps, every ~3 minutes, and on tab close).

## Controls

| Key | Action |
|---|---|
| `WASD` / arrows | walk (`Shift` to hurry) |
| `E` / `Enter` | talk · pet · harvest · pick up · ring bells · soak · sleep |
| `1`–`3` | pick a dialog choice from the keyboard |
| `SPACE` | use current tool (hold to keep farming) |
| `1`–`6` | hands · hoe · watering can · seeds · net · fishing rod |
| `Q` | switch seed type |
| `I` | pocket (eat food, admire loot) |
| `J` | journal — today, friends, your farm log |
| `TAB` | toggle the village map |
| `M` | mute music |
| `H` | help |
| `Esc` | cancel fishing / close panels |

## Getting started

A green **✿ First Steps** card walks you through your first day: check the
mailbox, till a few plots in your field, plant, water, sleep. Floating **E**
bubbles show what you can interact with; crops sparkle when ready 💧 and show
a droplet when thirsty. The **map** (`TAB`) marks home, the shop, shrine,
onsen and station. Entering an area pops up its name.

## What's in the village

- **Your field** (south of the river, past the bridge): till → plant → water
  daily → harvest. Rice/daikon/eggplant/cucumber regrow or replant; strawberries
  are an autumn treat. Rain waters for you. Nothing grows in winter.
- **Granny's shop** (open 9:00–18:00): seeds, snacks, tool upgrades — and she
  buys everything you grow, catch, and forage.
- **Fishing**: river for yamame, the hidden pond in the bamboo grove for koi,
  summer nights for eel. Watch for the `!`
- **Bugs**: butterflies by the flowers, cicadas on summer trees, fireflies on
  summer nights by the water, beetles in the bamboo.
- **Shrine** (northeast): ring the bell between **4:30–7:00** for a dawn
  blessing (+25% sell prices that day). Offer ¥100 for energy.
- **Hot spring** (southeast): free full-energy soak. Capy-san lives there.
- **Naps**: once a day, your bed restores +35 energy (costs 3 hours).
- **Mailbox** (by your door): quest letters each morning.
- **Vending machine** by the station: snacks + a 4% golden cat charm capsule.
- **Festivals**: hanami (Spring 5), fireworks (Summer 12), harvest moon
  (Autumn 19), snow lanterns (Winter 26). 28-day year, 7 days per season.
- **The train** crosses three times a day. It comes when it feels like it.

## Villagers (gift their favorites ♡)

- **Granny** — rice, eggplant, strawberry. Max hearts → ¥1000 "for socks".
- **Grandpa** — fish & canned coffee. Max hearts → his golden fishing rod.
- **Yuki** — bugs, ramune, taiyaki. Max hearts → her golden cat charm.
- **Mame the shiba**, three cats, chickens (eggs spawn each morning), and a
  tanuki who freezes like a statue if you get close at night.

## Debug (optional)

`index.html?debug` skips the title screen. In the console:
`G.teleport(x,y)`, `G.coins(n)`, `G.time(h,m)`, `G.day(n)`, `G.weather('rain'|'snow'|'clear')`.

## Files

```
index.html      DOM shell + UI overlay
style.css       pixel UI styling
js/sprites.js   sprite engine + terrain/trees/buildings
js/sprites2.js  characters, animals, items, icons
js/audio.js     generative koto soundtrack + SFX + ambience (WebAudio)
js/world.js     map generation (village, river, shrine, farm, onsen)
js/entities.js  NPCs, animals, critters, particles, game data
js/game.js      main loop, rendering, lighting, systems, UI, saving
```
