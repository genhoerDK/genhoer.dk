// Gør galleribilleder klar til en projektside, når projektet er slut og skal dokumenteres:
// beskærer, komprimerer til WebP, uploader til Azure og skriver links i src/data/projects.js.
//
// Brug:
//   npm run media                    Åbn billederne i media/input/
//   npm run media -- <fil.zip>       Pak en zip fra Google Fotos ud i media/input/ og åbn
//
// Scriptet åbner en side i browseren, hvor billederne placeres på de 7 pladser, udsnittet
// justeres, og projekt og Azure-mappe vælges. Se scripts/media/README.md.

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MEDIA_DIR = path.join(ROOT, 'media');
const INPUT_DIR = path.join(MEDIA_DIR, 'input');
const OUTPUT_DIR = path.join(MEDIA_DIR, 'output');
const CACHE_DIR = path.join(MEDIA_DIR, '.cache');
const LAYOUT_FILE = path.join(INPUT_DIR, 'layout.json');
const PROJECTS_FILE = path.join(ROOT, 'src/data/projects.js');
const CDN = 'https://cdn.genhoer.dk/media';
const PORT = 4747;

// Plads -> output, størrelse og mål for filstørrelse i KB
const TARGETS = [
  { slot: '01', out: 'image-01.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '02', out: 'image-02.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '03', out: 'image-03.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '04', out: 'image-04.webp', width: 2400, height: 2400, kb: 600 },
  { slot: '05', out: 'image-05.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '06', out: 'image-06.webp', width: 1200, height: 1200, kb: 300 },
  { slot: '07', out: 'image-07.webp', width: 2400, height: 1200, kb: 450 },
];

// Rækkefølgen i galleriet. Videoer og tekst-SVG'er uploades stadig manuelt
const GALLERY = ['image-01.webp', 'image-02.webp', 'image-03.webp', 'image-04.webp', 'text-01.svg', 'video-01.mp4', 'image-05.webp', 'text-02.svg', 'image-06.webp', 'video-02.mp4', 'image-07.webp'];

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.avif', '.heic', '.heif'];
const isImage = file => IMAGE_EXT.includes(path.extname(file).toLowerCase()) && !path.basename(file).startsWith('.');
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

async function importZip(zipPath) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'genhoer-zip-'));
  execFileSync('ditto', ['-x', '-k', zipPath, tmp]);
  let count = 0;
  for (const file of (await walk(tmp)).filter(isImage)) {
    let target = path.join(INPUT_DIR, path.basename(file));
    const existing = await fs.stat(target).catch(() => null);
    if (existing) {
      if (existing.size === (await fs.stat(file)).size) continue;
      const { name, ext } = path.parse(target);
      target = path.join(INPUT_DIR, `${name}-${Date.now()}${ext}`);
    }
    await fs.copyFile(file, target);
    count++;
  }
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`Pakkede ${count} billeder ud i ${INPUT_DIR}`);
}

// sharp kan ikke læse iPhone-HEIC, så de konverteres til JPG med macOS' sips.
// Originalen flyttes til media/input/.heic/
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

async function listPhotos() {
  const files = (await fs.readdir(INPUT_DIR)).filter(isImage).sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
  return Promise.all(files.map(async name => ({ name, ...(await orientedSize(path.join(INPUT_DIR, name))) })));
}

async function readLayout(photos) {
  const names = new Set(photos.map(p => p.name));
  try {
    const saved = JSON.parse(await fs.readFile(LAYOUT_FILE, 'utf8'));
    // Spring pladser over, hvis billedet ikke længere ligger i input
    return Object.fromEntries(Object.entries(saved).filter(([, e]) => names.has(e.file)));
  } catch {
    // Intet layout endnu: brug filer der hedder 01–07, hvis de findes
    const layout = {};
    for (const { slot } of TARGETS) {
      const match = photos.find(p => path.parse(p.name).name === slot);
      if (match) layout[slot] = { file: match.name, ...(await attentionFocus(match.name, slot)) };
    }
    return layout;
  }
}

// Finder motivet med sharp og omregner til et fokuspunkt (0–1), der svarer til CSS object-position
async function attentionFocus(name, slot) {
  const t = TARGETS.find(t => t.slot === slot);
  const file = path.join(INPUT_DIR, name);
  const w = 400, h = Math.round(400 * t.height / t.width);
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

async function thumbnail(name) {
  const src = path.join(INPUT_DIR, name);
  const { size, mtimeMs } = await fs.stat(src);
  const file = path.join(CACHE_DIR, `${name}-${size}-${Math.round(mtimeMs)}.jpg`);
  try {
    return await fs.readFile(file);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const buf = await sharp(src).rotate().resize(900, 900, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
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

async function build(layout) {
  await fs.writeFile(LAYOUT_FILE, JSON.stringify(layout, null, 2));
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log('\nBehandler billeder');

  const results = [];
  for (const t of TARGETS) {
    const entry = layout[t.slot];
    if (!entry) {
      console.warn(`  ⚠ plads ${t.slot} er tom — springer ${t.out} over`);
      continue;
    }
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
    results.push({ slot: t.slot, out: t.out, kb, q, overTarget, upscaled });
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

async function upload({ slug, folder, force }) {
  if (!validFolder(folder)) throw new Error('Mappenavnet må kun indeholde små bogstaver, tal og bindestreger');
  const files = (await fs.readdir(OUTPUT_DIR)).filter(f => f.endsWith('.webp'));
  if (files.length !== TARGETS.length) throw new Error(`Der er kun ${files.length} af ${TARGETS.length} billeder. Udfyld alle pladser, og klik Lav billeder igen`);

  const client = await container();
  if (!force) {
    const existing = [];
    for (const file of files) if (await client.getBlockBlobClient(`${folder}/${file}`).exists()) existing.push(file);
    if (existing.length) return { conflict: existing };
  }

  console.log(`\nUploader til ${CDN}/${folder}/`);
  for (const file of files) {
    await client.getBlockBlobClient(`${folder}/${file}`).uploadFile(path.join(OUTPUT_DIR, file), {
      blobHTTPHeaders: { blobContentType: 'image/webp' },
    });
    console.log(`  ↑ ${file}`);
  }
  await updateProjects(slug, folder);

  const missing = [];
  for (const file of GALLERY.filter(f => !f.endsWith('.webp'))) {
    const res = await fetch(`${CDN}/${folder}/${file}`, { method: 'HEAD' }).catch(() => null);
    if (!res?.ok) missing.push(file);
  }
  if (missing.length) console.warn(`⚠ mangler stadig på Azure: ${missing.join(', ')}`);
  return { uploaded: files.map(f => `${CDN}/${folder}/${f}`), missing };
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

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const name = url.searchParams.get('name');
  // Filnavne må kun pege på billeder direkte i inputmappen
  if (name !== null && (name !== path.basename(name) || !isImage(name))) return send(res, 400, { error: 'Ugyldigt filnavn' });

  if (url.pathname === '/') return send(res, 200, await fs.readFile(path.join(import.meta.dirname, 'ui.html')), 'text/html; charset=utf-8');
  if (url.pathname === '/api/state') {
    const photos = await listPhotos();
    return send(res, 200, {
      targets: TARGETS, photos, layout: await readLayout(photos), projects: await listProjects(),
      azureReady: !!process.env.AZURE_STORAGE_SAS_URL,
    });
  }
  if (url.pathname === '/api/folders') return send(res, 200, await listFolders());
  if (url.pathname === '/api/thumb') return send(res, 200, await thumbnail(name), 'image/jpeg');
  if (url.pathname === '/api/focus') return send(res, 200, await attentionFocus(name, url.searchParams.get('slot')));
  if (url.pathname === '/api/build' && req.method === 'POST') return send(res, 200, await build(await readBody(req)));
  if (url.pathname === '/api/upload' && req.method === 'POST') return send(res, 200, await upload(await readBody(req)));
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

if (!(await fs.readdir(INPUT_DIR)).some(isImage)) {
  console.log(`Ingen billeder i ${INPUT_DIR}\nLæg billeder i mappen, eller angiv en zip-fil: npm run media -- ~/Downloads/Photos.zip`);
  process.exit(0);
}

const server = http.createServer((req, res) => handle(req, res).catch(err => {
  console.error(err.message);
  send(res, 500, { error: err.message });
}));
// Prøv næste port, hvis scriptet allerede kører i et andet vindue
let port = PORT;
server.on('error', err => {
  if (err.code !== 'EADDRINUSE' || port >= PORT + 10) throw err;
  server.listen(++port, '127.0.0.1');
});
server.on('listening', () => {
  const address = `http://localhost:${port}`;
  console.log(`\nÅbner ${address} — tryk Ctrl+C for at stoppe`);
  if (!process.env.NO_OPEN) execFileSync('open', [address]);
});
server.listen(port, '127.0.0.1');
