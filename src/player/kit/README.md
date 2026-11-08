# Byggesættet

Alt det, der går igen i værkernes 3D-miljøer. Et værk bygger sin scene af disse dele og lægger kun
det, der er unikt for det, i sin egen mappe under `src/player/vaerker/<værk>/`. Ændres en del her,
ændres den i alle værker; ændres stilen i `style.js`, ændres den overalt.

| fil            | hvad                                                                                  | bruges af |
|----------------|---------------------------------------------------------------------------------------|-----------|
| `style.js`     | Stilen i tal: gråtonerne (`GREYS`, `zinc()`), lyset, materialet, kanterne, vignetten, toningen, opløsningen (se `../STIL.md`) | alle |
| `random.js`    | Tilfældighed fra et frø, så en scene ser ens ud hver gang                             | alle |
| `shapes.js`    | Grundformerne: `box`, `rod`, `limb`, `band`, `paint`, `placed`, `standUp`             | alle dele herunder |
| `trees.js`     | Træer og buske: `tree(kind, …)` med løvtræ, birk, fyr, gran og busk; `hedge` (en række buske); `trees(list)` (mange som én geometri) | alle tre |
| `houses.js`    | Huse ud fra et fodaftryk (`houses`, `houseAt`), saddeltag eller fladt, uden vinduer; etageblokke (`block`) | Tværveje, 53 sekunder |
| `cars.js`      | En bil (`car`) i husenes gråtoner. Står stille, hvis den bruges: kun lyden bevæger sig | (ingen endnu) |
| `roads.js`     | Gader, stier og flader tegnet efter et kort (SVG-stier), med bløde kanter            | Tværveje |
| `town.js`      | En by ud fra gaderne alene: hvor husene og træerne står (`makeHouses`, `makeTrees`)  | Tværveje |
| `landmarks.js` | Pejlemærkernes dele: tårn, spir, hal, vandtårn, efter mærker på kortet                | Tværveje |
| `haze.js`      | Disen: rundt om et punkt (`createHazeAround`, `hazedAround`) eller over et kort (`hazeMap`, `hazedOverMap`) | 53 sekunder, Tværveje |
| `station.js`   | Lyttestationen: kugle, stråle, lysplet og ringe, hvor en lyd er (`createStation`)    | Tværveje |
| `mist.js`      | Drivende tåge over jorden                                                              | Kanon i G3 |
| `weather.js`   | Regn                                                                                   | 53 sekunder |

## Regler for delene

- **Meter, z op.** Delene bygges med z op, som Kanon i G3 og 53 sekunder. En scene med y op
  (Tværveje) giver `up: 'y'` til `houses()` og `trees()`, eller vender en del med `standUp()`.
- **Farver fra stilen.** Delene tager deres farver fra `GREYS` i `style.js`, og der findes kun den
  ene stil. Et værk skriver aldrig sine egne farver.
- **Én geometri pr. materiale.** Hver del er én geometri uden indeks med farven i hjørnerne, så
  alle dele af en scene kan lægges sammen (`mergeGeometries`) og tegnes med `greyMaterial()` i ét
  tegnekald.
- **Kanterne kommer med.** Læg `edgeLines()` på det samlede (`EDGES.buildings`, `EDGES.trees`,
  `EDGES.landmark`).
- **Et frø.** Al tilfældighed kommer fra `random(seed)`, så byen er den samme hver gang.

## En ny del

Går noget igen i mere end ét værk, eller kan man forestille sig det i det næste, hører det til her.
Er det kun ét værks, hører det til i værkets mappe.
