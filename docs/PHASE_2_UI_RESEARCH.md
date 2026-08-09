# Phase 2 UI research

Research completed on 2026-08-07 before implementation. These references are used only for layout, hierarchy, navigation, and interaction principles. No source code, artwork, brand assets, or complete page compositions are copied.

## Selected references

### Pieter Lessing artist portfolio (Dribbble)

Reference: https://dribbble.com/shots/26732288-Case-Study-Pieter-Lessing-Artist-Portfolio-Website

- Use the artwork as the first visual signal.
- Keep the surrounding interface quiet, spacious, and gallery-like.
- Let a restrained project index and image detail view support the work instead of competing with it.

### Minimalist editorial artist portfolio (Dribbble)

Reference: https://dribbble.com/shots/26273498-Minimalist-Editorial-Artist-Portfolio-Website

- Borrow the editorial rhythm: large media, short captions, clear section changes, and generous margins.
- Use subtle opacity and transform transitions only when content enters, changes, or receives focus.

### Architecture Portfolio by David Rindlisbacher (Behance)

Reference: https://www.behance.net/gallery/75528481/Architecture-Portfolio

- Use a strict grid and consistent alignment for specifications, chronology, and project narratives.
- Keep long descriptions at a readable line length instead of stretching them across the viewport.

### Arkana architecture portfolio (Behance)

Reference: https://www.behance.net/gallery/231608393/Arkana-Architecture-Portfolio-Landing-Page

- Pair immersive project images with compact structured metadata.
- Treat each project as a small case study rather than a promotional card.

### Ross Halfin Photography (Awwwards)

Reference: https://www.awwwards.com/sites/ross-halfin-photography

- Borrow the archive mindset: visible filtering, a clear path from gallery to detail, and image-led navigation.
- Keep controls discoverable for mouse, keyboard, and touch users.

### Unsplash browsing flow and image gallery patterns (Pageflows)

References:

- https://pageflows.com/post/ios/general-browsing/unsplash/
- https://pageflows.com/web/elements/image-gallery/

- Make the relationship between collection, selected image, thumbnails, and next/previous actions obvious.
- Keep required labels and actions visible instead of revealing essential information only on hover.

### Muzli weekly portfolio selections

References:

- https://muz.li/blog/weekly-designers-update-551/
- https://muz.li/blog/weekly-designers-update-544/

- Use expansive whitespace and a minimal grid to keep work at the center.
- Combine a concise studio contact path with the portfolio instead of adding a separate marketing-heavy landing page.

## Applied direction

- A charcoal and warm-ivory base with restrained brass and oxidized-green accents.
- Large, uncropped primary media with `object-fit: contain`; cropped thumbnails remain secondary.
- A compact responsive navigation rail on desktop and a reachable bottom navigation on mobile.
- An editorial project index, stable image stage, accessible lightbox, and explicit image controls.
- Calm separators and unframed page sections instead of stacked decorative cards.
- Shared tokens for spacing, typography, borders, fields, buttons, states, and motion.
- Motion limited to approximately 180-500 ms using opacity and transform, with reduced-motion support.
- A quieter art-facing frontend and a denser, more utilitarian admin workspace.

## Rejected patterns

- Automatic carousels, forced horizontal scrolling, scroll hijacking, and strong parallax.
- WebGL or decorative 3D scenes that compete with model photography.
- Oversized kinetic typography, marquees, and simultaneous staggered fly-ins.
- Gradients, glow, glass blur, floating decoration, strong shadows, and looping animation.
- Essential information that appears only on hover.
- Aggressive image cropping that can remove important parts of a miniature model.
- Fictional awards, client claims, sales figures, testimonials, or new brand stories.

