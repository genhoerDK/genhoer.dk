# 3D-stilen (udkast)

Fælles regler for værkernes 3D-miljøer: Kanon i G3 (`QuadScene.js`), Tværveje (`WalkScene.js`) og
53 sekunder til fælles (`ElevatorScene.js`), og de værker, der kommer. Stilen bygger på det mørke
design, de tre værker allerede har valgt (`look: 'dark'`), og på valgene i stil-labbet, hvor
trækkene kan prøves på én testscene (forslag F er den valgte stil):
https://claude.ai/artifact/X7Z4P38MDqWgmMQejeN467

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

## Farver: sitets gråtoner, ingen farve

Gråtonerne er sitets egne (`src/styles/colors.js`) med nogle mellemtrin i de mørke. Hver ting i
scenen har sit trin:

| rolle                      | værdi                                  | i dag                                   |
|----------------------------|----------------------------------------|-----------------------------------------|
| baggrund (bag det hele)    | `#27272a` (ink)                        | Kanon `#18181b`: rettes til ink, som afspilleren, heroen og headeren |
| jord                       | `#1f1f22`                              | alle tre                                |
| huse, vægge                | `#33333a` `#3a3a41` `#42424a`          | Tværveje, 53 sekunder                   |
| tage                       | `#2b2b31` `#4a4a51`                    | Tværveje                                |
| gader og stier             | `#42424a` og `#33333a`: dæmpede, kun et par trin over jorden | Tværveje og 53 sekunder har lyse gader og veje: dæmpes |
| træer, kroner              | `#3f3f46` `#4a4a51` `#55555c`          | alle tre                                |
| stammer                    | `#2e2e33`                              | alle tre                                |
| pejlemærket (ét pr. værk)  | `#6a6a72`, tag `#7a7a82`               | Kanon `#6a6a72`, Tværveje `#55555c`     |
| dis                        | `#5c5c61`                              | alle tre                                |
| lyden                      | `#fafafa` (paper), hvid                | Tværvejes kugle                         |

Ingen tonemapping (`THREE.NoToneMapping`), så gråtonerne står, som de er skrevet. Ingen farve
nogen steder; også lyden er hvid.

## Streg: let

Alle kanter tegnes med en tynd linje i paper, svag nok til at ligne kommunegrænserne på sitets
kort: omkring 0,16 på huse, 0,1 på træer og 0,45 på pejlemærket. Linjerne går i disen med resten.

I skitsen er stregen `EdgesGeometry` (kanter over 30°). I værkerne bygges den som et efterbehandlet
lag ud fra dybde og normaler (Sobel), så linjen har samme tykkelse på alle skærme. `EdgesGeometry`
giver 1-pixel linjer, der bliver for tynde på telefoner.

## Lys: ler

Blødt lys fra hele himlen, ingen sol med skygger, og alt mørkere hvor ting mødes og ned mod jorden
(ambient occlusion). Formen bæres af stregen og af den mørkere fod. Der regnes ingen skygger, så
det er også lettere for telefoner.

- `HemisphereLight(0xe8e8ec, 0x202024)` som det eneste lys af betydning, plus evt. et svagt
  retningslys uden skygger (styrke omkring 0,35), så fladerne ikke er helt ens.
- AO enten bagt i vertex-farverne (mørkere mod foden: 55 % ved jorden, fuld farve ved 60 % af
  højden, som i skitsen) eller som et skærmlag (SSAO). Det bagte er billigst og ser roligst ud.
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

## Effektlag: raster i sitets toner, med filmkorn

Det færdige billede rastres (ordnet dithering, Bayer 4×4) mellem sitets otte gråtoner og ingen
andre: `#27272a` `#3f3f46` `#52525b` `#71717a` `#a1a1aa` `#d4d4d8` `#e4e4e7` `#fafafa`. Før
rastret lægges et filmkorn på ±2,5 %, der skifter 12 gange i sekundet, så prikkerne sitrer en
anelse. Modellen bliver af samme stof som arkivfotoene og resten af sitet.

- Prikkerne er altid 2 CSS-pixel (scenen tegnes i halv opløsning og skaleres op med
  `image-rendering: pixelated`), så telefon og computer ser ens ud.
- Kameraet bevæger sig langsomt, så rasteret ikke "svømmer".
- Ved "reducér bevægelse" fryser kornet.

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

- Om ler skal have et svagt retningslys uden skygger eller ingen retning overhovedet.
- Om overgangen ind gennem stedets omrids skal bygges, eller om en prik-opløsning er nok.

## Når en ny scene laves

1. Hent farver, lys, dis, vignet og effektlag fra stilen; skriv ingen gråtoner selv.
2. Vælg ét pejlemærke, som står et trin lysere.
3. Gør det, der lyder, til det eneste, der lyser og bevæger sig.
4. Sæt disen efter kameraets afstand.
5. Vælg en eller få faste kameravinkler.
