# Bubble Battle MVP

A small browser-based Bomberman-like prototype.

## Scope

- 13 x 11 grid arena
- Four players: one local player and three AI opponents
- Hard blocks, destructible soft blocks, bombs, chain explosions
- Fire Up and Bomb Up drops, with Speed reserved for late-round Overload
- Easy, Normal, and Hard difficulty presets
- Classic, Crossfire, Garden, and Ruins map templates
- 2.5D map rendering with cube blocks, crates, trees, and small house obstacles
- Direction-aware pseudo-3D character rendering with smooth movement and walk frames
- Round win tracking and quick restart
- 90-second arcade round timer; time-up rounds are draws
- Late-round Overload buffs at 45s and 20s to speed up decisive finishes
- Mobile HUD keeps time and player stats above the board
- Portrait 9:16-friendly mobile shell with compact HUD and top-corner game controls
- In-game Settings panel for difficulty, map, assist options, restart, and next map
- Optional Blast Guide assist defaults to off on every difficulty
- Sound toggle and supported-device vibration toggle for mobile-friendly feedback
- Keyboard and multi-touch joystick controls with 3-second resume countdown
- Fixed mobile viewport with selection, long-press menu, and page scroll guards

## Difficulty

- Easy gives the player a speed boost, opens the map more, slows AI decisions, and increases item drops.
- Normal keeps all players even and uses the default map density.
- Hard gives AI a speed boost, makes the map tighter, lowers drops, and makes AI attack more aggressively.

## Run

Open `index.html` in a browser.

## Controls

- Move: arrow keys or WASD
- Place bomb: Space
- Pause/resume: P or Pause, then wait for the 3-second countdown
- Restart current round: R
- Touch: drag the joystick while tapping Bomb; Pause and Settings sit in the top corner

## Project Shape

- `index.html` contains the app shell.
- `styles.css` contains the responsive layout and UI styling.
- `game.js` contains the game data, rules, rendering, AI, input, and round flow.
