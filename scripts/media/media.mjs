// Gør galleriet klar til en projektside, når projektet er slut og skal dokumenteres:
// beskærer og komprimerer billeder til WebP, sætter korte klip sammen til de to videoer,
// uploader til Azure og skriver links i src/data/projects.js.
//
// Brug:
//   npm run media                    Åbn siden og tilføj billeder, klip eller en zip fra Google Fotos dér
//   npm run media -- <fil.zip>       Pak en zip ud med det samme og åbn siden
//
// Scriptet åbner en side i browseren, hvor billeder og klip placeres i galleriet, udsnittet
// justeres, og projekt og Azure-mappe vælges. Se scripts/media/README.md.
// Videoerne kræver ffmpeg (brew install ffmpeg).

import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const STARTED = Date.now();

const ROOT = path.resolve(import.meta.dirname, '../..');
// Filerne er kun mellemtrin, så de ligger i systemets midlertidige mappe og ikke i repoet.
// Arbejdet bliver liggende mellem kørsler, indtil det er uploadet
const WORK_DIR = process.env.MEDIA_WORK_DIR ?? path.join(os.tmpdir(), 'genhoer-media');
const INPUT_DIR = path.join(WORK_DIR, 'input');
const OUTPUT_DIR = path.join(WORK_DIR, 'output');
const CACHE_DIR = path.join(WORK_DIR, 'cache');
const LAYOUT_FILE = path.join(INPUT_DIR, 'layout.json');
const PROJECTS_FILE = path.join(ROOT, 'src/data/projects.js');
const CDN = 'https://cdn.genhoer.dk/media';
const PORT = Number(process.env.MEDIA_PORT ?? 4747);

// Billedpladser -> output, størrelse og mål for filstørrelse i KB
const TARGETS = [
  { slot: '01', out: 'image-01.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '02', out: 'image-02.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '03', out: 'image-03.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '04', out: 'image-04.webp', width: 2400, height: 2400, kb: 600 },
  { slot: '05', out: 'image-05.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '06', out: 'image-06.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '07', out: 'image-07.webp', width: 2400, height: 1200, kb: 450 },
];

// Videopladser. De markerede udsnit af klippene sættes sammen til en video på ca. 10 sekunder.
// Galleriet viser videoerne i kvadratiske felter uden lyd, så de laves kvadratiske og uden lydspor
const VIDEO_TARGETS = [
  { slot: 'v1', out: 'video-01.mp4', size: 1080, seconds: 10 },
  { slot: 'v2', out: 'video-02.mp4', size: 1080, seconds: 10 },
];

// Rækkefølgen i galleriet. Tekst-SVG'erne uploades stadig manuelt
const GALLERY = ['image-01.webp', 'image-02.webp', 'image-03.webp', 'image-04.webp', 'text-01.svg', 'video-01.mp4', 'image-05.webp', 'text-02.svg', 'image-06.webp', 'video-02.mp4', 'image-07.webp'];

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.avif', '.heic', '.heif'];
const VIDEO_EXT = ['.mp4', '.mov', '.m4v'];
const hasExt = (file, list) => list.includes(path.extname(file).toLowerCase()) && !path.basename(file).startsWith('.');
const isImage = file => hasExt(file, IMAGE_EXT);
const isVideo = file => hasExt(file, VIDEO_EXT);
const isMedia = file => isImage(file) || isVideo(file);
const isHeic = file => ['.heic', '.heif'].includes(path.extname(file).toLowerCase());
const validFolder = folder => /^[a-z0-9][a-z0-9-]*$/.test(folder);

// --- Input ---

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__MACOSX' ? [] : walk(full);
    return [full];
  }));
  return files.flat();
}

// Kopierer et billede eller klip ind. Samme navn og størrelse regnes som den samme fil og springes over
async function addMedia(file, name) {
  if (isVideo(name)) {
    await probe(file).catch(() => { throw new Error(`${name} kan ikke læses som en video`); });
  } else if (!isHeic(name)) {
    await sharp(file).metadata().catch(() => { throw new Error(`${name} kan ikke læses som et billede`); });
  }
  let target = path.join(INPUT_DIR, name);
  // HEIC-originaler ligger i .heic/, når de er konverteret
  const existing = await fs.stat(target).catch(() => null) ?? (isHeic(name) ? await fs.stat(path.join(INPUT_DIR, '.heic', name)).catch(() => null) : null);
  if (existing) {
    if (existing.size === (await fs.stat(file)).size) return false;
    const { name: base, ext } = path.parse(name);
    target = path.join(INPUT_DIR, `${base}-${Date.now()}${ext}`);
  }
  await fs.copyFile(file, target);
  return true;
}

async function importZip(zipPath, label = path.basename(zipPath)) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'genhoer-zip-'));
  execFileSync('ditto', ['-x', '-k', zipPath, tmp]);
  let count = 0;
  for (const file of (await walk(tmp)).filter(isMedia)) {
    try {
      if (await addMedia(file, path.basename(file))) count++;
    } catch (err) {
      console.warn(`  ⚠ ${err.message} — springer over`);
    }
  }
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`Pakkede ${count} filer ud fra ${label}`);
}

// Modtager én fil fra siden: et billede, et klip eller en zip fra Google Fotos
async function receiveFile(req, filename) {
  const name = path.basename(filename ?? '');
  const isZip = path.extname(name).toLowerCase() === '.zip';
  if (!isZip && !isMedia(name)) throw new Error(`${name} er hverken et billede, et klip eller en zip-fil`);

  const tmp = path.join(WORK_DIR, `upload-${Date.now()}-${name}`);
  await pipeline(req, createWriteStream(tmp));
  try {
    if (isZip) await importZip(tmp, name);
    else if (await addMedia(tmp, name)) console.log(`Tilføjede ${name}`);
  } finally {
    await fs.rm(tmp, { force: true });
  }
  await convertHeic();
  return listMedia();
}

// sharp kan ikke læse iPhone-HEIC, så de konverteres til JPG med macOS' sips.
// Originalen flyttes til input/.heic/
async function convertHeic() {
  for (const file of (await fs.readdir(INPUT_DIR)).filter(isHeic)) {
    const src = path.join(INPUT_DIR, file);
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '100', src, '--out', path.join(INPUT_DIR, `${path.parse(file).name}.jpg`)], { stdio: 'ignore' });
    await fs.mkdir(path.join(INPUT_DIR, '.heic'), { recursive: true });
    await fs.rename(src, path.join(INPUT_DIR, '.heic', file));
  }
}

async function orientedSize(file) {
  const meta = await sharp(file).metadata();
  return meta.autoOrient ?? { width: meta.width, height: meta.height };
}

// Varighed, størrelse (efter rotation) og om klippet er HDR, som på nyere iPhones
async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,avg_frame_rate,color_transfer:stream_side_data=rotation:format=duration', '-of', 'json', file]);
  const info = JSON.parse(stdout);
  const stream = info.streams?.[0];
  if (!stream) throw new Error('Ingen video i filen');
  const rotation = Math.round(stream.side_data_list?.find(d => d.rotation !== undefined)?.rotation ?? 0);
  const turned = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
  const [num, den] = (stream.avg_frame_rate ?? '30/1').split('/').map(Number);
  return {
    width: turned ? stream.height : stream.width,
    height: turned ? stream.width : stream.height,
    duration: Number(info.format.duration),
    fps: num && den ? num / den : 30,
    rotation,
    hdr: ['smpte2084', 'arib-std-b67'].includes(stream.color_transfer),
  };
}

async function cacheKey(name) {
  const { size, mtimeMs } = await fs.stat(path.join(INPUT_DIR, name));
  return `${name}-${size}-${Math.round(mtimeMs)}`;
}

async function listMedia() {
  const files = (await fs.readdir(INPUT_DIR)).filter(isMedia).sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
  return Promise.all(files.map(async name => {
    const file = path.join(INPUT_DIR, name);
    if (!isVideo(name)) return { name, kind: 'image', ...(await orientedSize(file)) };
    const { width, height, duration } = await probe(file);
    return { name, kind: 'video', width, height, duration };
  }));
}

async function readLayout(media) {
  const names = new Set(media.map(p => p.name));
  try {
    const saved = JSON.parse(await fs.readFile(LAYOUT_FILE, 'utf8'));
    // Spring billeder og klip over, hvis de ikke længere ligger i input
    const layout = {};
    for (const [slot, entry] of Object.entries(saved)) {
      if (entry.clips) {
        const clips = entry.clips.filter(c => names.has(c.file));
        if (clips.length) layout[slot] = { clips };
      } else if (names.has(entry.file)) {
        layout[slot] = entry;
      }
    }
    return layout;
  } catch {
    // Intet layout endnu: brug billeder der hedder 01–07, hvis de findes
    const layout = {};
    for (const { slot } of TARGETS) {
      const match = media.find(p => p.kind === 'image' && path.parse(p.name).name === slot);
      if (match) layout[slot] = { file: match.name, ...(await attentionFocus(match.name, slot)) };
    }
    return layout;
  }
}

function slotAspect(slot) {
  const t = TARGETS.find(t => t.slot === slot);
  return t ? t.width / t.height : 1;
}

// Finder motivet med sharp og omregner til et fokuspunkt (0–1), der svarer til CSS object-position.
// For klip bruges et billede fra midten af klippet
async function attentionFocus(name, slot) {
  const file = isVideo(name) ? await poster(name) : path.join(INPUT_DIR, name);
  const w = 400, h = Math.round(400 / slotAspect(slot));
  const { info } = await sharp(file).rotate()
    .resize(w, h, { fit: 'cover', position: sharp.strategy.attention })
    .toBuffer({ resolveWithObject: true });
  const src = await orientedSize(file);
  const scale = Math.max(w / src.width, h / src.height);
  const overflowX = src.width * scale - w, overflowY = src.height * scale - h;
  return {
    fx: overflowX > 1 ? Math.min(1, -info.cropOffsetLeft / overflowX) : 0.5,
    fy: overflowY > 1 ? Math.min(1, -info.cropOffsetTop / overflowY) : 0.5,
  };
}

// Filter der omsætter HDR-klip til almindelige farver, så de ikke ser blege ud på nettet
const TONEMAP = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv';

// ffmpeg drejer selv klip efter metadata, men ikke pålideligt, når flere klip sættes sammen
// (og -noautorotate virker heller ikke altid). Derfor nulstilles rotationen i metadata med
// -display_rotation 0, og klippet drejes her ud fra den rotation, ffprobe viser
function orient(rotation) {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 270) return 'transpose=clock,';
  if (r === 90) return 'transpose=cclock,';
  if (r === 180) return 'hflip,vflip,';
  return '';
}
const colors = clip => (clip.hdr ? `${TONEMAP},` : '');
const NO_ROTATION = ['-display_rotation', '0'];

async function poster(name) {
  const file = path.join(CACHE_DIR, `${await cacheKey(name)}.poster.jpg`);
  if (await fs.stat(file).catch(() => null)) return file;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const src = path.join(INPUT_DIR, name);
  const clip = await probe(src);
  await run('ffmpeg', ['-v', 'error', ...NO_ROTATION, '-ss', String(clip.duration / 2), '-i', src, '-frames:v', '1',
    '-vf', `${orient(clip.rotation)}${colors(clip)}scale=900:900:force_original_aspect_ratio=decrease,format=yuvj420p`, '-q:v', '3', '-y', file]);
  return file;
}

// Lille H.264-udgave til afspilning på siden. iPhone-klip er ofte HEVC, som ikke alle browsere kan vise
async function previewClip(name) {
  const file = path.join(CACHE_DIR, `${await cacheKey(name)}.preview.mp4`);
  if (await fs.stat(file).catch(() => null)) return file;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const src = path.join(INPUT_DIR, name);
  const clip = await probe(src);
  const tmp = `${file}.tmp.mp4`;
  await run('ffmpeg', ['-v', 'error', ...NO_ROTATION, '-i', src, '-an',
    '-vf', `${orient(clip.rotation)}${colors(clip)}scale=540:540:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart', '-y', tmp]);
  await fs.rename(tmp, file);
  return file;
}

async function thumbnail(name) {
  if (isVideo(name)) return fs.readFile(await poster(name));
  const file = path.join(CACHE_DIR, `${await cacheKey(name)}.jpg`);
  try {
    return await fs.readFile(file);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const buf = await sharp(path.join(INPUT_DIR, name)).rotate().resize(900, 900, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
    await fs.writeFile(file, buf);
    return buf;
  }
}

// --- Billedbehandling ---

// Finder den højeste kvalitet, hvor filen holder sig under målet
async function encode(raw, maxBytes) {
  const webp = q => sharp(raw.data, { raw: raw.info }).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();
  let lo = 30, hi = 95, best = null;
  while (lo <= hi) {
    const q = Math.floor((lo + hi) / 2);
    const buf = await webp(q);
    if (buf.length <= maxBytes) { best = { buf, q }; lo = q + 1; } else { hi = q - 1; }
  }
  return best ?? { buf: await webp(30), q: 30, overTarget: true };
}

async function buildImage(t, entry) {
  // Drej efter EXIF først, så beskæringen svarer til det, der ses i browseren
  const oriented = await sharp(path.join(INPUT_DIR, entry.file)).rotate().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = oriented.info;
  const aspect = t.width / t.height;
  const wider = w / h > aspect;
  const cw = wider ? Math.round(h * aspect) : w;
  const ch = wider ? h : Math.round(w / aspect);

  const resized = await sharp(oriented.data, { raw: oriented.info })
    .extract({ left: Math.round((w - cw) * entry.fx), top: Math.round((h - ch) * entry.fy), width: cw, height: ch })
    .resize(t.width, t.height)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { buf, q, overTarget = false } = await encode(resized, t.kb * 1024);
  await fs.writeFile(path.join(OUTPUT_DIR, t.out), buf);

  const kb = Math.round(buf.length / 1024);
  const upscaled = cw < t.width;
  console.log(`  ✓ ${t.out.padEnd(16)} ${t.width}×${t.height}  ${String(kb).padStart(4)} KB  (kvalitet ${q})${overTarget ? '  ⚠ over mål' : ''}${upscaled ? '  ⚠ opskaleret' : ''}`);
  return { slot: t.slot, out: t.out, kb, maxKb: t.kb, q, overTarget, upscaled };
}

// --- Videobehandling ---

// Den del af klippet, der kommer med. Uden markering bruges op til 4 sekunder fra midten
const MIN_SEGMENT = 0.3;
function segment(clip) {
  const fallback = Math.min(clip.duration, 4);
  let start = Number.isFinite(clip.in) ? clip.in : (clip.duration - fallback) / 2;
  let end = Number.isFinite(clip.out) ? clip.out : start + fallback;
  start = Math.min(Math.max(0, start), clip.duration - MIN_SEGMENT);
  end = Math.min(Math.max(start + MIN_SEGMENT, end), clip.duration);
  return { ...clip, start, length: end - start };
}

async function buildVideo(t, entry) {
  const clips = await Promise.all(entry.clips.map(async c => segment({ ...c, ...(await probe(path.join(INPUT_DIR, c.file))) })));

  // Klippenes egen billedhastighed bevares (typisk 24 eller 30), dog højst 30, så 24 ikke bliver hakkende
  const fps = Math.min(30, Math.max(...clips.map(c => c.fps)));

  // Hvert klip drejes, beskæres til kvadrat efter sit fokuspunkt og skaleres, og derefter sættes de sammen
  const inputs = clips.flatMap(c => [...NO_ROTATION, '-ss', c.start.toFixed(3), '-t', c.length.toFixed(3), '-i', path.join(INPUT_DIR, c.file)]);
  const chains = clips.map((c, i) => [
    `[${i}:v]`,
    orient(c.rotation),
    colors(c),
    `crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))*${c.fx.toFixed(4)}':'(ih-min(iw,ih))*${c.fy.toFixed(4)}',`,
    `scale=${t.size}:${t.size}:flags=lanczos,fps=${Math.round(fps * 1000) / 1000},setsar=1,format=yuv420p[c${i}]`,
  ].join(''));
  const filter = `${chains.join(';')};${clips.map((_, i) => `[c${i}]`).join('')}concat=n=${clips.length}:v=1:a=0[out]`;

  const file = path.join(OUTPUT_DIR, t.out);
  await run('ffmpeg', ['-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', '23', '-maxrate', '2.5M', '-bufsize', '5M',
    '-movflags', '+faststart', '-y', file], { maxBuffer: 1 << 24 });

  const { size } = await fs.stat(file);
  const seconds = clips.reduce((sum, c) => sum + c.length, 0);
  const smallest = Math.min(...clips.map(c => Math.min(c.width, c.height)));
  const kb = Math.round(size / 1024);
  const upscaled = smallest < t.size;
  console.log(`  ✓ ${t.out.padEnd(16)} ${t.size}×${t.size}  ${String(kb).padStart(4)} KB  (${seconds.toFixed(1)} s, ${clips.length} klip)${upscaled ? '  ⚠ opskaleret' : ''}`);
  return { slot: t.slot, out: t.out, kb, seconds, clips: clips.length, upscaled };
}

async function build(layout) {
  await fs.writeFile(LAYOUT_FILE, JSON.stringify(layout, null, 2));
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log('\nBehandler galleriet');

  const results = [];
  for (const t of TARGETS) {
    if (layout[t.slot]) results.push(await buildImage(t, layout[t.slot]));
    else console.warn(`  ⚠ plads ${t.slot} er tom — springer ${t.out} over`);
  }
  for (const t of VIDEO_TARGETS) {
    if (layout[t.slot]?.clips?.length) results.push(await buildVideo(t, layout[t.slot]));
    else console.warn(`  ⚠ ${t.out} har ingen klip — springer over`);
  }
  console.log(`Færdige filer: ${OUTPUT_DIR}`);
  return results;
}

// --- projects.js ---

// Finder hvert projekts tekstblok, så felter kan læses og erstattes uden at røre resten af filen
function projectBlocks(src) {
  const blocks = [];
  const re = /slug:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    const end = src.indexOf('\n  }', start);
    blocks.push({ slug: m[1], start, end, text: src.slice(start, end) });
  }
  return blocks;
}

async function listProjects() {
  const src = await fs.readFile(PROJECTS_FILE, 'utf8');
  return projectBlocks(src).map(({ slug, text }) => {
    const title = text.match(/title:\s*'([^']*)'/)?.[1] ?? slug;
    // Foreslå den mappe, projektets coverbilleder allerede ligger i
    const folder = text.match(/coverImageLandscape:\s*'https:\/\/cdn\.genhoer\.dk\/media\/([^/']+)\//)?.[1] ?? slug;
    const hasMedia = !/media:\s*null/.test(text);
    return { slug, title, folder, hasMedia };
  });
}

async function updateProjects(slug, folder) {
  const src = await fs.readFile(PROJECTS_FILE, 'utf8');
  const block = projectBlocks(src).find(b => b.slug === slug);
  if (!block) throw new Error(`Projektet '${slug}' findes ikke i projects.js`);

  const list = GALLERY.map(file => `      '${CDN}/${folder}/${file}'`).join(',\n');
  const text = block.text.replace(/media:\s*(null|\[[^\]]*\])/, `media: [\n${list}\n    ]`);
  await fs.writeFile(PROJECTS_FILE, src.slice(0, block.start) + text + src.slice(block.end));
  console.log(`✓ projects.js opdateret for '${slug}'`);
}

// --- Azure ---

async function container() {
  const sasUrl = process.env.AZURE_STORAGE_SAS_URL;
  if (!sasUrl) throw new Error('AZURE_STORAGE_SAS_URL mangler i .env.local — se scripts/media/README.md');
  const { ContainerClient } = await import('@azure/storage-blob');
  return new ContainerClient(sasUrl);
}

// Mapperne i containeren, fx 'viborg' for media/viborg/. Kræver List-rettighed på SAS-URL'en
async function listFolders() {
  const client = await container();
  const folders = [];
  try {
    for await (const item of client.listBlobsByHierarchy('/')) {
      if (item.kind === 'prefix') folders.push(item.name.replace(/\/$/, ''));
    }
  } catch (err) {
    if (err.statusCode === 403) throw new Error('SAS-URL\'en mangler List-rettighed, så mapperne kan ikke vises — se scripts/media/README.md');
    throw err;
  }
  return folders.sort((a, b) => a.localeCompare(b, 'da'));
}

// Flytter input og output til papirkurven, så mappen er tom til næste projekt.
// De kan hentes tilbage fra papirkurven, hvis noget er gået galt
async function cleanUp(folder) {
  const stamp = new Date().toLocaleString('sv-SE').slice(0, 16).replace(/[ :]/g, '-');
  const trash = path.join(os.homedir(), '.Trash', `genhoer-${folder}-${stamp}`);
  await fs.mkdir(trash, { recursive: true });
  for (const [dir, name] of [[INPUT_DIR, 'input'], [OUTPUT_DIR, 'output']]) {
    await fs.cp(dir, path.join(trash, name), { recursive: true });
    await fs.rm(dir, { recursive: true, force: true });
  }
  await fs.rm(CACHE_DIR, { recursive: true, force: true });
  await fs.mkdir(INPUT_DIR, { recursive: true });
  console.log(`✓ input og output er flyttet til papirkurven (${path.basename(trash)})`);
  return path.basename(trash);
}

const CONTENT_TYPES = { '.webp': 'image/webp', '.mp4': 'video/mp4' };

// Front Door gemmer filer og ser bort fra ?v=…, så en overskrevet fil ellers kan blive vist i dagevis.
// Med en kort cache-tid slår en ny udgave igennem inden for en time
const CACHE_CONTROL = 'public, max-age=3600';

// Uploader de filer, der er lavet, og overskriver dem, der allerede ligger i mappen.
// Felter, der ikke er lavet, røres ikke, så man kan arbejde på enkelte felter ad gangen
async function upload({ slug, folder }) {
  if (!validFolder(folder)) throw new Error('Mappenavnet må kun indeholde små bogstaver, tal og bindestreger');
  const files = (await fs.readdir(OUTPUT_DIR).catch(() => [])).filter(f => CONTENT_TYPES[path.extname(f)]);
  if (!files.length) throw new Error('Der er ingen færdige filer. Klik Lav galleri først');

  const client = await container();
  console.log(`\nUploader til ${CDN}/${folder}/`);
  const replaced = [];
  for (const file of files) {
    const blob = client.getBlockBlobClient(`${folder}/${file}`);
    if (await blob.exists()) replaced.push(file);
    await blob.uploadFile(path.join(OUTPUT_DIR, file), {
      blobHTTPHeaders: { blobContentType: CONTENT_TYPES[path.extname(file)], blobCacheControl: CACHE_CONTROL },
    });
    console.log(`  ↑ ${file}${replaced.includes(file) ? ' (overskrevet)' : ''}`);
  }
  await updateProjects(slug, folder);

  const missing = [];
  for (const file of GALLERY.filter(f => !files.includes(f))) {
    const res = await fetch(`${CDN}/${folder}/${file}`, { method: 'HEAD' }).catch(() => null);
    if (!res?.ok) missing.push(file);
  }
  if (missing.length) console.warn(`⚠ mangler stadig på Azure: ${missing.join(', ')}`);
  // Ryd kun op af sig selv, når hele galleriet er uploadet. Ellers kan der arbejdes videre på resten
  const complete = files.length === TARGETS.length + VIDEO_TARGETS.length;
  const trashed = complete ? await cleanUp(folder) : null;
  return { uploaded: files.map(f => `${CDN}/${folder}/${f}`), replaced, missing, trashed };
}

// --- Design ---

// Siden bruger hjemmesidens designtokens og logo direkte fra kildefilerne, så den følger med, når designet ændres
async function designTokens() {
  const css = await fs.readFile(path.join(ROOT, 'src/app/globals.css'), 'utf8');
  const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const vars = theme.match(/^\s*--(color|font|spacing)-[\w-]+:[^;]+;/gm) ?? [];
  const responsive = css.match(/@media[^{]+\{\s*:root\s*\{[^}]*--spacing[^}]*\}\s*\}/g) ?? [];
  return `:root {\n${vars.map(v => v.trim()).join('\n')}\n}\n${responsive.join('\n')}\n`;
}

async function logoSvg() {
  const source = await fs.readFile(path.join(ROOT, 'src/components/UI/Logo.js'), 'utf8');
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 190 32';
  const ink = (await designTokens()).match(/--color-ink:\s*([^;]+);/)?.[1] ?? '#27272a';
  const paths = [...source.matchAll(/\sd="([^"]+)"/g)].map(m => `<path fill="${ink}" d="${m[1]}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${paths}</svg>`;
}

// --- Server ---

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

// Videoer sendes med Range-understøttelse, så browseren kan spole og gentage dem
async function sendVideo(req, res, file) {
  const { size } = await fs.stat(file);
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (!range) {
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    return pipeline(createReadStream(file), res);
  }
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  return pipeline(createReadStream(file, { start, end }), res);
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const name = url.searchParams.get('name');
  // Filnavne må kun pege på billeder og klip direkte i inputmappen
  if (name !== null && (name !== path.basename(name) || !isMedia(name))) return send(res, 400, { error: 'Ugyldigt filnavn' });

  if (url.pathname === '/') return send(res, 200, await fs.readFile(path.join(import.meta.dirname, 'ui.html')), 'text/html; charset=utf-8');
  if (url.pathname === '/design/tokens.css') return send(res, 200, await designTokens(), 'text/css; charset=utf-8');
  if (url.pathname === '/design/logo.svg') return send(res, 200, await logoSvg(), 'image/svg+xml');
  if (url.pathname === '/design/favicon.ico') return send(res, 200, await fs.readFile(path.join(ROOT, 'public/favicon.ico')), 'image/x-icon');
  if (url.pathname === '/api/version') return send(res, 200, { started: STARTED });
  if (url.pathname === '/api/shutdown' && req.method === 'POST') {
    send(res, 200, {});
    console.log('\nStopper, fordi en nyere udgave af scriptet starter');
    setTimeout(() => process.exit(0), 100);
    return;
  }
  if (url.pathname === '/api/state') {
    const media = await listMedia();
    return send(res, 200, {
      targets: TARGETS, videoTargets: VIDEO_TARGETS, gallery: GALLERY, media, layout: await readLayout(media),
      projects: await listProjects(), azureReady: !!process.env.AZURE_STORAGE_SAS_URL,
    });
  }
  if (url.pathname === '/api/folders') return send(res, 200, await listFolders());
  if (url.pathname === '/api/add' && req.method === 'POST') return send(res, 200, await receiveFile(req, url.searchParams.get('file')));
  if (url.pathname === '/api/thumb') return send(res, 200, await thumbnail(name), 'image/jpeg');
  if (url.pathname === '/api/preview') return sendVideo(req, res, await previewClip(name));
  if (url.pathname === '/api/focus') return send(res, 200, await attentionFocus(name, url.searchParams.get('slot')));
  if (url.pathname === '/api/build' && req.method === 'POST') return send(res, 200, await build(await readBody(req)));
  if (url.pathname.startsWith('/output/') && url.pathname.endsWith('.mp4')) {
    return sendVideo(req, res, path.join(OUTPUT_DIR, path.basename(url.pathname)));
  }
  if (url.pathname === '/api/upload' && req.method === 'POST') return send(res, 200, await upload(await readBody(req)));
  if (url.pathname === '/api/cleanup' && req.method === 'POST') return send(res, 200, { trashed: await cleanUp((await readBody(req)).folder || 'galleri') });
  if (url.pathname === '/api/reveal' && req.method === 'POST') {
    execFileSync('open', [OUTPUT_DIR]);
    return send(res, 200, {});
  }
  send(res, 404, { error: 'Ikke fundet' });
}

const zipArg = process.argv[2];
await fs.mkdir(INPUT_DIR, { recursive: true });
if (zipArg) await importZip(path.resolve(zipArg.replace(/^~/, os.homedir())));
await convertHeic();

const server = http.createServer((req, res) => handle(req, res).catch(err => {
  console.error(err.message);
  if (!res.headersSent) send(res, 500, { error: err.message });
}));
// Kører scriptet allerede, åbnes den side i stedet, så to udgaver ikke arbejder i samme mappe.
// Er koden ændret, siden den kørende udgave startede, stoppes den, og den nye startes i stedet.
// Bruges porten af noget andet, prøves den næste
let port = PORT;
server.on('error', async err => {
  if (err.code !== 'EADDRINUSE' || port >= PORT + 10) throw err;
  const base = `http://localhost:${port}`;
  const running = await fetch(`${base}/design/tokens.css`).then(res => res.ok).catch(() => false);
  const version = running && await fetch(`${base}/api/version`).then(res => (res.ok ? res.json() : null)).catch(() => null);
  const { mtimeMs } = await fs.stat(import.meta.filename);
  if (version && mtimeMs > version.started) {
    console.log('Stopper den kørende udgave, fordi scriptet er opdateret');
    await fetch(`${base}/api/shutdown`, { method: 'POST' }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 500));
    return server.listen(port, '127.0.0.1');
  }
  if (running) {
    console.log(`Scriptet kører allerede på http://localhost:${port} — åbner den side`);
    if (!process.env.NO_OPEN) execFileSync('open', [`http://localhost:${port}`]);
    process.exit(0);
  }
  server.listen(++port, '127.0.0.1');
});
server.on('listening', () => {
  const address = `http://localhost:${port}`;
  console.log(`\nÅbner ${address} — tryk Ctrl+C for at stoppe`);
  if (!process.env.NO_OPEN) execFileSync('open', [address]);
});
server.listen(port, '127.0.0.1');
