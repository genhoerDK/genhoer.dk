# Afspilleren

Hvert lydværk på genhoer.dk afspilles i et *interface*, der passer til den form, værket havde i
virkeligheden. Afspilleren er sat sammen af tre lag:

```
src/data/players.js                       Hvilket interface hvert værk får, og dets indstillinger
src/components/Player/interfaces/         Interfacene (det man ser og rører ved)
src/audio/                                Lydmotorerne (det man hører)
src/context/AudioContext.js               Binder dem sammen: ét værk er "det aktuelle" ad gangen
```

## Et værks afspiller

`players.js` lægger et `player`-objekt på projektet fra genhoer-data (`projects.json`):

```js
'tvaerveje': { interface: 'walk', places: [...], characters: [...] },
```

Et værk med en lydfil (`audio` fra genhoer-data) og ingen linje her får **tidslinjen**. Et værk uden
lyd får ingen afspiller. Lydfiler, der endnu ikke ligger på CDN'et, skrives som
`placeholder:<navn>?s=<sekunder>&seed=<tal>` og syntetiseres i browseren (`src/audio/placeholder.js`);
byt strengen ud med filens URL, og intet andet ændrer sig.

Indstillingerne hører hjemme i genhoer-data på sigt (en `afspiller`-blok under `hjemmeside` i
projektfilen, skrevet ind i `projects.json` af Data-workflowet). Indtil da ligger de her, så de
overlever, at `projects.json` skrives forfra.

## Interfacene

| interface   | værk                    | motor        | hvad man gør |
|-------------|-------------------------|--------------|--------------|
| `timeline`  | de fleste               | `file`       | Spoler på en linje med ét stykke pr. kapitel; kapitelmarkøren til venstre åbner kapitellisten; tastatur (mellemrum, pile, 1–9) |
| `circular`  | (den gamle runde)       | `file`       | Den runde spoler fra før; kan stadig vælges |
| `buttons`   | Troldetoner             | `instrument` | Trykker på fem 3D-knapper, der spiller toner over et musikloop (`src/audio/Instrument.js`) |
| `loop`      | Under overfladen        | `loop`       | Et loop kører under overfladen; knappen bringer det op, holder det oppe så længe den holdes nede, og hvert tryk starter de ti sekunder forfra (`src/audio/Loop.js`) |
| `countdown` | 53 sekunder til fælles  | `file`       | Elevatorens knap og display: intet spiller, før knappen trykkes; hvert tryk er en tur med den næste af tolv variationer. Med `model: true` står højbanen bagved i 3D i stedet for fotoet (`ElevatorScene.js`, `scene/hoejbane.js`; `look: 'dark'` i gråtoner på det mørke som Tværveje, `'pale'` under en himmel som Kanon i G3): kabinen kører fra den ene ende til den anden i nedtællingens tempo, og variationer med `stopAt` går i stå på vejen med blinkende lampe, hvorefter billedet fader ud og ind med kabinen tilbage ved stationen; `weather: 'storm'` giver regn, tåge og lyn under turen (`scene/weather.js`). Til test: variation 1 går i stå halvvejs, variation 2 kører i storm; musen ser sig omkring, rul eller "Følg kabinen" går tæt på og følger den |
| `walk`      | Tværveje                | `file`       | Byen i 3D (`WalkScene.js`): gadenettet, havnen og byens markante bygninger (`src/data/maps/`, ét lille udtræk på under 100 objekter; kirken, vandtårnet, Dronningens Pakhus m.fl. bygges i `scene/landmarks.js`) med huse langs gaderne, opdigtet ud fra gaderne alene (`scene/town.js`), og træer på havnepromenaden, torvet og i gårdene (`scene/trees.js`), i mørke gråtoner, klart i byen og opløst i en dis, der ligger fast, hvor byen slutter; hvert sted er en lyttestation, en svævende kugle med lys på jorden under sig. På hvert sted de tre karakterers fortællinger |
| `quad`      | Kanon i G3              | `quad`       | Kanonstillingen i 3D, bygget i kode efter Jørgen Lumbyes opmåling, snit og tegninger (hanstholmregistreringen.dk) og fotos (`scene/kanonstilling.js`, maskinblokken og sideblokkene bygget flade for flade med rigtige huller, så ingen samlinger ses; den slidte, rå beton i `scene/concrete.js` med afrundede, afslåede kanter og snavs i hjørnerne — kanterne findes i `markEdges`, og det hele står en anelse skævt (`unsettle`); `textured: false` gør den glat grå), lytteren som en kugle over midten (HRTF, bedst med hovedtelefoner); bølger går fra højttalernes pladser ind mod kuglen, så kraftigt som de spiller; musen til højre drejer dig til højre. Fire monofiler, startet på samme sample (`src/audio/Quad.js`, `QuadScene.js`) |

`interfaces/registry.js` siger, hvad hvert interface behøver (motor, lys eller mørk baggrund, om det
åbner afspilleren fra projektsiden, om filen looper). `interfaces/index.js` peger på komponenterne.

**Motorerne.** `file` er lydelementet i `AudioContext.js`: ét spor ad gangen, låseskærm og
baggrundsafspilning på telefoner. Værker med flere filer (countdown, walk) vælger selv en fil med
`playFile()`. De øvrige motorer er klasser i `src/audio/` med samme overflade: `start()`, `pause()`,
`dispose()`, `getState()` og `position` / `duration` til minispilleren. De oprettes i `play()`, så
klikket låser lyden op (iOS).

## Rammen

Alle interfaces står i `PlayerShell.js`: værkets foto bagved med dybde (`scene/DepthBackdrop.js`,
three.js hentes først når afspilleren åbnes), dæmpet og i sort-hvid, mørkere i top og bund;
interfacets knapper i baren nederst (`<Controls>`) med værkets titel (lille) og, hvor der er brug for
det, én linje om, hvordan værket spilles. Afspilleren er mørk ligesom projektsidens hero, så man går
fra siden ind i rummet, hvor værket spiller. Headeren og værktøjslinjen bliver lyse ovenpå (`useChrome`).

**Dybden.** Fotoet forskydes pixel for pixel efter et dybdekort (lyst = nær), mens kameraet driver og
følger musen eller en finger. Dybdekortene ligger i `public/depth/<mappe>/<navn>.webp`, ét for hvert
foto afspilleren viser, lavet med `scripts/depth-map.py` (Depth Anything V2). Et foto uden dybdekort
får et gæt: det nederste er nær, det øverste fjernt.

## Et nyt interface

1. En komponent i `interfaces/`, der bruger `PlayerShell`, `Controls` og `useAudio()` (og
   `useEngineState()` for en motor). Tastatur: lad `keyIsTaken(e)` afgøre, hvad der ikke skal røres.
2. En linje i `interfaces/registry.js` og i `interfaces/index.js`.
3. Skal det have sin egen lyd, en klasse i `src/audio/` og en linje i `src/audio/engines.js`.
4. Værkets indstillinger i `src/data/players.js`.

## Test

`scripts/` i repoet har ingen browsertest. Under udviklingen blev interfacene kørt igennem med
Playwright på desktop (1440 × 900) og iPhone 14: afspil og pause, spoling med mus og finger,
kapitellisten, tastaturet, knappen over overfladen og tiden under, nedtællingens tempo, gåturen
mellem stederne og den fortælling, der følger efter, og drejningen i rummet.
