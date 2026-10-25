# Galleri til projektsider

`npm run media` gør galleriet klar, når et projekt er slut og skal dokumenteres:

1. Åbner en side, hvor du tilføjer billeder, korte klip eller en zip fra Google Fotos
2. Lader dig placere billederne på de 7 pladser og klippene i de 2 videoer, justere udsnittet og skrive teksten til de 2 tekstfelter
3. Beskærer og komprimerer billederne til WebP, sætter klippene sammen til videoer og sætter teksten som SVG
4. Uploader dem til Azure i den mappe, du vælger
5. Skriver links til galleriet i `src/data/projects.js`

Filerne lægges i en midlertidig systemmappe og aldrig i repoet. Arbejdet bliver liggende mellem kørsler, indtil det er uploadet. Knappen **Åbn mappen i Finder** viser de færdige filer.

Videoerne kræver ffmpeg: `brew install ffmpeg`.

## Sådan bruger du det

1. Kør `npm run media`. En side åbner i browseren.

2. Tilføj filer: Træk billeder og klip (MP4, MOV) fra Finder ind på siden, eller klik **Vælg filer…**. Fra Google Fotos markerer du filerne, trykker **Download** (Shift+D) og trækker zip-filen ind. HEIC fra iPhone konverteres automatisk.

   Du kan også angive zip-filen, når du starter: `npm run media -- ~/Downloads/Photos.zip`

3. Placér billeder og klip. Siden viser galleriet i samme opstilling som på projektsiden:
   - **Træk** et billede over på en billedplads eller et klip over på en af de to videoer. Du kan også **klikke** på filen og derefter på pladsen.
   - **Træk i et billede eller klip** for at flytte udsnittet. Det, du ser, er præcis det, der kommer med.
   - **Auto** finder motivet automatisk. **✕** fjerner billedet eller klippet.
   - I en video vælger du et klip i strimlen nederst og flytter det med **←** og **→**. Hvert klip kan have sit eget udsnit.
   - **Tidslinjen** over strimlen viser hele det valgte klip. Den lyse markering er den del, der kommer med i videoen. Træk i markeringen for at flytte den, træk i kanterne for at gøre den kortere eller længere, eller klik på linjen for at flytte markeringen derhen. Den røde markør viser, hvor afspilningen er.
   - **10 s** tilpasser alle markeringer med samme andel, så videoen bliver ca. 10 sekunder.
   - **Klik på et tekstfelt** for at skrive teksten. Der er et felt til teksten øverst til venstre og et til teksten nederst til højre. Teksten sættes med store bogstaver og deles selv på linjer, og dine egne linjeskift bevares. Skriv `**ord**` for fed skrift. Forhåndsvisningen er præcis den fil, der bliver lavet, og du får en advarsel, hvis teksten øverst og nederst overlapper, eller hvis et ord er for langt til én linje.

4. Klik **Lav galleri**, og tjek resultatet. Videoerne kan afspilles fra resultatlisten.

5. Vælg **Projekt** og **Mappe på Azure**. Listen viser mapperne i `media`-containeren, og som standard vælges den mappe, projektets coverbilleder ligger i. Vælg **＋ Ny mappe…** for at oprette en ny. Navnet må kun indeholde små bogstaver, tal og bindestreger. Klik **Upload og opdatér projects.js**.

   - **Du behøver ikke udfylde alle felter.** Kun de filer, du har lavet, uploades. Tomme felter røres ikke på Azure, så du kan f.eks. lave og uploade kun videoerne.
   - **Filer med samme navn overskrives** uden at spørge. Uploadede filer får en cache-tid på 1 time, så en ny udgave slår igennem på siden inden for en time. Skal det gå hurtigere, eller er filen uploadet før denne ændring, så tøm cachen i Azure under **Front Door → Purge** med stien `/media/<mappe>/*`.

6. Stop scriptet med Ctrl+C, og tjek ændringen i `projects.js`. Galleriet henviser til alle 11 filer i mappen, også dem du ikke har lavet her. Siden advarer, hvis nogen af dem mangler på Azure. Commit og push.

Uploader du hele galleriet (7 billeder, 2 videoer og 2 tekster) på én gang, flyttes dine filer og de færdige filer bagefter til papirkurven i en mappe, der hedder `genhoer-<mappe>-<dato>`. Uploader du kun nogle felter, bliver filerne liggende, så du kan arbejde videre. Klik **Ryd op**, når du er færdig med projektet.

## Formater

| Plads | Fil | Størrelse | Mål |
|---|---|---|---|
| 01, 02, 03, 05, 06 | `image-0X.webp` | 1200×1200 | ~400 KB |
| 04 (stor) | `image-04.webp` | 2400×2400 | ~800 KB |
| 07 (bred) | `image-07.webp` | 2400×1200 | ~450 KB |
| video-01, video-02 | `video-0X.mp4` | 1080×1080 | ~10 s, ca. 3 MB |
| text-01, text-02 | `text-0X.svg` | 1200×1200 | ca. 15–70 KB |

**Videoerne** laves af 3–4 klip, hvor du markerer de 2–4 sekunder, der skal med. Et nyt klip får automatisk markeret op til 4 sekunder fra midten. Siden advarer, hvis videoen bliver mere end 1,5 sekund kortere eller længere end 10 sekunder. Videoerne er H.264 uden lyd, 30 billeder i sekundet og klar til web. Galleriet afspiller dem lydløst. HDR-klip fra iPhone omsættes til almindelige farver, så de ikke ser blege ud. Klippene skæres hårdt sammen uden overgange.

## Opsætning af Azure (én gang)

Opret `.env.local` i roden af repoet. Filen er gitignored:

```
AZURE_STORAGE_SAS_URL="https://<konto>.blob.core.windows.net/media?sv=...&sig=..."
```

Sådan laver du SAS-URL'en i Azure-portalen:

1. **Storage accounts** → kontoen bag `cdn.genhoer.dk`
2. **Data storage → Containers** → containeren `media`
3. **Settings → Shared access tokens**
4. Udfyld:
   - Signing method: **Account key**
   - Permissions: **Read, Add, Create, Write, List** (List bruges til at vise mapperne)
   - Expiry: fx ét år frem. Skriv datoen ned, så du ved, hvornår den skal fornyes.
   - Allowed protocols: **HTTPS only**
5. **Generate SAS token and URL** → kopiér **Blob SAS URL** ind i `.env.local`

Del aldrig SAS-URL'en. Den giver skriveadgang til alle medier.

**Når nøglen udløber**, påvirker det ikke hjemmesiden. Den bruges kun til at uploade. Scriptet læser udløbsdatoen fra SAS-URL'en og advarer i Terminal og på siden, når der er under 30 dage tilbage. Når den er udløbet, låses upload med en besked om at lave en ny. Lav en ny på samme måde som ovenfor, og erstat linjen i `.env.local`.

**Tekstfelterne** sættes som kurver i REM, ligesom de tekstfelter, der tidligere er lavet i Figma: Light med store bogstaver, Medium til fed skrift, 54,4 px med 3,3 px bogstavafstand og 80 px linjeafstand på `paper`-baggrund i `ink`. Kurver kan skaleres og vises som billede uden at hente fonten. Fonten kommer fra pakken `@fontsource/rem`, og farverne fra `globals.css`.
