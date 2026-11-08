"""
The centre of Køge round Kirkestræde, as a map for the street interface
(src/player/interfaces/street/StreetScene.js), seen from above as Tværveje's Nakskov. Drawn from one
small extract of OpenStreetMap: 99 objects, under the 100 the OSM Foundation counts as
insubstantial — so keep it to this one extract.

    curl -o koege.osm "https://api.openstreetmap.org/api/0.6/map?bbox=12.1765,55.4548,12.1880,55.4605"
    python3 scripts/osm-map.py koege.osm > src/player/vaerker/kirkestraede/koege.js

What is taken, in this order until there are 99: the four ways of Kirkestræde, Torvet (the square
and the streets round it), Sankt Nicolai Kirke, Køge Å (its water, as an area), Kulturtorvet and
Stationspladsen, and then the other streets nearest Kirkestræde. No houses: the town round the
streets is made up (src/player/kit/town.js), as in Nakskov.

Metres on a sheet with x to the east and y to the south, from the bbox's north-west corner, as
Nakskov's map (src/player/vaerker/tvaerveje/nakskov.js). The streets are thinned to within a metre and
rounded to whole metres; Kirkestræde itself, which you walk, to within 0.2 m and to 0.1 m.
"""
import math
import sys
import xml.etree.ElementTree as ET

LIMIT = 99
WEST, SOUTH, EAST, NORTH = 12.1765, 55.4548, 12.1880, 55.4605
KIRKESTRAEDE = ['868652538', '136597982', '4891585', '675686324']   # from Torvet to past the church
TORVET = ['480379925', '4298260', '4891593']                        # the square, the streets round it
CHURCH = '106410860'                                                 # Sankt Nicolai Kirke
WATER = ['288010230']                                                # Køge Å, as an area
SQUARES = ['847427639', '868645207']                                 # Kulturtorvet, Stationspladsen
MAIN, SIDE, ZONE = {'tertiary'}, {'residential', 'unclassified', 'living_street'}, {'pedestrian'}

root = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
ways = {w.get('id'): w for w in root.iter('way')}
tags = lambda e: {t.get('k'): t.get('v') for t in e.findall('tag')}
K = 111320 * math.cos(math.radians((NORTH + SOUTH) / 2))
WIDTH, HEIGHT = round((EAST - WEST) * K), round((NORTH - SOUTH) * 110574)


def xy(ref):
    lat, lon = nodes[ref]
    return ((lon - WEST) * K, (NORTH - lat) * 110574)


def line(wid):
    return [xy(nd.get('ref')) for nd in ways[wid].findall('nd')]


def thin(pts, tol):
    """Douglas–Peucker"""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    l = math.hypot(dx, dy)
    far, at = 0, 0
    for i, (x, y) in enumerate(pts[1:-1], 1):
        d = abs(dy * (x - ax) - dx * (y - ay)) / l if l else math.hypot(x - ax, y - ay)
        if d > far:
            far, at = d, i
    if far <= tol:
        return [pts[0], pts[-1]]
    return thin(pts[:at + 1], tol)[:-1] + thin(pts[at:], tol)


def svg(pts, closed=False, digits=0):
    r = lambda v: f'{round(v, digits):g}'
    out = []
    for x, y in pts:
        if not out or out[-1] != f'{r(x)},{r(y)}':
            out.append(f'{r(x)},{r(y)}')
    if closed and out[0] == out[-1]:
        out = out[:-1]
    return 'M' + ' L'.join(out) + (' Z' if closed else '')


def dist_to(p, pts):
    best = math.inf
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay
        l = dx * dx + dy * dy
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l)) if l else 0
        best = min(best, math.hypot(ax + dx * t - p[0], ay + dy * t - p[1]))
    return best


def along(p, pts):
    """Metres along the line to the point on it nearest p"""
    best, at, s = math.inf, 0, 0
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) if l2 else 0
        d = math.hypot(ax + dx * t - p[0], ay + dy * t - p[1])
        if d < best:
            best, at = d, s + t * math.sqrt(l2)
        s += math.sqrt(l2)
    return at


# ---- Kirkestræde, from Torvet to past the church ----
street = []
for wid in KIRKESTRAEDE:
    pts = line(wid)
    if street and math.dist(pts[-1], street[-1]) < math.dist(pts[0], street[-1]):
        pts = pts[::-1]
    if not street:
        nxt = line(KIRKESTRAEDE[1])
        if min(math.dist(pts[0], nxt[0]), math.dist(pts[0], nxt[-1])) < min(math.dist(pts[-1], nxt[0]), math.dist(pts[-1], nxt[-1])):
            pts = pts[::-1]
    street += pts if not street else pts[1:]
street = thin(street, 0.2)
taken = list(KIRKESTRAEDE)

main, side, zone = [], [], []
square = line(TORVET[0])
squares = [svg(thin(square, 1), True)]
side += [svg(thin(line(w), 1)) for w in TORVET[1:]]
church = thin(line(CHURCH), 0.5)
water = [svg(thin(line(w), 1.5), True) for w in WATER]
squares += [svg(thin(line(w), 1), True) for w in SQUARES]
taken += TORVET + [CHURCH] + WATER + SQUARES

# ---- the other streets, nearest Kirkestræde first ----
candidates = []
for wid, w in ways.items():
    t = tags(w)
    kind = t.get('highway')
    if wid in taken or t.get('area') == 'yes' or kind not in MAIN | SIDE | ZONE:
        continue
    if kind == 'unclassified' and 'name' not in t:
        continue
    pts = line(wid)
    candidates.append((min(dist_to(p, street) for p in pts), wid, kind, pts))
candidates.sort()
for _, wid, kind, pts in candidates:
    if len(taken) >= LIMIT:
        break
    d = svg(thin(pts, 1))
    (main if kind in MAIN else zone if kind in ZONE else side).append(d)
    taken.append(wid)
assert len(taken) <= LIMIT, len(taken)

length = sum(math.dist(a, b) for a, b in zip(street, street[1:]))
church_from = min(along(p, street) for p in church)
near_square = [p for p in square if dist_to(p, street) < 40]
square_to = max(along(p, street) for p in near_square) if near_square else 0
q = lambda ls: '\n'.join(f'        "{d}",' for d in ls)

print(f"""// The centre of Køge round Kirkestræde, for the street interface (src/player/interfaces/street/StreetScene.js),
// seen from above as Tværveje's Nakskov. Made by scripts/osm-map.py from one small extract of
// OpenStreetMap: {len(taken)} objects (Kirkestræde, Torvet, Sankt Nicolai Kirke, Køge Å, two more
// squares and the streets nearest Kirkestræde), under the 100 the OSM Foundation counts as
// insubstantial — so keep it to this one extract. © OpenStreetMap contributors, ODbL. The houses
// and trees are made up from the streets (src/player/kit/town.js).
//
// Units are metres on a {WIDTH} × {HEIGHT} sheet (x to the east, y to the south), as nakskov.js.
//
//   street     The middle of Kirkestræde, an SVG path from Torvet to past the church ({length:.0f} m)
//   walk       How far along it you walk, in metres: from Torvet to the church
//   water      Køge Å
//   main, side, zone   The through streets, the other streets, the walking streets
//   squares    Torvet, Kulturtorvet and Stationspladsen, closed paths
//   landmarks  Sankt Nicolai Kirke: nave, and a tower with a spire at its west end

export const koege = {{
    width: {WIDTH},
    height: {HEIGHT},
    metres: 1,
    street: "{svg(street, digits=1)}",
    walk: [{round(max(4, square_to - 6)):g}, {round(church_from + 18):g}],
    water: [
{q(water)}
    ],
    main: [
{q(main)}
    ],
    side: [
{q(side)}
    ],
    zone: [
{q(zone)}
    ],
    squares: [
{q(squares)}
    ],
    landmarks: {{
        "Sankt Nicolai Kirke": {{ "kind": "church", "height": 14, "ring": "{svg(church, True)}" }},
    }},
}};""")
print(f'{len(taken)} objects: {len(main)} main, {len(side)} side, {len(zone)} zone; Kirkestræde {length:.0f} m, walk {max(4, square_to - 6):.0f}–{church_from + 18:.0f}; sheet {WIDTH} × {HEIGHT}', file=sys.stderr)
