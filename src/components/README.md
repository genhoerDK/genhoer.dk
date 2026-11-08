# Components

## Folders

| Folder | What goes here | May import from |
|---|---|---|
| `UI/` | Small building blocks with no knowledge of projects or sound: `Label`, `Title`, `Text`, `Button`, `InfoList`, `Logo` | Nothing else in `components/` |
| `Layout/` | Page frame and generic sections: `Header`, `Toolbar`, `Overlay`, `BackgroundImage`, `ContentSection`, `TextSection`, `TextImageSection` | `UI/` (Toolbar also composes the map's and the player's buttons) |
| `Project/` | Everything showing projects: front page map of upcoming projects + grid, cards, project page | `UI/`, `Layout/` |
| `Map/`, `Forms/`, `Participate/` | One feature each | `UI/`, `Layout/` |

The player (the works' interfaces, their 3D scenes and sound engines) is not in here: it lives on its
own in `src/player/` (see `src/player/README.md`).

## Design tokens

Defined in `src/app/globals.css` (`@theme`) and mirrored in `src/styles/colors.js` for JavaScript.

- **Colors**, light to dark: `paper` `soft` `muted` `faint` `hard` `dim` `shade` `ink`, plus `error` / `error-strong`. Use as `bg-ink`, `text-paper` etc. — never raw `zinc-*` or hex values.
- **Gutter**: `px-gutter`, `left-gutter`, `gap-x-gutter` — the page side padding (0.5rem, 1rem from md).
- **Fade-in**: `animate-fade-in` on sections that should fade in on load.
- **Full height**: `h-page` / `min-h-page` for full-screen sections — never `h-svh`, which iOS Safari sizes too tall, so the bottom ends up behind the toolbar.

## Typography and buttons

```jsx
<Title size="lg" as="h1">Kolding</Title>      // sm (default) | lg
<Text size="body">Paragraph</Text>             // small | body (default) | lead
<Label size="lg">Bliv medlem</Label>           // sm (default) | lg

<Button variant="soft" className="gap-1.5 px-3 py-1.5">…</Button>
// ghost | soft | solid | pill | light — size and padding go in className
```
