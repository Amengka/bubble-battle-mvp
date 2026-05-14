# AIGameShare Upload Notes

## Package

- Suggested zip filename: `bubble-battle-mvp-aigameshare.zip`
- Entry point: `index.html` at the zip root
- Asset paths: relative (`./styles.css`, `./game.js`)
- Runtime assumptions: sandboxed iframe, no same-origin access, no parent DOM access

## Suggested Metadata

- slug: `bubble-battle`
- gameId: `g-bubble-battle-0001`
- title: `Bubble Battle`
- category: `Action`
- tags: `arcade,battle,bomberman,touch,canvas`
- aspectRatio: `9:16`
- mobileFriendly: `true`
- deviceSupport: `desktop,mobile`
- leaderboardEnabled: `true`
- leaderboardKey: `score`
- leaderboardName: `High Score`
- leaderboardSortDirection: `desc`
- leaderboardValueType: `number`
- leaderboardMaxScore: `10000000`

## Description

Drop bombs, break blocks, collect power-ups, and survive fast 2.5D arena rounds against three rivals. Play with keyboard controls on desktop or joystick and bomb touch controls on mobile.

## Controls

Desktop:

- Move: WASD or arrow keys
- Bomb: Space
- Pause: P
- Restart round: R

Mobile:

- Move: drag the joystick
- Bomb: tap the Bomb button
- Pause and settings: top-right buttons

## Thumbnail Recipe

1. Open the uploaded game page.
2. Click Play in the AIGameShare shell.
3. Click Start Battle.
4. Move once and place a bomb near crates.
5. Capture after the first explosion is visible.
