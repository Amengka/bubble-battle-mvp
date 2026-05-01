# Project Memory: Bubble Battle MVP

Last updated: 2026-05-01

This file records the current project context so future work can continue without
reconstructing decisions from the chat history.

## Repository

- Local path: `/mnt/e/AmengkaGames/bubble-battle-mvp`
- GitHub repository: `https://github.com/Amengka/bubble-battle-mvp`
- GitHub Pages URL: `https://amengka.github.io/bubble-battle-mvp/`
- Default branch: `main`
- Pages source: `main`, root path `/`
- Current implementation is static HTML/CSS/JS:
  - `index.html`
  - `styles.css`
  - `game.js`
  - `README.md`
- Project memory file:
  - `MEMORY.md`
  - Intended to be committed to the repo so future sessions can recover context.

## Product Direction

- A Bomberman / PopTag-inspired browser mini game.
- Desktop and mobile should both be playable.
- Mobile should feel closer to a native phone game than a scrollable web page.
- The game may later be published on AIGameShare or a similar iframe-based game platform.
- Reference inspected: `https://www.aigameshare.com/games/scribble-jump`
  - The reference game uses a 9:16-friendly mobile shell.
  - Controls, settings, and pause live inside the game surface.
  - The embedded game source observed was `https://play.aigameshare.com/g/g-sj-0001/`.
  - AIGameShare page chrome such as plays count, platform toolbar, restart,
    theater mode, fullscreen, comments, and leaderboard should be treated as
    host/platform UI, not part of our game body.
  - Our game body should own gameplay UI only: start/result flow, HUD, pause,
    settings, controls, and the game board.
  - The AIGameShare `GamePlayer` toolbar provides Reload, Theater, and
    Fullscreen externally. Reload works by changing the iframe `src` with a
    `reload=` query value, not by calling an in-game restart method.
  - The AIGameShare SDK currently exposes child-to-parent methods:
    `ready()`, `submitScore()`, `unlockAchievement()`, `track()`, and
    `setState()`. It does not expose fullscreen or restart callbacks.

## Implemented Gameplay

- 13 x 11 arena.
- Four players:
  - one local player
  - three AI opponents
- Bomb placement, timed explosions, and chain explosions.
- Bomb blast damage is only lethal during the initial damage window.
  - Lingering explosion visuals are non-lethal.
- Destructible soft blocks and permanent hard blocks.
- Additional obstacle tiles:
  - trees
  - small houses
- Power-ups:
  - Fire Up
  - Bomb Up
  - Speed Up exists in code but no longer drops in normal blocks
  - Speed is mainly reserved for late-round Overload
- Difficulty presets:
  - Easy
  - Normal
  - Hard
- Map templates:
  - Classic
  - Crossfire
  - Garden
  - Ruins
- 90-second arcade timer.
  - If time expires before a winner is decided, the round is a draw.
- Overload is the late-round closer:
  - warning at 50 seconds remaining
  - phase 1 at 45 seconds remaining: +2 Bomb, +2 Fire, +1 Speed
  - phase 2 at 20 seconds remaining: +1 Bomb, +1 Fire, +1 Speed
  - buffs apply to all living players and last only for the current round
  - current stat caps remain Bomb 5, Fire 6, Speed 5
- Pause support with a 3-second resume countdown.
- Round win tracking and automatic next-round flow.

## Rendering And UI

- Map rendering was moved toward a pseudo-3D / 2.5D top-down style:
  - cube-like hard blocks
  - crates
  - trees
  - houses
  - depth-styled floor tiles
- Character rendering is direction-aware:
  - front
  - back
  - left
  - right
- Character identities are visually distinct:
  - You
  - Bolt
  - Mint
  - Gold
- Characters have smooth movement and walk-frame animation.
- Desktop keeps a side panel with:
  - difficulty
  - map selection
  - player stats
  - match timer
  - score list
  - controls
- Mobile hides the side panel.
- Mobile uses a compact HUD above the board.
- Mobile uses an in-game Settings modal for:
  - difficulty
  - map
  - reset round
  - next map
- Mobile top-right controls:
  - fullscreen icon
  - gear settings icon
  - pause button
- Mobile bottom controls:
  - joystick
  - large circular Bomb button
- Desktop action bar includes a visible `Fullscreen` button.
- Internal fullscreen is now treated as a standalone fallback only.
  - In iframe / platform embed mode it is hidden so it does not duplicate the
    AIGameShare toolbar.
  - `?embed=1` can be used locally or on GitHub Pages to preview platform
    embed behavior.
- Game flow overlay was added inside `.board-wrap`:
  - initial `Start Battle` overlay before the round starts
  - result overlay after win/draw/loss
  - primary action starts the first round or advances from the result screen
- While the game flow overlay is open, gameplay input is blocked and Pause is
  disabled.
- Hit feedback was added for bomb damage:
  - eliminated characters spawn a short impact ring, cross flash, and particles
  - local-player elimination also triggers a brief board shake and red edge flash
  - this is visual only and does not change the blast damage rules
- Generated WebAudio feedback exists for:
  - bomb placement
  - explosions
  - kill/elimination
  - item pickup
  - round start/result
  - pause resume countdown
  - Hurry Up / Overload
  - key buttons
- The local player's death can pause the round and open a choice overlay:
  - Restart starts the current round again.
  - Watch resumes the AI round in spectator mode.

## Mobile And Platform Hardening

- Viewport meta includes `viewport-fit=cover` and `user-scalable=no`.
- Mobile layout is 9:16-friendly, but portrait is allowed.
- Added guards against:
  - accidental text selection
  - long-press context menus
  - drag selection
  - page scrolling during gameplay
  - tap highlights
- Multi-touch was improved so joystick movement and Bomb taps can work together.
- Mobile movement feel was improved:
  - player movement uses buffered input instead of dropping turns during cooldown
  - movement cooldown keeps leftover frame time so mobile frame drops waste less input
  - joystick direction has hysteresis to reduce horizontal/vertical flicker near diagonals
  - joystick diagonal input stores a secondary fallback direction if the primary direction is blocked
  - high speed buffs use a smoother movement-delay curve with a minimum delay to avoid animation/input desync
  - joystick and Bomb touch controls were enlarged for normal iPhone-size portrait screens
  - joystick deadzone was reduced so thumb movement starts responding sooner
  - joystick now uses the press position as a dynamic origin and drifts with the thumb near the movement limit
- Desktop keyboard movement uses a latest-pressed direction stack for WASD/arrow keys.
- Holding multiple keyboard directions can fall back to the previous held direction if the latest direction is blocked.
- Space bomb placement ignores browser key repeat so holding Space does not spam bombs.
- Opening Settings during gameplay pauses the game.
- Closing Settings after opening it from gameplay starts the 3-second resume countdown.
- `document.hidden` / window blur pauses the game.
- Fullscreen transition blur is ignored briefly so entering fullscreen does not immediately pause.

## Fullscreen Behavior

- Fullscreen buttons use `[data-fullscreen]`.
- There are two fullscreen entry points:
  - mobile icon button in `.mobile-utility-actions`
  - desktop text button in `.actions`
- Buttons start as `hidden`.
- JS detects Fullscreen API support and shows the buttons only when fullscreen is available.
- JS syncs all fullscreen buttons through `querySelectorAll("[data-fullscreen]")`.
- Fullscreen target is `.app-shell`, falling back to `document.documentElement`.
- In platform embed mode, all internal fullscreen buttons are hidden and
  `toggleFullscreen` is a no-op.
- Supported APIs:
  - `requestFullscreen`
  - `webkitRequestFullscreen`
  - `mozRequestFullScreen`
  - `msRequestFullscreen`
  - matching exit, change, and error variants
- Desktop fullscreen layout decision:
  - Do not hide the right-side information panel.
  - Use a balanced three-column layout:
    - left invisible spacer
    - centered game play area
    - right information panel
  - This keeps the board centered on the screen while preserving Difficulty,
    Map, Player, Match, and Controls information.
- Previous rejected fullscreen approach:
  - hiding `.side-panel` centered the board but removed important desktop info.
  - The user explicitly rejected losing the right-side information.
- Caveat:
  - iframe hosts and some mobile browsers may block fullscreen even if the button appears.

## AIGameShare Integration

- Platform/embed mode is detected when:
  - running inside an iframe
  - `?embed=1`, `?embed=true`, `?aigameshare=1`, or similar preview flag is present
  - `?platform=aigameshare` is present
  - detection is intentionally not tied to a hardcoded AIGameShare hostname
- In platform/embed mode:
  - `html.is-platform-embed` is added
  - internal fullscreen controls are hidden
  - desktop layout is compacted to fit an iframe height
  - mobile layout remains full-viewport and non-scrollable
- SDK loading is not tied to a hardcoded URL.
  - Prefer a host-injected `window.AIGameShare`.
  - If explicit loading is needed, provide `data-platform-sdk-src` on the
    `game.js` script tag or pass `?platformSdkSrc=...` / `?sdkSrc=...`.
- SDK usage:
  - `ready()` on boot
  - `track("game_loaded")`
  - `track("round_start")`
  - `track("round_end")`
  - `track("pause")`, `track("resume")`, settings/map/difficulty events
  - `setState()` for current phase, round, map, difficulty, timer, pause, result
  - `submitScore("survival_seconds", value)`
  - `submitScore("wins", value)` when the local player wins
- Public in-game host API:
  - `window.BubbleBattle.start()`
  - `window.BubbleBattle.restart()`
  - `window.BubbleBattle.pause()`
  - `window.BubbleBattle.resume()`
  - `window.BubbleBattle.setDifficulty(id)`
  - `window.BubbleBattle.setMap(id)`
  - `window.BubbleBattle.getState()`
- The game also listens for iframe messages:
  - `bubble-battle:start`
  - `bubble-battle:restart`
  - `aigameshare:restart`
  - `bubble-battle:pause`
  - `bubble-battle:resume`

## Current Local State

- As of 2026-05-01, the local working tree has uncommitted changes in:
  - `game.js`
  - `index.html`
  - `styles.css`
  - `MEMORY.md`
- These local changes include:
  - game start/result overlay flow
  - disabled pause buttons outside active gameplay
  - desktop fullscreen balanced three-column layout
  - hit feedback for eliminated characters and local-player damage
  - platform/embed mode for AIGameShare-style hosting
  - AIGameShare SDK and host API integration
  - mobile joystick movement buffering, hysteresis, fallback direction, and high-speed smoothing
  - updated memory documentation
- These changes have not been committed, pushed, merged, or deployed yet unless
  a later session records that explicitly.

## Recent PRs

- PR #5: `https://github.com/Amengka/bubble-battle-mvp/pull/5`
  - Merge commit: `3f81b7d`
  - Added desktop-visible fullscreen control and synced multiple fullscreen buttons.
- PR #4: `https://github.com/Amengka/bubble-battle-mvp/pull/4`
  - Merge commit: `5d281ed`
  - Added mobile fullscreen button and Fullscreen API logic.
- PR #3: `https://github.com/Amengka/bubble-battle-mvp/pull/3`
  - Merge commit: `f75571b`
  - Replaced mobile `Set` text with a gear icon.
- PR #2: `https://github.com/Amengka/bubble-battle-mvp/pull/2`
  - Merge commit: `c76c037`
  - Added mobile platform shell work.
- PR #1:
  - Mobile input optimization.

## Validation Used

- `node --check game.js`
- `git diff --check`
- Local static server smoke test returned HTTP 200 during earlier mobile shell validation.
- GitHub Pages HTML was checked with:
  - `curl -L https://amengka.github.io/bubble-battle-mvp/`
- Playwright / Chromium was not available in the environment, so automated screenshot testing was not performed.

## GitHub And Tooling Notes

- `gh auth status` can fail in the default sandbox with a misleading invalid-token message.
- Running `gh auth status` with escalated permissions works for account `Amengka`.
- The GitHub App connector could not create PRs for this repo:
  - `403 Resource not accessible by integration`
- Use `gh pr create` and `gh pr merge` with escalated permissions for PR workflows.
- Network operations often need escalation:
  - `git push`
  - `gh pr create`
  - `gh pr merge`
  - `gh api`
  - sometimes `curl -L` to GitHub Pages or external pages

## Preferred Publish Flow

1. Confirm scope with `git status -sb` and `git diff`.
2. Ensure `main` matches `origin/main`.
3. Create a branch like `codex/<short-description>`.
4. Stage only intended files.
5. Commit with a terse message.
6. Push the branch.
7. Create a PR with `gh pr create`.
8. Merge with `gh pr merge --merge --delete-branch`.
9. Run `git fetch origin --prune`.
10. Switch to `main`.
11. Run `git merge --ff-only origin/main`.
12. Verify Pages with `gh api repos/Amengka/bubble-battle-mvp/pages`.
13. Verify live HTML with `curl -L https://amengka.github.io/bubble-battle-mvp/`.

## Known Caveats And Next Checks

- Fullscreen visibility depends on browser Fullscreen API support.
- Fullscreen may be blocked in iframe contexts unless the host allows it.
- Real-device mobile testing is still needed for:
  - fullscreen behavior
  - joystick plus Bomb multi-touch feel
  - portrait layout fit
  - Settings and pause countdown ergonomics
- Later polish ideas:
  - replace Unicode symbols with SVG or icon-library icons
  - prepare AIGameShare publishing assets
  - make a vertical thumbnail
  - write short English game description and tags
  - capture 9:16 screenshots
