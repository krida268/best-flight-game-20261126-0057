# Sky Courier: Island Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/krida268/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/krida268/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A chase-view flight game that runs offline in a desktop browser from its own
static files. Fly the courier plane over island-dotted sea, thread the target
rings, watch the fuel, and bring her home to the runway.

## How to play

- **Arrows / WASD** — steer (bank and pitch)
- **Shift / Ctrl** — throttle up / down
- **Mouse** — hold to steer toward the pointer
- **P** — pause, **M** — mute, **R** — restart

Three sorties, picked on the title screen:

1. **Ring Run** — fly through 10 rings before the fuel runs out.
2. **Island Hop** — reach the runway 12 km out and land her gently.
3. **Storm Dash** — twelve rings, gusting crosswind, no room for error.

Climbing bleeds speed, banking turns the nose, and a stall sinks the plane.
Touch the sea or an island peak and the sortie is over; touch down on the
runway, slow and level, and the courier is home.

## Run it

Serve `game/` with any static server and open `game/index.html` in a desktop
browser — no network request, no build step. Sounds are synthesised with the
Web Audio API; there are no sound files.

## Hand in

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun's "Make the best flight game" bounty.

Play more at https://make.fun/r/enzt809f
