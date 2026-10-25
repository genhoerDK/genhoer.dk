# Galleri til projektsider

`npm run media` gør galleribillederne klar, når et projekt er slut og skal dokumenteres:

1. Tager billederne fra `media/input/`
2. Åbner en side, hvor billederne placeres på de 7 pladser, og udsnittet justeres
3. Beskærer, komprimerer og gemmer dem som WebP i `media/output/`
4. Uploader dem til Azure i den mappe, du vælger
5. Skriver links til galleriet i `src/data/projects.js`

Mappen `media/` er gitignored, så billederne kommer ikke på GitHub.

## Sådan bruger du det

1. Læg billederne i `media/input/`. Du kan også markere dem i Google Fotos, trykke **Download** (Shift+D) og give zip-filen til scriptet:

   ```bash
   npm run media -- ~/Downloads/Photos.zip
   ```

   Ligger billederne allerede i `media/input/`, er det bare `npm run media`. HEIC fra iPhone konverteres automatisk.

2. På siden, der åbner i browseren:
   - **Træk** et billede fra højre over på en plads, eller **klik** på billedet og derefter på pladsen.
   - **Træk i et placeret billede** for at flytte udsnittet. Det, du ser, er præcis det, der kommer med.
   - **Auto** finder motivet automatisk. **✕** tømmer pladsen.

3. Klik **Lav billeder**, og tjek resultatet.

4. Vælg **Projekt** og **Mappe på Azure**. Listen viser mapperne i `media`-containeren, og som standard vælges den mappe, projektets coverbilleder ligger i. Vælg **＋ Ny mappe…** for at oprette en ny. Navnet må kun indeholde små bogstaver, tal og bindestreger. Klik **Upload og opdatér projects.js**. Hvis filerne allerede findes i mappen, bliver du spurgt, før de overskrives.

5. Stop scriptet med Ctrl+C, og tjek ændringen i `projects.js`. Galleriet henviser også til `video-01.mp4`, `video-02.mp4`, `text-01.svg` og `text-02.svg` i samme mappe. Upload dem manuelt, hvis de ikke ligger der. Siden advarer, hvis de mangler. Commit og push.

6. Tøm `media/input/`, inden du starter på næste projekt.

## Formater

| Plads | Fil | Størrelse | Mål |
|---|---|---|---|
| 01, 02, 03, 05, 06 | `image-0X.webp` | 1200×1200 | ~300 KB |
| 04 (stor) | `image-04.webp` | 2400×2400 | ~600 KB |
| 07 (bred) | `image-07.webp` | 2400×1200 | ~450 KB |

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
