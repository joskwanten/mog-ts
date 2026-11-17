# The Maze of Galious — TypeScript

Een TypeScript-port van de pc-remake van **The Maze of Galious** (Brain Games /
Santi Ontañón, v0.63, C++/SDL), gebaseerd op de Emscripten-port
[joskwanten/mog-emscripten](https://github.com/joskwanten/mog-emscripten). Het spel
draait in de browser op een canvas met WebAudio, zonder Emscripten- of SDL-laag.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test           # regressie-replays + wachtwoordtests
npm run format     # Prettier
```

## Besturing

Zoals in de remake (standaard, te wijzigen met **K** in het titelscherm):

| Toets           | Actie                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| ← → ↑ ↓         | lopen, springen/klimmen, bukken                                                 |
| spatie          | zwaard                                                                          |
| M               | tweede wapen                                                                    |
| F1              | itemscherm                                                                      |
| F2              | pauze                                                                           |
| Esc             | terug naar het titelscherm                                                      |
| 9 / F10         | volgende grafische set (original, naramura, alternate, boltian, hinox, alfonso) |
| 0 / F11         | volgende geluidsset (original, jorito, Rob, wolf, alternate, Bart)              |
| L (titelscherm) | wachtwoord invoeren                                                             |
| PgUp / PgDn     | zoom                                                                            |

Op een Mac zijn F10/F11 standaard mediatoetsen (dan fn+F10); 9 en 0 werken altijd. De
gekozen sets worden bewaard.

## Opbouw

```
src/
  main.ts            opstarten, vaste tijdstap (25 fps = 40 ms, zoals de remake), weergave
  platform/          browser-laag: keyboard (SDL-keycodes), audio (WebAudio), assets, video
  engine/            RGBA-bitmaps (uit PCX), sprites, tiles, tekenprimitieven
  game/              de spellogica, per C++-bestand één module (zie PORTING.md)
assets/              graphics, geluid en kamers van de remake (ongewijzigd)
reference/cpp/       de C++-bronnen, om de port regel voor regel te vergelijken
```

De spellogica rekent in 640×400 spelpixels, met een 8-bit botsingsbuffer zoals de remake;
de botsingsdetectie hangt daarvan af. Het beeld zelf is RGBA en standaard 1280×800 (2×2
schermpixels per spelpixel). De PCX-graphics worden bij het laden met het palet van
`konami.pcx` omgezet naar RGBA, dus zonder HD-graphics is het beeld pixel voor pixel de
remake, alleen twee keer zo groot.

**HD-graphics.** Een grafische set kan in `assets/graphics/<set>/hd/` PNG's meeleveren
op precies twee keer de maat van de PCX (bv. `tiles.png` van 1280×800 naast `tiles.pcx`
van 640×400), met transparantie in het alfakanaal. Het beeld komt dan uit de PNG; de
botsingen blijven van de PCX, dus het spel speelt exact hetzelfde. Ontbreekt een PNG, dan
wordt die bitmap gewoon vergroot. `tools/upscale-hd.py <set>` maakt zo'n HD-set met
[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (`realesrgan-ncnn-vulkan`); de
naramura-set heeft er al een. De port is
eerst getrouw vertaald en daarna opgeschoond: Engelse camelCase-namen (automatisch
hernoemd via de TypeScript language service), Prettier-opmaak. Welke C++-naam bij welke
TypeScript-naam hoort staat in [NAMES.md](NAMES.md); de werkwijze en modulekaart in
[PORTING.md](PORTING.md).

Regressietests (`npm test`, ~6 minuten) spelen het spel met vaste seed en gescripte invoer
af: alle 311 kamers, alle shrines en winkels, alle demongevechten en vaste
bewegingspatronen van de speler. Van elk frame worden beeld, botsingsbuffer en geluid
vergeleken met een golden master. Zo blijft opschonen veilig: één verschoven pixel of een
ander geluid en de test faalt. Daarnaast moet de 2×-weergave, met en zonder (pixelgetrouw
vergrote) HD-graphics, hetzelfde beeld geven als de 1×-weergave.

URL-parameters voor ontwikkelen: `?scale=N` (schermpixels per spelpixel, standaard 2),
`?fps=N`, `?mute`, `?autostart`, `?manual`
(de lus staat stil; stap met `mog.step(n)` in de console).

## Licentie

De remake is GPL (zie `LICENSE`); deze port valt daar ook onder. De graphics en het
geluid komen uit de remake.
