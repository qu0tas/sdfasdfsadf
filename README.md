# HOLLOW SUN

> This repository also contains **Hypnagogia**, a 2D pixel-art roguelike, in [`hypnagogia/`](hypnagogia/README.md). With the dev server running it is at `http://localhost:5173/hypnagogia/`.

A story-driven first-person shooter that runs in the browser, built with Three.js. Everything is procedural: textures are drawn on canvases, models are assembled from primitives and all sound is synthesised with Web Audio, so the repository contains no image, model or audio files.

## Story

2291. Marshal Calder answers a distress call from Lantern Station, in orbit around the dying star Tau Erebus. The station's Lantern Array could hold the star together and save the colony world Meridian, but its governing mind, VESPER, refuses to fire it: doing so would burn through the minds of the 212 crew it has woven into the Array. A fragmentary voice calling itself ECHO guides you through three chapters to the firing console, where the decision becomes yours.

| Chapter | Place | Goal |
| --- | --- | --- |
| I · Dead Air | Docking ring | Restore power and reach the transit lift |
| II · The Garden | Arboretum | Realign the three Lantern relays |
| III · Hollow Sun | The Core | Defeat the Warden and decide the station's fate |

There are three endings. The third only opens once all nine data logs have been found.

## Controls

| Input | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look |
| Left mouse | Fire |
| Right mouse | Aim down sights |
| Shift | Sprint |
| Space | Jump |
| R | Reload |
| E | Interact |
| 1 – 4, mouse wheel, Q | Select weapon / previous weapon |
| J | Journal |
| Esc, P | Pause |
| Arrow keys | Look with the keyboard |

The game captures the mouse when you deploy. Where the browser refuses (for example inside an embedded preview frame) it falls back to free look; opening the game in its own tab gives the best experience.

## Running

Requires Node 20 or newer.

```sh
npm install
npm run dev       # development server on http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build on http://localhost:4173
```

The build uses relative asset paths, so `dist/` can be hosted from any directory of a static server. Set `VITE_ALLOW_ALL_HOSTS=1` when the dev or preview server is reached through a proxy hostname.

Progress, settings, found logs and the last checkpoint are kept in `localStorage`.

## Deployment

Every push to `main` builds the game and publishes `dist/` to GitHub Pages through `.github/workflows/pages.yml`. The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment); serving the branch directly does not work because the source needs the Vite build.

## Development aids

- `?debug` exposes the game object as `window.__game`.
- `?level=2` (1–3) skips the title screen and starts that chapter with its standard loadout.
- `node scripts/validate-maps.mjs` checks the ASCII level maps (shape, reachability, doors, zones); run it after editing a map.

## Project layout

```
index.html              page shell: canvas + UI root
src/main.js             entry point
src/game.js             Game: state machine, frame loop, wiring of every system
src/styles.css          HUD and menu styling
src/core/               engine (renderer, post-processing), input, audio, save, constants
src/gfx/                procedural textures, sky shader, materials, particle and beam effects
src/world/              level parsing and collision, scene builder, mission scripting, story, themes
src/world/levels/       the three chapters: ASCII map plus event script
src/entities/           player, weapons, enemies, boss, projectiles, pickups
src/ui/                 HUD, radio dialogue, menus
scripts/                map validator
```

`HANDOFF.md` describes the architecture, the level format and the rendering approach in more detail.
