# 3D-stilen

Fælles regler for værkernes 3D-miljøer: Kanon i G3 (`QuadScene.js`), Tværveje (`WalkScene.js`) og
53 sekunder til fælles (`ElevatorScene.js`), og de værker, der kommer. Stilen bygger på det mørke
design, de tre værker allerede har valgt (`look: 'dark'`), og på valgene i stil-labbet, hvor
trækkene kan prøves på én testscene (forslag G, "Modelbord, let", er den valgte stil):
https://claude.ai/artifact/X7Z4P38MDqWgmMQejeN467

Kort fortalt: en grå arkitektmodel med dæmpede gader, meget svage kanter og hvid lyd, i et rent
billede uden raster, korn eller andre effekter.

Tallene ligger i ét modul, `kit/style.js`, som alle tre scener og hele byggesættet (`kit/`) henter fra: gråtonerne (`GREYS`,
`zinc()`), lyset (`LIGHT`, `lights()`), materialet (`greyMaterial()`), kanterne (`EDGES`,
`edgeLines()`), vignetten (`vignette`, `vignetteMask`), opløsningen (`pixelRatio()`,
`shadowMapSize()`) og rendereren (`styleRenderer()`). En scene skriver ingen gråtoner selv.
Stilen er værkernes `look: 'dark'`; de ældre looks (Kanon i G3's realistiske, stiliserede og
blueprint, 53 sekunders lyse) ligger der stadig, men følger ikke stilen.

## Den bærende regel

**Verden er grå, og kun lyden lyser.** Alt, der ikke lyder, er matte gråtoner i faste trin. Det
eneste, der får lys eller hvidt, er det, der har med lyden at gøre: lyttestationen (Tværveje),
kabinen og lampen (53 sekunder), højttalerne og bølgerne (Kanon i G3). Så kan man i alle værker
se, hvor lyden er.

Det samme gælder bevægelse: **kun lyden bevæger sig.** Det grå står stille, bortset fra langsom
tåge.

Reglen er sitets egen: på genhoer.dk er rund og hvid allerede lig med lyd (afspilknappen, kortets
markører). I 3D er kun lyd rund og hvid.

## Farver: zinc, ingen farve

Alle gråtoner kommer fra Tailwinds zinc-skala, som sitets egne farver er en del af
(`src/styles/colors.js`: paper er zinc-50, ink er zinc-800). Hvor 3D har brug for flere mørke trin,
blandes der et halvt trin mellem to naboer, fx zinc-750 midt mellem zinc-700 og zinc-800. Så har
alle toner zincs svagt kølige skær, og intet er hentet andre steder fra.

| rolle                      | zinc                         | værdi                         |
|----------------------------|------------------------------|-------------------------------|
| baggrund (bag det hele)    | zinc-800 (ink)               | `#27272a`                     |
| jord                       | zinc-850                     | `#202023`                     |
| huse, vægge                | zinc-750 · 725 · 700         | `#333338` `#39393f` `#3f3f46` |
| tage                       | zinc-775 · 650               | `#2d2d31` `#494951`           |
| gader                      | zinc-700, dæmpede            | `#3f3f46`                     |
| stier                      | zinc-750, dæmpede            | `#333338`                     |
| træer, kroner              | zinc-700 · 650 · 600         | `#3f3f46` `#494951` `#52525b` |
| stammer                    | zinc-775                     | `#2d2d31`                     |
| pejlemærket (ét pr. værk)  | zinc-550, tag zinc-500       | `#62626b` `#71717a`           |
| dis                        | zinc-575                     | `#5a5a63`                     |
| kanter                     | zinc-50 (paper), meget svagt | `#fafafa`                     |
| lyden                      | zinc-50 (paper), hvid        | `#fafafa`                     |

Vand er zinc-900 (`#18181b`), mørkere end land. Tågen er zinc-300 i Tværveje og zinc-500 i Kanon i
G3, hvor den ligger tættere på.

Ingen tonemapping (`THREE.NoToneMapping`), så gråtonerne står, som de er skrevet. Ingen farve
nogen steder; også lyden er hvid.

## Streg: meget svag

Alle kanter tegnes med en tynd linje i paper. Den skal kun lige kunne ses, som en blyantslinje på en
model: 0,06 på huse, 0,04 på træer og 0,18 på pejlemærket (40 % af "let" i labbet). Linjerne går i
disen med resten.

Stregen er `EdgesGeometry` (kanter over 30°, `edgeLines()` i `kit/style.js`) på pejlemærket, husene
og træerne. Den er 1 pixel bred; viser den sig for tynd på telefoner, kan den senere bygges som et
efterbehandlet lag ud fra dybde og normaler (Sobel), så den har samme tykkelse på alle skærme.

## Lys: modelbord

Som en arkitektmodel på et bord: blødt himmellys og en lav sol med bløde skygger.

- `HemisphereLight(0xe8e8ec, 0x202024, 1.6)` og en hvid sol `DirectionalLight(0xffffff, 1.5)`, lav
  fra sydvest (`LIGHT` i `kit/style.js`). Alle tre værker bruger det samme lyssæt. (Labbet bruger
  en ældre three.js med andre lysenheder, så dets tal kan ikke flyttes direkte.)
- Skygger kun fra solen. Skyggekortet er 2048 på computer og 1024 på telefon (`shadowMapSize()`).
- Ler (intet sollys, alt mørkere ned mod jorden) er det lette alternativ, hvis en scene er for tung
  på telefon. Det ligger i labbet.
- Lyden lyser selv (`MeshBasicMaterial`, additiv blending på stråler, pøl og ringe) og påvirker
  ikke resten af scenens lys.

## Form

- Low-poly og facetteret (`flatShading`), uden teksturer. Ét materiale til alt: `MeshLambertMaterial`
  med `vertexColors` (`greyMaterial()`).
- Træer, buske, huse, blokke, biler, veje og dis kommer fra byggesættet (`kit/`, se
  `kit/README.md`), så de ser ens ud i alle værker. Træerne er klumper af ikosaedre med facetter
  (`kit/trees.js`: løvtræ, birk, fyr, gran, busk og hæk). Husene bygges ud fra et fodaftryk med
  saddeltag eller fladt tag og uden vinduer (`kit/houses.js`).
- Det, der er unikt for et værk (bunkeren i Kanon i G3, højbanen og sygehuset i 53 sekunder,
  kortet over Nakskov), bygges i værkets egen mappe under `vaerker/`.
- Detaljer, der ikke fortæller noget på kameraets afstand, udelades: biler (53 sekunder har ingen
  biler i stilen, så kun kabinen bevæger sig) og vejstriber (samme farve som vejen).

## Dybde

- Det fjerne går over i den grå dis og forsvinder så i mørket foroven og forneden.
- Disen har samme farve overalt (zinc-575), men hver scene lægger den efter sin egen skala: Tværveje
  hvor byen slutter, 53 sekunder i en ring om højbanen, Kanon i G3 som tåge efter afstand. En ny
  scene lægger den lige bag det, man ser på (omkring 0,95 × kameraafstanden), så den har slugt alt
  ved omkring 1,9 ×.
- Én vignet (`vignette` i `kit/style.js`): ink 0 % → gennemsigtig 15 %, gennemsigtig 60 % → ink
  92 %. Kanon i G3 og 53 sekunder lægger den over billedet; Tværveje bruger den som maske på sit
  lærred (`vignetteMask`).
- Lidt drivende tåge (`kit/mist.js`) er tilladt. Den må ikke ligge som skyer over det, man skal
  se; Tværvejes er skruet ned til omkring halvdelen.
- Får disen eller vignetten synlige trin (banding) på en skærm, rettes det i farverne eller med
  længere gradienter, ikke med et effektlag.

## Intet effektlag

Billedet er rent: intet raster, intet korn, ingen efterbehandling. `PlayerShell` lægger korn over
fotoerne i de andre afspillere; med `model` slås det og de mørke kanter fra, så 3D-modellen står
skarpt (Tværveje, Kanon i G3 og 53 sekunder i stilen).

## Opløsning og mobil

Stilen er billig af natur: ingen teksturer, ingen 3D-filer at hente, få farver. Alt bygges i kode,
og three.js hentes først, når afspilleren åbnes. Det, der koster, er pixels og skygger.

- Opløsning højst 1,5× på telefoner med kantudjævning (`antialias: true`), op til 2× på computer
  (`pixelRatio()`; en telefon er en berøringsskærm uden mus). En telefon med 3× skærm tegner ellers
  4 gange så mange pixels. 1× hvis en scene er tung.
- Højst 30 tegnekald og 150.000 trekanter pr. scene. Alle huse er én geometri, alle træer én
  (testbyen i labbet: 22 tegnekald, omkring 100.000 trekanter).
- Intet effektlag betyder intet ekstra gennemløb af billedet.
- Tegn kun, når noget sker: billedraten falder, når ingen rører, og lyden er stille, og stopper,
  når fanen er skjult.
- Kanterne tegnes først og kan stå alene, mens resten bygges.

## Bevægelse og kamera

- Faste, komponerede vinkler pr. værk og et langsomt drev, når ingen rører. Samme rolige easing
  som sitets fade. Aldrig under jorden, aldrig hurtigt.
- Én form for lyd: kugle for stedet eller lytteren, ringe for lyd, der breder sig, og en tynd stråle
  for hvor: lyttestationen i `kit/station.js`. Ringenes styrke følger lydens faktiske niveau.

## Ind og ud af rummet

- En toning: når scenen er klar, toner 3D-billedet frem fra det mørke på 0,7 sekund (`fadeIn()` og
  `FADE_IN` i `kit/style.js`; med "reducér bevægelse" er det der med det samme). På sigt kommer
  stregen før fladerne.
- Mens scenen hentes, vises den lette streg alene.

## Knappen

Alle værker spilles med én knap, `frame/SoundButton.js`, efter knappen i 53 sekunder til fælles:
rund, fordi rund og hvid er lyd på genhoer.dk.

- **Venter:** en hvid skive. **Lyder:** en mørk, gennemsigtig skive med hvidt indhold.
- **Ringen** om den løber med lyden, eller tæller ned: elevatorturen i 53 sekunder, tiden ved
  overfladen i Under overfladen, fortællingen i Tværveje, tonen i Troldetoner, hele værket i
  tidslinjen.
- **I midten** står det, værket har brug for: et tal (53 sekunders display), et ikon (afspil,
  pause) eller en tone (Troldetoner).
- **Tre størrelser:** stor (én knap: 53 sekunder, Under overfladen, starten), mellem (en række:
  Tværvejes tre fortællinger, Troldetoners fem toner), lille (i tidslinjen).
- Under den: en linje i sitets `Label` (navnet, hvad den gør) og evt. en svagere (årstallet).

## Tekst i rummet

Stednavne og andre etiketter skrives som sitets `Label`: Rem i versaler med spærring. Hvid kun ved
det aktive sted, ellers faint. Felter og pille-knapper er firkantede som på resten af sitet; kun
lydens knap er rund.

## Endnu ikke bygget

Reglerne ovenfor gælder, men disse dele af dem er ikke bygget endnu:

- Stregen før fladerne i toningen. I dag toner hele billedet frem på én gang (`fadeIn()`), og ud
  igen går det med afspillerens overlay.
- Tegn kun, når noget sker. I dag tegner scenerne hele tiden, mens afspilleren er åben.
- Skyggerne regnes kun igen, når noget flytter sig.
- Én fælles easing for kameraerne.
- Lyttestationen i alle tre (i dag kun Tværveje; Kanon i G3 har bølger, 53 sekunder en lampe).

## Når en ny scene laves

1. Hent farver, lys, materiale, kanter, vignet og opløsning fra `kit/style.js`; skriv ingen
   gråtoner selv.
2. Vælg ét pejlemærke, som står et trin lysere.
3. Gør det, der lyder, til det eneste, der lyser og bevæger sig.
4. Sæt disen efter kameraets afstand.
5. Vælg en eller få faste kameravinkler.
