# 3D-stilen (udkast)

Fælles regler for værkernes 3D-miljøer: Kanon i G3 (`QuadScene.js`), Tværveje (`WalkScene.js`) og
53 sekunder til fælles (`ElevatorScene.js`), og de værker, der kommer. Udkastet bygger på det
mørke design, som de tre værker allerede har valgt (`look: 'dark'`), og på stil-labbet, hvor
trækkene kan prøves på én testscene: https://claude.ai/artifact/X7Z4P38MDqWgmMQejeN467

Det, der står under **Fastlagt**, gør de tre værker allerede, eller næsten. Det, der står under
**Åbent**, skal vælges. Når det er valgt, flyttes tallene ind i ét modul (`scene/style.js`), som alle
scener henter fra, så de ikke hver har deres egne kopier af de samme gråtoner.

## Den bærende regel

**Verden er grå, og kun lyden lyser.** Alt, der ikke lyder, er matte gråtoner i faste trin. Det
eneste, der får lys, hvidt eller farve, er det, der har med lyden at gøre: lyttestationen
(Tværveje), kabinen og lampen (53 sekunder), højttalerne og bølgerne (Kanon i G3). Så kan man i
alle værker se, hvor lyden er.

## Fastlagt

### Farver: zinc-trin, ingen farve

Gråtonerne er sitets egne (`src/styles/colors.js`) med nogle mellemtrin. Hver ting i scenen har
sit trin:

| rolle                      | værdi                                  | i dag                                   |
|----------------------------|----------------------------------------|-----------------------------------------|
| baggrund (bag det hele)    | `#18181b`                              | Kanon `#18181b`, de to andre `#27272a`  |
| jord                       | `#1f1f22`                              | alle tre                                |
| huse, vægge                | `#33333a` `#3a3a41` `#42424a` `#4a4a51` | Tværveje, 53 sekunder                  |
| tage                       | `#2b2b31` `#323238` (skifer) · `#55555c` `#5c5c63` (tegl) | Tværveje           |
| træer, kroner              | `#3f3f46` `#4a4a51` `#55555c`          | alle tre                                |
| stammer                    | `#2e2e33`                              | alle tre                                |
| pejlemærket (ét pr. værk)  | `#6a6a72`, tag `#7a7a82`               | Kanon `#6a6a72`, Tværveje `#55555c`     |
| dis                        | `#5c5c61`                              | alle tre                                |
| lyden                      | `#fafafa` (paper)                      | Tværvejes kugle                         |

Ingen tonemapping (`THREE.NoToneMapping`), så gråtonerne står, som de er skrevet.

### Lys: ét lyssæt

- Himmellys `HemisphereLight(0xe8e8ec, 0x202024, 1.6)` og en hvid sol `DirectionalLight(0xffffff, 1.5)`,
  lav fra sydvest. Det har Kanon i G3 og Tværveje i dag; 53 sekunder har `0.9` og `0.95` og skal
  rettes til det samme.
- Skygger kun fra solen, bløde (`PCFSoftShadowMap`, 2048).
- Lyden lyser selv (`MeshBasicMaterial` eller emissive, additiv blending på stråler, pøl og ringe)
  og påvirker ikke resten af scenens lys.

### Form

- Low-poly og facetteret (`flatShading`), uden teksturer. Ét materiale til alt: `MeshLambertMaterial`
  med `vertexColors` (53 sekunder bruger `MeshStandardMaterial` og skal rettes til det samme).
- Én trætype: en klump af ikosaedre (`scene/forest.js`, `toyTree`) i tre størrelser. Tværvejes
  træer (`scene/trees.js`) er også ikosaedre, men uden facetter, så de ser ud som kugler. De skal
  have `flatShading` eller skiftes til `toyTree`.
- Detaljer, der ikke kan ses på kameraets afstand, udelades: vinduesbånd ja, vinduer nej.

### Dybde

- Det fjerne går over i den grå dis og forsvinder så i mørket foroven og forneden.
- Disen regnes i forhold til kameraets afstand, så den virker ens i alle skalaer. Den begynder
  lige bag det, man ser på (omkring 0,95 × kameraafstanden), og har slugt alt ved omkring 1,9 ×.
- Én vignet, som `PlayerShell` lægger over alle 3D-interfaces: `#18181b` 0 % → gennemsigtig 15 %,
  gennemsigtig 60 % → `#18181b` 92 %. I dag har hver scene sin egen udgave.
- Lidt drivende tåge (`scene/mist.js`, `amount` 0,35) er tilladt. Den må ikke ligge som skyer over
  det, man skal se (Tværvejes tåge er for tung tæt på).

### Korn

PlayerShells korn, `opacity` 0,1, over alt.

## Åbent: vælg i stil-labbet

| træk           | muligheder                                                     | foreslået      |
|----------------|----------------------------------------------------------------|----------------|
| Streg          | ingen · kun pejlemærket · alle kanter (blueprint)              | ingen          |
| Lys            | himmel alene · sol og skygge · ler (mørkere mod jorden, ingen skygger) | sol og skygge |
| Gader og stier | lyse linjer (Tværveje) · dæmpede, få trin over jorden          | ?              |
| Opløsning      | fuld · halv · pixel · raster (prikker)                         | fuld på computer, halv på telefon |
| Palet          | zinc · varm grå · blågrå                                       | zinc           |
| Lydens farve   | hvid · varm · koral                                            | hvid           |

Lyse gader gør byen let at læse, men de bryder den bærende regel, fordi gaderne så lyser næsten
lige så meget som lyden. Det samme gælder 53 sekunders lyse vej og tage og Kanon i G3's næsten
hvide stilling. Valget her afgør, hvor lyst pejlemærket og vejene må være.

## Når en ny scene laves

1. Hent farver, lys, dis og vignet fra stilen; skriv ingen gråtoner selv.
2. Vælg ét pejlemærke, som står et trin lysere.
3. Gør det, der lyder, til det eneste, der lyser.
4. Sæt disen efter kameraets afstand.
