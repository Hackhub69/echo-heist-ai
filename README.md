# Echo Heist AI

**Every mistake leaves an Echo.** Echo Heist AI is an original, browser-based cyberpunk stealth game built for a fast game-jam submission. Infiltrate the Aurora Vault, steal the Quantum Core, and reach extraction before the 30-second timeline collapses.

## Play it locally

Prerequisite: current Node.js LTS (Node 20+ recommended).

```powershell
npm install
npm run dev
```

Open the local address printed in the terminal (normally `http://localhost:5173`).

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| `Shift` | Sprint — faster, but creates more route heat |
| `R` | Manually rewind and store the current path as an Echo |
| `P` | Pause / resume |
| `M` | Mute / unmute synth audio |
| `Enter` | Start from the title screen or replay from results |

Mouse/touch can select the main menu and result buttons.

## How the game works

1. Begin at the cyan **ENTRY** marker.
2. Avoid red guard vision cones and reach the gold **QUANTUM CORE**.
3. With the core, use the green **EXTRACT** door to win.
4. A guard capture rewinds time; the recorded loop comes back as a purple **Echo**. Guards can pursue an Echo instead of you, making it a planned distraction.
5. The game stores player movement in a heatmap. Repeated / sprint-heavy routes glow purple and become guard search targets after they lose sight of you.
6. Three captures trigger the loss screen. A loop naturally restarts after 30 seconds, keeping your most recent Echo.

## Feature checklist

- Phaser 3 + Vite, plain JavaScript
- WASD movement, collision-safe level navigation, sprint noise
- Three patrolling guards with field-of-view cones, walls-aware sight checks, chase/search/patrol state changes
- Adaptive player-route heatmap used by guards after losing visual contact
- Recorded time loop replayed by a ghostly Echo that guards investigate
- Objective gating (core first, extraction second), win screen, loss screen, pause screen, title/briefing screen
- Original procedural vector art: no copyrighted sprites or external gameplay assets
- Web Audio API synthesised ambience and sound effects; no paid APIs or services
- Unit tests for vision, wall-aware line of sight, heatmap learning, and replay interpolation

## Source layout

```text
src/
  audio/CyberAudio.js          Web Audio synth ambience and effects
  game/StealthEngine.js        Framework-free stealth / replay logic (unit-tested)
  scenes/BootScene.js          Procedural game art and boot flow
  scenes/MenuScene.js          Start + briefing screen
  scenes/GameScene.js          Map, player, guards, Echo, objectives, HUD
  scenes/ResultScene.js        Win/loss report and replay action
  main.js                      Phaser configuration
tests/stealthEngine.test.js    Core gameplay tests
```

## Test and make a production build

```powershell
npm test
npm run build
```

`npm run build` creates a portable static website in `dist/`. It has `base: './'`, so it works from a normal itch.io HTML upload instead of needing a web server.

## Upload to itch.io

1. Use the supplied `outputs/Echo-Heist-AI-itch.zip` after running the build, or zip the **contents** of `dist/` (not the enclosing folder).
2. Create a new itch.io project, choose **HTML** as the project type, then upload the ZIP.
3. Check **“This file will be played in the browser.”** Set the viewport to **960 × 624** (or enable fullscreen), save, and use the Preview button.
4. In the game description, paste: _“A cyberpunk time-loop stealth game: each failed run becomes an Echo that can distract guards, while security learns the routes you repeat.”_
5. For a jam page, add this repository/source ZIP plus a short 30–60 second clip that shows an Echo diverting a guard and the extraction win state.

## Accessibility and technical notes

- Controls are keyboard-first; clickable menu actions are also pointer-accessible.
- The page keeps a textual control summary for assistive technology, visible focus is preserved for browser controls, and the UI respects reduced-motion preferences.
- Audio begins only after the player starts the game, complying with browser autoplay rules. `M` works at any time after launch.
- The gameplay itself is fully local. It does not send player data anywhere.

## Jam credits

Design, code, UI, synthesized music/SFX, level layout, and visual assets are original to this submission. Tools used: Phaser, Vite, Vitest, and Web Audio API.
