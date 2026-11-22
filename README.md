# makefun-gta6-01-solmara

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Verifiedlabs/makefun-gta6-01-solmara/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Verifiedlabs/makefun-gta6-01-solmara/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMARA BAY** is an original Three.js 3D open-world coastal crime game built with zero external network assets and pure browser ES modules. Outrun the SBPD down Coral Strip, hijack supercars and convertibles across four sunset-drenched districts, battle the Marlin Cartel across Downtown Neon Fountain Plaza, and take over the Bay across five chained syndicate contracts.

## Highlights

- **Four Coastal Districts**: **Coral Strip** (Art-Deco pastel hotels, boardwalk, glowing `SOLMARA BAY` neon archway, sandy beach with umbrellas & lifeguard towers), **Solmara Downtown** (glass-and-gold skyscrapers & open **Downtown Neon Fountain Plaza** with arcing water jets), **Harbor Docks & Marina** (shipping container yard, gantry crane, **Sunset Auto** respray pad, timber piers, `SOLMARA MARINA` sign, and bobbing yachts), and **Sunset Hills** (terraced pastel villas and cartel overlook).
- **Five Procedural 3D Vehicles**: **Solmara GT** supercar (rear wing + cyan underglow), **Vento Cabrio** open-top convertible, **Baha Coupe**, **Harbor Hauler**, and **SBPD Interceptor** (flashing red/blue lightbar + siren point light) with spinning/steering wheels, arcade drift, nitro boost, stunt ramps, and vehicle-to-vehicle impulse physics.
- **On-Foot & Firefight Action**: Articulated 3D character, four weapons (**Street Brawl**, **9mm Sidearm**, **Compact SMG**, **Coastal Shotgun**), luminous 3D cylinder tracers with additive glow halos, muzzle flash star burst and dynamic light, impact sparks, tire smoke, and vehicle explosions.
- **5-Star SBPD Wanted & Syndicate Story**: Predictive police pursuit cruisers, foot officers, evasion countdown, Sunset Auto respray heat clearing, five chained story contracts with a spinning 3D waypoint beacon and **Camila Vega** comms, procedural Web Audio SFX + 3 FM synth radio stations, `localStorage` career save/continue, and a high-contrast 2D tactical minimap.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` / Arrow Keys | Move / Drive |
| `Mouse + LMB` | Aim & Fire |
| `E` | Enter / Hijack / Exit Vehicle |
| `Shift` | Sprint / Nitro Boost |
| `Space` | Jump / Handbrake Drift |
| `1` – `4` / `R` | Switch Weapons / Reload |
| `Q` / `M` | Cycle FM Synth Radio / Mute Audio |
| `ESC` | Pause & Street Services (Save, Respray $200, Gear Refill $150) |

## Run Locally & Build Dossier

```bash
# Play locally at http://localhost:8080
node serve.ts

# Build deterministic submission output (game/, screenshots/, dossier.json)
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

Built for [make.fun](https://make.fun/?ref=sdxd5map&utm_source=github&utm_medium=readme&utm_campaign=gta6-01).
