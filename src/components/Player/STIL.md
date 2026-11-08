# 3D-stilen (udkast)

Fælles regler for værkernes 3D-miljøer: Kanon i G3 (`QuadScene.js`), Tværveje (`WalkScene.js`) og
53 sekunder til fælles (`ElevatorScene.js`), og de værker, der kommer. Stilen bygger på det mørke
design, de tre værker allerede har valgt (`look: 'dark'`), og på valgene i stil-labbet, hvor
trækkene kan prøves på én testscene (forslag G, "Modelbord, let", er den valgte stil):
https://claude.ai/artifact/X7Z4P38MDqWgmMQejeN467

Kort fortalt: en grå arkitektmodel med dæmpede gader, meget svage kanter, hvid lyd og et let raster
i sitets egne gråtoner.

Når den sidste tvivl under **Åbent** er afgjort, flyttes tallene ind i ét modul (`scene/style.js`),
som alle scener henter fra, så de ikke hver har deres egne kopier af de samme gråtoner.

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

I dag har Kanon i G3 baggrunden `#18181b` (zinc-900), og Tværveje og 53 sekunder har lyse gader og
veje. Begge dele rettes.

Ingen tonemapping (`THREE.NoToneMapping`), så gråtonerne står, som de er skrevet. Ingen farve
nogen steder; også lyden er hvid.

## Streg: meget svag

Alle kanter tegnes med en tynd linje i paper. Den skal kun lige kunne ses, som en blyantslinje på en
model: 0,06 på huse, 0,04 på træer og 0,18 på pejlemærket (40 % af "let" i labbet). Linjerne går i
disen med resten.

I skitsen er stregen `EdgesGeometry` (kanter over 30°). I værkerne bygges den som et efterbehandlet
lag ud fra dybde og normaler (Sobel), så linjen har samme tykkelse på alle skærme. `EdgesGeometry`
giver 1-pixel linjer, der bliver for tynde på telefoner.

## Lys: modelbord

Som en arkitektmodel på et bord: blødt himmellys og en lav sol med bløde skygger.

- `HemisphereLight(0xe8e8ec, 0x202024, 1.0)` og en hvid sol `DirectionalLight(0xffffff, 0.75)`, lav
  fra sydvest. Alle tre værker bruger det samme lyssæt; i dag har 53 sekunder halvt så meget lys som
  de andre.
- Skygger kun fra solen, bløde (`PCFSoftShadowMap`). 2048 på computer og 1024 på telefon. Skyggerne
  regnes kun igen, når noget i scenen flytter sig.
- Ler (intet sollys, alt mørkere ned mod jorden) er det lette alternativ, hvis en scene er for tung
  på telefon. Det ligger i labbet.
- Lyden lyser selv (`MeshBasicMaterial`, additiv blending på stråler, pøl og ringe) og påvirker
  ikke resten af scenens lys.

## Form

- Low-poly og facetteret (`flatShading`), uden teksturer. Ét materiale til alt: `MeshLambertMaterial`
  med `vertexColors` (53 sekunder bruger `MeshStandardMaterial` og skal rettes til det samme).
- Én trætype: en klump af ikosaedre (`scene/forest.js`, `toyTree`) i tre størrelser. Tværvejes
  træer (`scene/trees.js`) er også ikosaedre, men uden facetter, så de ser ud som kugler. De skal
  have `flatShading` eller skiftes til `toyTree`.
- Detaljer, der ikke fortæller noget på kameraets afstand, udelades: biler, vinduer, vejstriber.

## Dybde

- Det fjerne går over i den grå dis og forsvinder så i mørket foroven og forneden.
- Disen regnes i forhold til kameraets afstand, så den virker ens i alle skalaer. Den begynder
  lige bag det, man ser på (omkring 0,95 × kameraafstanden), og har slugt alt ved omkring 1,9 ×.
- Én vignet, som `PlayerShell` lægger over alle 3D-interfaces: ink 0 % → gennemsigtig 15 %,
  gennemsigtig 60 % → ink 92 %. I dag har hver scene sin egen udgave.
- Lidt drivende tåge (`scene/mist.js`, `amount` 0,35) er tilladt. Den må ikke ligge som skyer over
  det, man skal se (Tværvejes tåge er for tung tæt på).
- En svag dither i al dis og vignet, også uden raster, så mørke gradienter ikke får striber.

## Effektlag: et let raster i sitets toner

Det færdige billede rastres (ordnet dithering, Bayer 4×4) mellem sitets otte gråtoner, zinc-800 til
zinc-50: `#27272a` `#3f3f46` `#52525b` `#71717a` `#a1a1aa` `#d4d4d8` `#e4e4e7` `#fafafa`. Rasteret
blandes kun 30 % ind over det glatte billede, med fine prikker på 1 CSS-pixel. Det ses som en
tekstur i de bløde overgange og ikke som et mønster, og det fjerner samtidig striber i disen.

- Styrken kan skrues fra 5 til 100 %; 30 % er udgangspunktet. Filmkorn (korn, der skifter 12
  gange i sekundet) kan lægges på i samme lave styrke, hvis billedet skal føles mere levende.
- Prikkerne har samme størrelse på alle skærme: scenen tegnes i 1× opløsning.
- Ved "reducér bevægelse" fryser kornet.

## Opløsning og mobil

Stilen er billig af natur: ingen teksturer, ingen 3D-filer at hente, få farver. Alt bygges i kode,
og three.js hentes først, når afspilleren åbnes. Det, der koster, er pixels og skygger.

- Opløsning 1× (`setPixelRatio(1)`) på telefoner. En telefon med 3× skærm tegner ellers 9 gange så
  mange pixels, og forskellen skjules af rasteret. Op til 2× på computer.
- Højst 30 tegnekald og 150.000 trekanter pr. scene. Alle huse er én geometri, alle træer én
  (testbyen i labbet: 22 tegnekald, omkring 100.000 trekanter).
- Effektlaget er ét ekstra gennemløb af billedet; billigt ved 1×.
- Tegn kun, når noget sker: billedraten falder, når ingen rører, og lyden er stille, og stopper,
  når fanen er skjult.
- Kanterne tegnes først og kan stå alene, mens resten bygges.

## Bevægelse og kamera

- Faste, komponerede vinkler pr. værk og et langsomt drev, når ingen rører. Samme rolige easing
  som sitets fade. Aldrig under jorden, aldrig hurtigt.
- Én form for lyd: kugle for stedet eller lytteren, ringe for lyd, der breder sig, og en tynd stråle
  for hvor. Ringenes styrke følger lydens faktiske niveau.

## Ind og ud af rummet

- Fra projektsiden opløses fotoet i prikker, og modellen tegnes frem: stregen først, så fladerne.
  Ud igen samme vej baglæns. Overgangen kan gå gennem stedets omrids, som Kolding er skåret ud på
  forsiden.
- Mens scenen hentes, vises den lette streg alene.

## Tekst i rummet

Stednavne og andre etiketter skrives som sitets `Label`: Rem i versaler med spærring. Hvid kun ved
det aktive sted, ellers faint. Knapper og felter er firkantede som på resten af sitet.

## Åbent

- Om overgangen ind gennem stedets omrids skal bygges, eller om en prik-opløsning er nok.
- Om filmkorn skal med, eller om rasteret alene er nok.

## Når en ny scene laves

1. Hent farver, lys, dis, vignet og effektlag fra stilen; skriv ingen gråtoner selv.
2. Vælg ét pejlemærke, som står et trin lysere.
3. Gør det, der lyder, til det eneste, der lyser og bevæger sig.
4. Sæt disen efter kameraets afstand.
5. Vælg en eller få faste kameravinkler.
