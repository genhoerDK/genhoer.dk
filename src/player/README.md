# Afspilleren

Hvert lydværk på genhoer.dk afspilles i et *interface*, der passer til den form, værket havde i
virkeligheden. Alt, hvad der har med afspilleren at gøre, ligger her i `src/player/`, adskilt fra
resten af hjemmesiden:

```
src/player/
  README.md            Det her
  STIL.md              3D-stilen: farver, streg, lys, dybde, mobil
  players.js           Samler værkernes indstillinger (fra vaerker/<værk>/player.js)
  AudioContext.js      Binder det hele sammen: ét værk er "det aktuelle" ad gangen (useAudio)
  Player.js            Afspilleren som overlay (?lyt), med værkets interface eller oversigten
  frame/               Rammen alle interfaces står i (PlayerShell), deres fælles dele
                       (StartButton, keys, useEngineState) og afspillerens knapper i sitets
                       værktøjslinje (PlayerControls, ListenButton, MiniPlayerProgress, TracksOverview…)
  interfaces/          Måderne at spille et værk på, ét i hver mappe og uden noget, der hører til
                       ét bestemt værk
    registry.js        Hvad hvert interface behøver (motor, tone, om det åbner afspilleren)
    index.js           Komponenterne efter navn
    timeline/ buttons/ loop/ countdown/ walk/ quad/
  kit/                 Byggesættet: det, der går igen i 3D (stilen, træer, buske, huse, biler,
                       veje, dis, tåge, himmel, regn). Se kit/README.md
  vaerker/             Én mappe pr. værk, navngivet efter værket, med det, der kun er dets:
    kanon-i-g3/        player.js; bunkeren (kanonstilling.js, concrete.js), skoven om den
                       (forest.js) og scenen (QuadScene.js)
    53-sekunder-til-faelles/  player.js; højbanen, kabinen, sygehuset og stationerne (hoejbane.js)
                       og scenen (ElevatorScene.js)
    tvaerveje/         player.js; kortet over Nakskov (nakskov.js)
    troldetoner/       player.js; instrumentet (instrument.js)
    grindsted-station/ under-overfladen/   player.js
    files.js           cdn() og placeholder()
    scenes.js maps.js instruments.js   Finder et værks scene, kort og instrument ud fra navnet
  scene/               Scenen alle 3D-interfaces står på: kamera og lys (stage.js), fotoet med
                       dybde bag 2D-interfacene (DepthBackdrop.js, depth.js)
  audio/               Lydmotorerne (det man hører)
```

Resten af sitet bruger kun `AudioContext.js` (`AudioProvider`, `useAudio`), `Player.js`,
`frame/PlayerControls.js`, `frame/TracksOverviewButton.js`, `interfaces/registry.js` (om et værk
åbner afspilleren) og `players.js` (gennem `src/data/projects.js`).

## Et værks afspiller

Hvert værks indstillinger ligger i dets egen mappe, `vaerker/<værk>/player.js`, og `players.js`
samler dem og lægger et `player`-objekt på projektet fra genhoer-data (`projects.json`):

```js
// vaerker/tvaerveje/player.js
export const player = { interface: 'walk', map: 'nakskov', places: [...], characters: [...] };
```

Et værk med en lydfil (`audio` fra genhoer-data) og ingen linje her får **tidslinjen**. Et værk uden
lyd får ingen afspiller. Lydfiler, der endnu ikke ligger på CDN'et, skrives som
`placeholder:<navn>?s=<sekunder>&seed=<tal>` og syntetiseres i browseren (`placeholder()` i `vaerker/files.js`, `audio/placeholder.js`);
byt strengen ud med filens URL, og intet andet ændrer sig.

Indstillingerne hører hjemme i genhoer-data på sigt (en `afspiller`-blok under `hjemmeside` i
projektfilen, skrevet ind i `projects.json` af Data-workflowet). Indtil da ligger de i værkernes mapper, så de
overlever, at `projects.json` skrives forfra.

## Interfacene

| interface   | værk                    | motor        | hvad man gør |
|-------------|-------------------------|--------------|--------------|
| `timeline`  | de fleste               | `file`       | Spoler på en linje med ét stykke pr. kapitel; kapitelmarkøren til venstre åbner kapitellisten; tastatur (mellemrum, pile, 1–9) |
| `buttons`   | Troldetoner             | `instrument` | Trykker på fem 3D-knapper, der spiller toner over et musikloop (`audio/Instrument.js`, `interfaces/buttons/`; instrumentet i `vaerker/troldetoner/`) |
| `loop`      | Under overfladen        | `loop`       | Et loop kører under overfladen; knappen bringer det op, holder det oppe så længe den holdes nede, og hvert tryk starter de ti sekunder forfra (`audio/Loop.js`) |
| `countdown` | 53 sekunder til fælles  | `file`       | Elevatorens knap og display: intet spiller, før knappen trykkes; hvert tryk er en tur med den næste af tolv variationer. Med `model: true` står højbanen bagved i 3D i stedet for fotoet (`vaerker/53-sekunder-til-faelles/`: `ElevatorScene.js`, `hoejbane.js`, med huse, træer og dis fra `kit/`; `look: 'dark'` i gråtoner på det mørke som Tværveje, `'pale'` under en himmel som Kanon i G3): kabinen kører fra den ene ende til den anden i nedtællingens tempo, og variationer med `stopAt` går i stå på vejen med blinkende lampe, hvorefter billedet fader ud og ind med kabinen tilbage ved stationen; `weather: 'storm'` giver regn, tåge og lyn under turen (`weather.js`). Til test: variation 1 går i stå halvvejs, variation 2 kører i storm; musen ser sig omkring, rul eller "Følg kabinen" går tæt på og følger den |
| `walk`      | Tværveje                | `file`       | Byen i 3D (`interfaces/walk/WalkScene.js`): gadenettet, havnen og byens markante bygninger (`vaerker/tvaerveje/nakskov.js`, ét lille udtræk på under 100 objekter; kirken, vandtårnet, Dronningens Pakhus m.fl. bygges med `kit/landmarks.js`) med huse langs gaderne, opdigtet ud fra gaderne alene (`kit/town.js`, `kit/houses.js`), og træer på havnepromenaden, torvet og i gårdene (`trees.js`), i mørke gråtoner, klart i byen og opløst i en dis, der ligger fast, hvor byen slutter; hvert sted er en lyttestation, en svævende kugle med lys på jorden under sig. På hvert sted de tre karakterers fortællinger |
| `quad`      | Kanon i G3              | `quad`       | Kanonstillingen i 3D, bygget i kode efter Jørgen Lumbyes opmåling, snit og tegninger (hanstholmregistreringen.dk) og fotos (`vaerker/kanon-i-g3/`: `kanonstilling.js`, maskinblokken og sideblokkene bygget flade for flade med rigtige huller, så ingen samlinger ses; den slidte, rå beton i `concrete.js` med afrundede, afslåede kanter og snavs i hjørnerne — kanterne findes i `markEdges`, og det hele står en anelse skævt (`unsettle`); `textured: false` gør den glat grå), lytteren som en kugle over midten (HRTF, bedst med hovedtelefoner); bølger går fra højttalernes pladser ind mod kuglen, så kraftigt som de spiller; musen til højre drejer dig til højre. Fire monofiler, startet på samme sample (`audio/Quad.js`, `QuadScene.js`) |

`interfaces/registry.js` siger, hvad hvert interface behøver (motor, lys eller mørk baggrund, om det
åbner afspilleren fra projektsiden, om filen looper). `interfaces/index.js` peger på komponenterne.

**Motorerne.** `file` er lydelementet i `AudioContext.js`: ét spor ad gangen, låseskærm og
baggrundsafspilning på telefoner. Værker med flere filer (countdown, walk) vælger selv en fil med
`playFile()`. De øvrige motorer er klasser i `audio/` med samme overflade: `start()`, `pause()`,
`dispose()`, `getState()` og `position` / `duration` til minispilleren. De oprettes i `play()`, så
klikket låser lyden op (iOS).

## Rammen

Alle interfaces står i `frame/PlayerShell.js`: værkets foto bagved med dybde (`scene/DepthBackdrop.js`,
three.js hentes først når afspilleren åbnes), dæmpet og i sort-hvid, mørkere i top og bund;
interfacets knapper i baren nederst (`<Controls>`) med værkets titel (lille) og, hvor der er brug for
det, én linje om, hvordan værket spilles. Afspilleren er mørk ligesom projektsidens hero, så man går
fra siden ind i rummet, hvor værket spiller. Headeren og værktøjslinjen bliver lyse ovenpå (`useChrome`).

**Dybden.** Fotoet forskydes pixel for pixel efter et dybdekort (lyst = nær), mens kameraet driver og
følger musen eller en finger. Dybdekortene ligger i `public/depth/<mappe>/<navn>.webp`, ét for hvert
foto afspilleren viser, lavet med `scripts/depth-map.py` (Depth Anything V2). Et foto uden dybdekort
får et gæt: det nederste er nær, det øverste fjernt.

## Et nyt interface

1. En mappe i `interfaces/` med en komponent, der bruger `PlayerShell`, `Controls` og `useAudio()`
   (og `useEngineState()` for en motor). Intet, der hører til ét bestemt værk: et værks scene
   findes gennem `vaerker/scenes.js`. Tastatur: lad `keyIsTaken(e)` afgøre, hvad der ikke skal røres.
2. En linje i `interfaces/registry.js` og i `interfaces/index.js`.
3. Skal det have sin egen lyd, en klasse i `audio/` og en linje i `audio/engines.js`.

## Et nyt værk

1. En mappe `vaerker/<værkets slug>/` med `player.js` (interfacet og dets indstillinger) og en
   linje i `players.js`.
2. Har det en 3D-scene, bygges den af byggesættet (`kit/`) og følger `STIL.md`; kun det, der er
   unikt for værket (en bunker, et sygehus), bygges i værkets mappe. Scenen nævnes i
   `vaerker/scenes.js`.

## Test

`scripts/` i repoet har ingen browsertest. Under udviklingen blev interfacene kørt igennem med
Playwright på desktop (1440 × 900) og iPhone 14: afspil og pause, spoling med mus og finger,
kapitellisten, tastaturet, knappen over overfladen og tiden under, nedtællingens tempo, gåturen
mellem stederne og den fortælling, der følger efter, og drejningen i rummet.
