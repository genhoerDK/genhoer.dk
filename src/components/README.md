# Components

## Folders

| Folder | What goes here | May import from |
|---|---|---|
| `UI/` | Small building blocks with no knowledge of projects or sound: `Label`, `Title`, `Text`, `Button`, `InfoList`, `Logo` | Nothing else in `components/` |
| `Layout/` | Page frame and generic sections: `Header`, `Toolbar`, `Overlay`, `BackgroundImage`, `ContentSection`, `TextSection`, `TextImageSection` | `UI/` (Toolbar also composes Map/Player buttons) |
| `Project/` | Everything showing projects: front page carousel/grid, cards, project page | `UI/`, `Layout/` |
| `Map/`, `Player/`, `Forms/`, `Participate/` | One feature each | `UI/`, `Layout/` |

## Design tokens

Defined in `src/app/globals.css` (`@theme`) and mirrored in `src/styles/colors.js` for JavaScript.

- **Colors**, light to dark: `paper` `soft` `muted` `faint` `hard` `dim` `shade` `ink`, plus `error` / `error-strong`. Use as `bg-ink`, `text-paper` etc. — never raw `zinc-*` or hex values.
- **Gutter**: `px-gutter`, `left-gutter`, `gap-x-gutter` — the page side padding (0.5rem, 1rem from md).
- **Fade-in**: `animate-fade-in` on sections that should fade in on load.

## Typography and buttons

```jsx
<Title size="lg" as="h1">Kolding</Title>      // sm (default) | lg
<Text size="body">Paragraph</Text>             // small | body (default) | lead
<Label size="lg">Bliv medlem</Label>           // sm (default) | lg

<Button variant="soft" className="gap-1.5 px-3 py-1.5">…</Button>
// ghost | soft | solid | pill | light — size and padding go in className
```
