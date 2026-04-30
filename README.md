# Bubble Battle MVP

A small browser-based Bomberman-like prototype.

## Scope

- 13 x 11 grid arena
- Four players: one local player and three AI opponents
- Hard blocks, destructible soft blocks, bombs, chain explosions
- Fire Up, Bomb Up, and Speed Up power-ups
- Easy, Normal, and Hard difficulty presets
- Classic, Crossfire, Garden, and Ruins map templates
- 2.5D map rendering with cube blocks, crates, trees, and small house obstacles
- Direction-aware pseudo-3D character rendering with smooth movement and walk frames
- Round win tracking and quick restart
- 2-minute arcade round timer; time-up rounds are draws
- Mobile HUD keeps time and player stats above the board
- Keyboard and multi-touch joystick controls with 3-second resume countdown

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
- Touch: drag the joystick while tapping Bomb; the mobile Pause button starts the resume countdown

## Project Shape

- `index.html` contains the app shell.
- `styles.css` contains the responsive layout and UI styling.
- `game.js` contains the game data, rules, rendering, AI, input, and round flow.
