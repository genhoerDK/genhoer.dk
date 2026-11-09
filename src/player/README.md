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
                       (SoundButton: værkernes ene knap, StartButton, keys, useEngineState) og
                       afspillerens knapper i sitets
                       værktøjslinje (PlayerControls, ListenButton, MiniPlayerProgress, TracksOverview…)
  interfaces/          Måderne at spille et værk på, ét i hver mappe og uden noget, der hører til
                       ét bestemt værk
    registry.js        Hvad hvert interface behøver (motor, tone, om det åbner afspilleren)
    index.js           Komponenterne efter navn
    timeline/ buttons/ loop/ countdown/ walk/ quad/ street/
  kit/                 Byggesættet: det, der går igen i 3D (stilen, træer, buske, huse, biler,
                       veje, dis, tåge, himmel, regn). Se kit/README.md
  vaerker/             Én mappe pr. værk, navngivet efter værket, med det, der kun er dets:
    kanon-i-g3/        player.js; bunkeren (kanonstilling.js), skoven om den
                       (forest.js) og scenen (QuadScene.js)
    53-sekunder-til-faelles/  player.js; højbanen, kabinen, sygehuset og stationerne (hoejbane.js)
                       og scenen (ElevatorScene.js)
    tvaerveje/         player.js; kortet over Nakskov (nakskov.js)
    troldetoner/       player.js; instrumentet (instrument.js)
    kirkestraede/      player.js; Køge omkring gaden fra OpenStreetMap (koege.js)
    grindsted-station/   player.js
    files.js           cdn() og placeholder()
    scenes.js maps.js instruments.js streets.js   Finder et værks scene, kort, instrument og gade ud fra navnet
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
| `buttons`   | Troldetoner             | `instrument` | Trykker på fem knapper (`frame/SoundButton.js`) over værkets foto, der spiller toner over et musikloop (`audio/Instrument.js`, `interfaces/buttons/`; instrumentet i `vaerker/troldetoner/`) |
| `loop`      | (ingen lige nu)         | `loop`       | Et loop kører under overfladen; knappen bringer det op, holder det oppe så længe den holdes nede, og hvert tryk starter de ti sekunder forfra (`audio/Loop.js`) |
| `countdown` | 53 sekunder til fælles  | `file`       | Elevatorens knap og display: intet spiller, før knappen trykkes; hvert tryk er en tur med den næste af tolv variationer. Med `model: true` står højbanen bagved i 3D i stedet for fotoet (`vaerker/53-sekunder-til-faelles/`: `ElevatorScene.js`, `hoejbane.js`, med huse, træer, biler og dis fra `kit/`): kabinen kører fra den ene ende til den anden i nedtællingens tempo, og variationer med `stopAt` går i stå på vejen med blinkende lampe, hvorefter billedet fader ud og ind med kabinen ved den anden station, hvor næste tur starter; `weather: 'storm'` giver regn, tåge og lyn under turen (`weather.js`). Filerne er `viborg-2026/audio/1.mp3`–`12.mp3`; turene går frem og tilbage (ulige fra hospitalet), variation 5 og 8 har lange og korte sekunder, 7 går i stå ved 25, og 3 kører i storm. Vinklen er fast; under en tur zoomer billedet ind og følger kabinen, bagefter ud igen. Over knappen står variationen (nummer og titel, fra Lykkerus til Standard), som åbner listen over alle tolv — samme vælger som tidslinjens kapitler (`frame/Picker.js`): den valgte bliver næste tur, som knappen starter, og står kabinen ved den forkerte station, fader billedet, mens den flyttes |
| `walk`      | Tværveje                | `file`       | Byen i 3D (`interfaces/walk/WalkScene.js`): gadenettet, havnen og byens markante bygninger (`vaerker/tvaerveje/nakskov.js`, ét lille udtræk på under 100 objekter; kirken, vandtårnet, Dronningens Pakhus m.fl. bygges med `kit/landmarks.js`) med huse langs gaderne, opdigtet ud fra gaderne alene (`kit/town.js`, `kit/houses.js`), og træer på havnepromenaden, torvet og i gårdene (`kit/trees.js`), i mørke gråtoner, klart i byen og opløst i en dis, der ligger fast, hvor byen slutter; hvert sted er en lyttestation (`kit/station.js`), en svævende kugle med lys på jorden under sig. På hvert sted de tre karakterers fortællinger, hver med sin knap (`frame/SoundButton.js`) |
| `quad`      | Kanon i G3              | `quad`       | Kanonstillingen i 3D, bygget i kode efter Jørgen Lumbyes opmåling, snit og tegninger (hanstholmregistreringen.dk) og fotos (`vaerker/kanon-i-g3/`: `kanonstilling.js`, maskinblokken og sideblokkene bygget flade for flade med rigtige huller, så ingen samlinger ses), lytteren som en kugle over midten (HRTF, bedst med hovedtelefoner); bølger går fra højttalernes pladser ind mod kuglen, så kraftigt som de spiller; musen til højre drejer dig til højre. Fire monofiler, startet på samme sample (`audio/Quad.js`, `QuadScene.js`) |
| `street`    | Kirkestræde             | `file`       | Byen omkring gaden i 3D set oppefra som Tværvejes Nakskov og bygget på samme måde (`interfaces/street/`: `Street.js`, `StreetScene.js`; `kit/townmap.js`): gaderne, Torvet, Køge Å og Sankt Nicolai Kirke fra ét udtræk af OpenStreetMap på 99 objekter (`vaerker/kirkestraede/koege.js`, lavet med `scripts/osm-map.py`), huse og træer opdigtet ud fra gaderne. Man står ved et af højttalerparrene og går til det næste eller det forrige med ét rul, ét træk eller én piletast; kameraet følger med, tæt på og vendt ned ad gaden. På et stykke af gaden (`player.stretch`) hænger otte højttalere, fire par over for hinanden (`speaker.js`, `speakers.js`): de nærmeste lyser, og mens værket spiller, går der ringe ud fra dem. Hvert par spiller sin stereofil (`player.pairs`: venstre kanal fra højttaleren til venstre), alle fire i takt gennem gademotoren (`audio/Street.js`), og man hører dem alle hele tiden, men dem, man står ved, langt højere, hver fra sin side. Én tidslinje for alle otte kanaler ligger under: dens kapitler er hændelserne i gaden (`player.events`, hver ved et par), og spoler man på den, går man også hen, hvor hændelsen sker |

`interfaces/registry.js` siger, hvad hvert interface behøver (motor, lys eller mørk baggrund, om det
åbner afspilleren fra projektsiden, om filen looper). `interfaces/index.js` peger på komponenterne.

**Værker, der kun startes indefra** (`silent`: 53 sekunder til fælles og Tværveje) har deres egne
knapper til at starte lyden: elevatorknappen og fortællingerne. Udefra — play-knappen på projektsiden,
et cover i oversigten over værker, Lyt i værktøjslinjen — bliver man derfor kun ført ind i værket,
og intet spiller, før man trykker derinde (`frame/useListen.js`, som alle de steder bruger). De er
heller ikke på minispillerens bjælke: ingen fremdrift dér, og minispillerens knap sætter på pause,
genoptager en tur eller fortælling, der står på pause halvvejs, og ellers åbner den værket.
Tidslinjen og de andre almindelige afspilninger kører som før.

**Motorerne.** `file` er lydelementet i `AudioContext.js`: ét spor ad gangen, låseskærm og
baggrundsafspilning på telefoner. Værker med flere filer (countdown, walk) vælger selv en fil med
`playFile()`. De øvrige motorer er klasser i `audio/` med samme overflade: `start()`, `pause()`,
`dispose()`, `getState()` og `position` / `duration` til minispilleren. De oprettes i `play()`, så
klikket låser lyden op (iOS).

## Rammen

Alle interfaces står i `frame/PlayerShell.js`: værkets foto bagved med dybde (`scene/DepthBackdrop.js`,
three.js hentes først når afspilleren åbnes), dæmpet og i sort-hvid, mørkere i top og bund;
interfacets knapper i baren nederst (`<Controls>`) med værkets titel (lille) og, hvor der er brug for
det, én linje om, hvordan værket spilles. Knapperne er værkernes ene knap, `frame/SoundButton.js`
(se `STIL.md`, Knappen). Afspilleren er mørk ligesom projektsidens hero, så man går
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
