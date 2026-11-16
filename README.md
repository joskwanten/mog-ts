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
  engine/            8-bit indexed bitmaps (PCX), sprites, tiles, tekenprimitieven
  game/              de spellogica, per C++-bestand één module (zie PORTING.md)
assets/              graphics, geluid en kamers van de remake (ongewijzigd)
reference/cpp/       de C++-bronnen, om de port regel voor regel te vergelijken
```

De spellogica tekent elke frame in een 640×400 indexed framebuffer plus een
botsingsbuffer, precies zoals de remake; de botsingsdetectie hangt daarvan af. De port is
eerst getrouw vertaald en daarna opgeschoond: Engelse camelCase-namen (automatisch
hernoemd via de TypeScript language service), Prettier-opmaak. Welke C++-naam bij welke
TypeScript-naam hoort staat in [NAMES.md](NAMES.md); de werkwijze en modulekaart in
[PORTING.md](PORTING.md).

Regressietests (`npm test`, ~2½ minuut) spelen het spel met vaste seed en gescripte invoer
af: alle 311 kamers, alle shrines en winkels, alle demongevechten en vaste
bewegingspatronen van de speler. Van elk frame worden beeld, botsingsbuffer en geluid
vergeleken met een golden master. Zo blijft opschonen veilig: één verschoven pixel of een
ander geluid en de test faalt.

URL-parameters voor ontwikkelen: `?fps=N`, `?mute`, `?autostart`, `?manual`
(de lus staat stil; stap met `mog.step(n)` in de console).

## Licentie

De remake is GPL (zie `LICENSE`); deze port valt daar ook onder. De graphics en het
geluid komen uit de remake.
