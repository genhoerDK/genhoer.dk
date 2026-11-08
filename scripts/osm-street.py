"""
Kirkestræde in Køge for the street interface (src/player/interfaces/street/StreetScene.js), drawn from
one small extract of OpenStreetMap: 99 objects, under the 100 the OSM Foundation counts as
insubstantial (as Tværveje's map of Nakskov) — so keep it to this one extract.

    curl -o kirkestraede.osm "https://api.openstreetmap.org/api/0.6/map?bbox=12.1790,55.4560,12.1870,55.4610"
    python3 scripts/osm-street.py kirkestraede.osm > src/player/vaerker/kirkestraede/kirkestraede.js

What is taken, in this order until there are 99: the four ways of Kirkestræde, the streets that
meet it and Torvet, the square itself, Sankt Nicolai Kirke, and then the buildings nearest the
street (a building that is a multipolygon counts twice: the relation and its outer way; its
courtyards are left out, they can't be seen from the street).

Metres, x to the east and z to the south, from a point by Kirkestræde 20. Lines are thinned to
within 0.15 m and rounded to 0.1 m.
"""
import math
import sys
import xml.etree.ElementTree as ET

LIMIT = 99
LAT0, LON0 = 55.45785, 12.18205
KIRKESTRAEDE = ['868652538', '136597982', '4891585', '675686324']   # from Torvet to past the church
STREETS = {                                                          # name: ways
    'Torvet': ['4298260', '4891593'],
    'Lille Kirkestræde': ['4891587'],
    'Nyportstræde': ['157072238'],
    'Sankt Gertrudsstræde': ['675686323'],
    'Nørregade': ['4891577'],
}
SQUARE = '480379925'      # Torvet, place=square
CHURCH = '106410860'      # Sankt Nicolai Kirke
ADDRESS_20 = '340826247'  # Kirkestræde 20: the installation stood here

root = ET.parse(sys.argv[1]).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
ways = {w.get('id'): w for w in root.iter('way')}
tags = lambda e: {t.get('k'): t.get('v') for t in e.findall('tag')}


def xy(ref):
    lat, lon = nodes[ref]
    return ((lon - LON0) * 111320 * math.cos(math.radians(LAT0)), -(lat - LAT0) * 110574)


def line(wid):
    return [xy(nd.get('ref')) for nd in ways[wid].findall('nd')]


def thin(pts, tol=0.15):
    """Douglas–Peucker"""
    if len(pts) < 3:
        return pts
    (ax, az), (bx, bz) = pts[0], pts[-1]
    dx, dz = bx - ax, bz - az
    l = math.hypot(dx, dz)
    far, at = 0, 0
    for i, (x, z) in enumerate(pts[1:-1], 1):
        d = abs(dz * (x - ax) - dx * (z - az)) / l if l else math.hypot(x - ax, z - az)
        if d > far:
            far, at = d, i
    if far <= tol:
        return [pts[0], pts[-1]]
    return thin(pts[:at + 1], tol)[:-1] + thin(pts[at:], tol)


def ring(pts):
    """A closed ring, without the repeated last point, thinned, anticlockwise seen from above (x east, z south)"""
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    # thin as an open line from the point furthest from the first, so the start isn't kept for nothing
    far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
    a = thin(pts[:far + 1])
    b = thin(pts[far:] + [pts[0]])
    pts = a[:-1] + b[:-1]
    area = sum(pts[i - 1][0] * pts[i][1] - pts[i][0] * pts[i - 1][1] for i in range(len(pts)))
    return pts if area > 0 else pts[::-1]


def flat(pts):
    return '[' + ','.join(f'{round(x, 1):g},{round(z, 1):g}' for x, z in pts) + ']'


# ---- the street, from Torvet to past the church ----
street = []
for wid in KIRKESTRAEDE:
    pts = line(wid)
    if street and math.dist(pts[-1], street[-1]) < math.dist(pts[0], street[-1]):
        pts = pts[::-1]
    if not street and wid == KIRKESTRAEDE[0]:
        nxt = line(KIRKESTRAEDE[1])
        if min(math.dist(pts[0], nxt[0]), math.dist(pts[0], nxt[-1])) < min(math.dist(pts[-1], nxt[0]), math.dist(pts[-1], nxt[-1])):
            pts = pts[::-1]
    street += pts if not street else pts[1:]
taken = list(KIRKESTRAEDE)


def dist_to(p, pts):
    best = math.inf
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        dx, dz = bx - ax, bz - az
        l = dx * dx + dz * dz
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / l)) if l else 0
        best = min(best, math.hypot(ax + dx * t - p[0], az + dz * t - p[1]))
    return best


def along(p, pts):
    """Metres along the line to the point on it nearest p"""
    best, at, s = math.inf, 0, 0
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        dx, dz = bx - ax, bz - az
        l2 = dx * dx + dz * dz
        t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / l2)) if l2 else 0
        d = math.hypot(ax + dx * t - p[0], az + dz * t - p[1])
        if d < best:
            best, at = d, s + t * math.sqrt(l2)
        s += math.sqrt(l2)
    return at


streets = {}
for name, wids in STREETS.items():
    streets[name] = [thin(line(w)) for w in wids]
    taken += wids
square = ring(line(SQUARE))
church = ring(line(CHURCH))
taken += [SQUARE, CHURCH]

# ---- the buildings nearest the street ----
inner_or_outer = {}
for rel in root.iter('relation'):
    t = tags(rel)
    if 'building' not in t or t.get('type') != 'multipolygon':
        continue
    for m in rel.findall('member'):
        if m.get('type') == 'way' and m.get('role') == 'outer':
            inner_or_outer[m.get('ref')] = rel.get('id')

candidates = []
for wid, w in ways.items():
    if wid == CHURCH:
        continue
    if 'building' not in tags(w) and wid not in inner_or_outer:
        continue
    pts = line(wid)
    if pts[0] != pts[-1]:
        continue
    candidates.append((min(dist_to(p, street) for p in pts), wid))
candidates.sort()

buildings = []
for _, wid in candidates:
    cost = 2 if wid in inner_or_outer else 1
    if len(taken) + cost > LIMIT:
        break
    buildings.append(ring(line(wid)))
    taken += [wid] + ([inner_or_outer[wid]] if wid in inner_or_outer else [])
assert len(taken) <= LIMIT, len(taken)

length = sum(math.dist(a, b) for a, b in zip(street, street[1:]))
at20 = along(xy(ADDRESS_20), street)
church_from = min(along(p, street) for p in church)
square_to = max(along(p, street) for p in square if dist_to(p, street) < 40) if any(dist_to(p, street) < 40 for p in square) else 0

print(f"""// Kirkestræde in Køge, from Torvet to Sankt Nicolai Kirke, for the street interface
// (src/player/interfaces/street/StreetScene.js). Made by scripts/osm-street.py from one small extract of
// OpenStreetMap: {len(taken)} objects (Kirkestræde, the streets that meet it, Torvet, the church and the
// buildings nearest the street), under the 100 the OSM Foundation counts as insubstantial — so keep
// it to this one extract. © OpenStreetMap contributors, ODbL.
//
// Metres, x to the east and z to the south. The houses' heights, roofs and timbering are made up
// (src/player/interfaces/street/street.js): OSM only has their footprints.
//
//   street     The middle of Kirkestræde, [x, z, x, z, ...], from Torvet to past the church ({length:.0f} m)
//   walk       How far along it you can walk, in metres: from Torvet to the church
//   at20       Metres along it to Kirkestræde 20, where the installation stood
//   streets    The streets that meet it, by name: lines like `street`
//   square     Torvet, a ring
//   church     Sankt Nicolai Kirke, a ring; tower at its west end
//   buildings  The other buildings' footprints, rings (anticlockwise seen from above)

export const kirkestraede = {{
    street: {flat(street)},
    walk: [{round(max(4, square_to - 6)):g}, {round(church_from + 18):g}],
    at20: {round(at20, 1):g},
    streets: {{
{chr(10).join(f"        '{n}': [{', '.join(flat(l) for l in ls)}]," for n, ls in streets.items())}
    }},
    square: {flat(square)},
    church: {flat(church)},
    buildings: [
{chr(10).join(f'        {flat(b)},' for b in buildings)}
    ],
}};""")
print(f'{len(taken)} objects, {len(buildings)} buildings, street {length:.0f} m, no. 20 at {at20:.0f} m, church from {church_from:.0f} m, square to {square_to:.0f} m', file=sys.stderr)
