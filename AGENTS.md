# CLAUDE.md - Metaphor: ReFantazio Portfolio Site

## About the Developer

This is the personal portfolio of **Ryan Zhou**, software developer. Use this name and identity everywhere - no placeholder names, "John Doe", or generic copy.

---

## Project Overview

Personal portfolio website for a software developer, inspired by the menu system of the JRPG *Metaphor: ReFantazio*. This is a single-page application with no routing - the entire site is a finite state machine with animated transitions between screens. The visual identity is dark, painterly, and typographically bold, with dramatic per-menu-item colour theming and choreographed GSAP animations.

This is NOT a generic portfolio. Every design decision should reference the game's aesthetic: skewed serif typography stacking vertically with decreasing size, coloured paint-splash highlights behind the active item, a large character portrait on the right (replaced by a photo of my dog), geometric overlays, and ambient atmospheric effects.

---

## Tech Stack

| Layer            | Tool                          | Why                                                                 |
|------------------|-------------------------------|---------------------------------------------------------------------|
| Framework        | Astro 5 + React 19 (Islands) | Zero-JS static shell + hydrated interactive islands only where needed |
| Animation        | GSAP 3.12 + Flip plugin      | Timeline orchestration for choreographed multi-element sequences     |
| Text splitting   | splitting.js                  | Character-level animation for entry sequence (free SplitText alt)    |
| Styling          | Tailwind CSS 4 + CSS custom properties | Utility layout + animatable theme variables               |
| Content          | Astro Content Collections     | Markdown blog posts with Zod-validated frontmatter                  |
| Hosting          | Vercel                        | Astro adapter, preview deploys, edge image optimization             |
| Language         | TypeScript (strict)           | Throughout all .ts/.tsx/.astro files                                |

### Key dependencies
```
astro @astrojs/react @astrojs/tailwind react react-dom
gsap @gsap/react splitting
@astrojs/vercel tailwindcss typescript
```

### What NOT to use
- No Framer Motion (insufficient timeline control for this project)
- No Next.js / Remix / SvelteKit (Astro islands are the right fit)
- No CSS-only animations for choreographed sequences (ambient loops are fine in CSS)
- No localStorage/sessionStorage in any component
- No Inter, Roboto, Arial, or generic system fonts

---

## Architecture

### This is a state machine, not a multi-page site

```
PRELOADING ──→ ENTRY_ANIMATION ──→ MENU_IDLE ←──→ ENTERING_SECTION ←──→ SECTION_ACTIVE
                                                         ↕
                                                   EXITING_SECTION
```

All keyboard/mouse input is BLOCKED during transition states (ENTRY_ANIMATION, ENTERING_SECTION, EXITING_SECTION). The state machine lives in a single React context provider at the top of the island.

### File structure
```
src/
├── components/
│   ├── menu/
│   │   ├── MainMenu.tsx          # React island - entire menu + state machine
│   │   ├── MenuItem.tsx           # Single menu item with animation refs
│   │   ├── PaintSplash.tsx        # Coloured brush stroke per item
│   │   ├── MenuIndex.tsx          # Top-right 01–06 number
│   │   ├── SubtitleLabel.tsx      # Subtitle next to selected item
│   │   └── StatsPanel.tsx         # Bottom-right stats display
│   ├── sections/
│   │   ├── AboutSection.tsx
│   │   ├── SkillsSection.tsx
│   │   ├── ExperienceSection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── MemorandumBrowser.tsx  # Full blog browser with tabs + list + detail
│   │   └── SystemSection.tsx
│   ├── background/
│   │   ├── BackgroundLayers.tsx   # Gradients + noise + scanline
│   │   ├── CharacterPortrait.tsx  # Dog photo with bobbing animation
│   │   └── GeometricOverlays.tsx  # Triangle, circle, crosshair decorations
│   ├── shared/
│   │   ├── CommandLabel.tsx       # Vertical "COMMAND" text (right edge)
│   │   ├── ControlHints.tsx       # Bottom bar key hints
│   │   └── Preloader.tsx          # Loading spinner
│   └── memorandum/
│       ├── CategoryTabs.tsx
│       ├── EntryList.tsx
│       ├── EntryDetail.tsx
│       └── BookSpines.tsx         # Decorative right panel
├── content/
│   └── memorandum/               # Markdown blog posts
├── hooks/
│   ├── useMenuNavigation.ts      # Keyboard state machine
│   ├── useEntryAnimation.ts      # Opening animation timeline
│   └── useKeyboardLock.ts        # Blocks input during transitions
├── lib/
│   ├── menuConfig.ts             # Menu items, colours, subtitles, indices
│   ├── animations.ts             # GSAP timeline factory functions
│   └── constants.ts              # Timing values, breakpoints
├── layouts/
│   └── Layout.astro              # HTML shell, font preloads, meta
├── pages/
│   └── index.astro               # Single page, renders MainMenu island
├── styles/
│   ├── global.css                # CSS custom properties, resets
│   ├── fonts.css                 # @font-face declarations
│   └── menu.css                  # Complex menu-specific styles
└── assets/
    ├── dog.webp                  # Dog photo (hero image, preloaded)
    └── splashes/                 # Paint splash PNGs (one per menu item colour)
```

---

## Menu System - The Core of the Site

### 6 menu items

| #  | Item         | Splash Colour                    | Subtitle (TBD)    |
|----|--------------|----------------------------------|--------------------|
| 01 | About        | Magenta (`hsl(320, 70%, 45%)`)   | TBD                |
| 02 | Skills       | Hot Pink (`hsl(335, 75%, 50%)`)  | TBD                |
| 03 | Experience   | Crimson (`hsl(350, 70%, 45%)`)   | TBD                |
| 04 | Contact      | Orange (`hsl(25, 80%, 50%)`)     | TBD                |
| 05 | Memorandum   | Green (`hsl(120, 50%, 40%)`)     | TBD                |
| 06 | System       | Teal (`hsl(175, 55%, 45%)`)      | TBD                |

### Menu behaviour (CRITICAL - match the game exactly)

When item N is selected (hovered or keyboard-focused):
1. **Text stack reflows**: Item N becomes the largest, boldest, fully opaque. Items above N compress upward, shrink in font size, increase skew, and fade to ~30–40% opacity. Items below N also shrink progressively and fade. The further from N, the more compressed.
2. **Paint splash**: A coloured brush-stroke texture appears behind item N. It scales in with a slight overshoot ease and has an idle pulsing animation (scale 1.0 → 1.03, opacity breathing). The previous splash fades/scales out simultaneously.
3. **Subtitle**: A small-caps label slides in from the right next to item N (150ms). The old subtitle slides out to the left simultaneously.
4. **Index number**: The large "01"–"06" in the top right crossfades to match the selection (150ms).
5. **Background accent**: CSS custom property `--accent-h` tweens from the old colour to the new, affecting any accent-tinted element globally.

### Keyboard controls (GLOBAL across entire site)

| Key              | In MENU_IDLE                          | In SECTION_ACTIVE                    |
|------------------|---------------------------------------|--------------------------------------|
| W / ↑            | Move selection up (wraps bottom→top)  | Context: scroll up / prev entry      |
| S / ↓            | Move selection down (wraps top→bottom)| Context: scroll down / next entry    |
| A / ←            | Jump to FIRST menu item               | Context: prev tab                    |
| D / →            | Jump to LAST menu item                | Context: next tab                    |
| Enter / Space    | Enter selected section                | Confirm / open entry                 |
| C / Escape       | No-op (already at top level)          | Go back one level                    |

**ALL input is blocked during animation states.** Use the `useKeyboardLock` hook to gate input based on the current state machine state.

Mouse: Hovering a menu item selects it (same visual effect as keyboard selection). Clicking enters the section.

---

## Colour System

```css
:root {
  /* Base palette */
  --bg-primary: #0a0608;
  --bg-warm: #1a0a12;
  --text-primary: #f0e8ec;
  --text-muted: rgba(200, 180, 190, 0.5);

  /* Active accent (dynamically tweened by GSAP) */
  --accent-h: 320;
  --accent-s: 70%;
  --accent-l: 45%;
}
```

Use `@property` to register `--accent-h`, `--accent-s`, `--accent-l` so GSAP can tween them smoothly. All accent-coloured elements (splash glow, text-shadow, subtitle tint, section borders) derive from `hsl(var(--accent-h), var(--accent-s), var(--accent-l))`.

---

## Animation Specifications

### Entry animation (~1000ms total)
```
0ms      Dog photo: translateY(25vh) opacity(0) → translateY(0) opacity(1), 500ms, ease: power3.out
350ms    Background gradients + geometric overlays: opacity 0 → 1, 200ms
400ms    Menu items fly in: each from translateX(30vw) opacity(0), staggered 40ms/item, 300ms each, ease: power3.out
         Characters within each word can stagger 15ms for extra flair
450ms    Index number "01" fades in, 150ms
450ms    "COMMAND" label fades in, 150ms
450ms    First item's paint splash scales in 0→1, 200ms
700ms    Stats panel slides in from right, 200ms
700ms    Control hints fade in, 150ms
~950ms   All settled → state: MENU_IDLE, input unlocked
```

### Menu hover transition (~200ms)
All simultaneous, ease: power2.inOut:
- Text stack positions/sizes tween to new layout
- Old paint splash scales down + fades out (150ms)
- New paint splash scales up + fades in (200ms)
- Index number crossfades (150ms)
- Subtitle slides out left / new slides in from right (150ms)
- `--accent-h` tweens to new value

### Section enter transition (~400ms)
```
0ms      Input locked
0–200ms  Menu items fly out left (staggered 30ms, translateX → -30vw, opacity → 0)
0–200ms  Paint splash scales out
100ms    Section content slides in from right (clip-path polygon)
100–400ms Section inner elements stagger in (fade + translateY)
400ms    State → SECTION_ACTIVE, input unlocked
```
Section exit is the reverse, ~350ms.

### Idle ambient animations (continuous, never stop)
- Dog photo: translateY 0 → -8px → 0, 4s, sine.inOut, repeat: -1, yoyo
- Paint splash: scale 1.0 → 1.03, opacity base → base+0.05, 3s, sine.inOut, repeat: -1, yoyo
- Background gradient: background-position shifts ~2%, 8s, repeat: -1, yoyo
- Triangle decoration: rotation 0 → 360deg, 40s, linear, repeat: -1
- Scanline: CSS animation, translateY top→bottom, 4s, linear, repeat

---

## Animation Rules (MUST follow)

1. **Only animate `transform` and `opacity`**. These are compositor-only properties - they skip layout and paint. NEVER animate `width`, `height`, `top`, `left`, `font-size` directly. Use `scale()` instead of changing dimensions.
2. **Apply `will-change: transform, opacity` during animations, remove after.** Don't leave it on permanently - it wastes GPU memory.
3. **Use GSAP timelines for all choreographed sequences.** Individual `.to()` calls are for simple one-offs only.
4. **Clean up GSAP instances in React.** Always use `useGSAP()` from `@gsap/react` with a scope ref, or manually `.kill()` timelines in cleanup functions. Leaked timelines cause memory issues and animation conflicts.
5. **Respect `prefers-reduced-motion`.** If the user's OS setting is reduce, skip the entry animation entirely (jump to final state), disable pulsing/bobbing, and use instant transitions (duration: 0) instead of animated ones. Check with `window.matchMedia('(prefers-reduced-motion: reduce)')`.
6. **GSAP imports must be tree-shaken.** Import only what's used:
   ```ts
   import gsap from 'gsap';
   import { Flip } from 'gsap/Flip';
   import { useGSAP } from '@gsap/react';
   gsap.registerPlugin(Flip);
   ```
   NEVER import the full GSAP bundle.

---

## Memorandum (Blog) System

Uses Astro Content Collections. Schema:
```typescript
const memorandum = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum([/* categories TBD */]),
    date: z.date(),
    image: z.string().optional(),
    order: z.number(),
  }),
});
```

### Memorandum UI (matches game's Memorandum screen)
- Top: category tabs (keyboard navigable with A/D)
- Left: vertical scrollable entry list with coloured highlight bar on selected entry (W/S to navigate)
- Right: decorative "book spine" panel (atmospheric only)
- Enter on entry → detail view: title, body text, optional image, pagination
- C/Esc → back to list
- Collection % in top-right corner (published / total planned entries)
- Background: dark teal-green atmosphere matching the Memorandum accent colour

---

## Responsive Breakpoints

| Breakpoint     | Behaviour                                                                    |
|----------------|------------------------------------------------------------------------------|
| ≥1024px        | Full experience: dog photo, all overlays, geometric decorations, full menu   |
| 768–1023px     | Dog photo scaled/cropped, geometric overlays hidden, menu text sizes reduced |
| <768px         | Dog photo as faded background, menu full-width, COMMAND/stats hidden, touch nav enabled |

All animations remain the same at all breakpoints. Only visual complexity (number of decorative elements) decreases at smaller viewports.

For <768px, add touch support: swipe up/down to navigate menu, tap to enter section.

---

## Performance Targets

- LCP < 1.5s (dog photo - preload with `fetchpriority="high"`)
- FID < 50ms
- CLS = 0 (everything is fixed/absolute positioned, no layout shifts)
- Total JS bundle < 80KB gzipped
- Self-host fonts, subset to uppercase Latin + numbers for display font

---

## Writing Style for Code & Comments

- No em-dashes, arrows (->), decorative dividers (-----), or any character that isn't on a standard keyboard
- No JSDoc blocks or over-explained comments - only comment things that aren't obvious from reading the code
- No file-name comments at the top of files, phase references, or "populated in phase N" stubs
- Comments should read like a developer wrote them quickly, not like documentation
- No section headers in CSS files with decorative borders or separators
- Keep inline comments short and matter-of-fact

---

## Code Style

- All components are functional React with hooks. No class components.
- TypeScript strict mode. No `any` types. Define interfaces for all props, state, and config objects.
- GSAP animations go in `src/lib/animations.ts` as factory functions that return `gsap.core.Timeline` instances. Components call these factories and manage lifecycle via `useGSAP`.
- Menu config (items, colours, subtitles, timing) lives in `src/lib/menuConfig.ts` as a typed constant array. Components read from this - no hardcoded values in JSX.
- CSS custom properties for all colours, defined in `src/styles/global.css`. Tailwind for layout utilities. Complex/animation-specific styles in dedicated CSS files.
- Astro components (`.astro`) for static shells and layout. React components (`.tsx`) only for interactive islands that need state or GSAP.
- Use `client:load` directive for the MainMenu island (needs to be interactive immediately). Use `client:visible` for sections that are initially hidden.

---

## Git Conventions

- For visually judged UI changes, keep iteration uncommitted until Ryan has visually inspected and explicitly approved the rendered result, then create one consolidated commit
- For non-visual work, commit after every completed feature or meaningful change
- Commit messages use short imperative title case without conventional prefixes, matching existing history: `Add backlog memorandum page`, `Optimize contact rings`, `Fix scroll bug in memorandum entries for compact viewports`
- Branch names use short lowercase kebab-case without agent prefixes, matching existing branches: `add-backlog-memo-page`, `optimize-contact-rings`, `memo-entry-scroll-fix`
- PR summary bullets should be past-tense behavior or code changes only, not verification notes: `Added link support to memorandum pages`, `Updated skills page text`, `Fixed a few UI bugs`

### Pull request workflow

When Ryan asks for a PR, complete the full GitHub workflow instead of only committing or returning a comparison URL:

1. Run `git fetch origin --prune` and confirm the latest `origin/main` contains any previously merged work.
2. If the current branch was already merged, deleted remotely, or tracks a gone branch, create a fresh lowercase kebab-case branch from `origin/main`. Preserve approved working-tree changes while switching.
3. Review the diff, run the relevant checks, stage only the intended files, and create the required consolidated commit.
4. Push with `git push -u origin <branch>`.
5. Create the PR with `gh pr create --base main --head <branch> --title "<title>" --body "<summary>"`. Use past-tense change bullets in the body and omit verification-only bullets.
6. Return the direct PR URL and confirm whether the working tree is clean.

Prefer the GitHub CLI for creating PRs. If `gh` reports an authentication problem but a signed-in GitHub browser session is available, open the branch's GitHub PR page in that session and create the PR there. Do not treat a GitHub CLI authentication failure as proof that a PR cannot be created.

---

## Common Pitfalls to Avoid

1. **Don't animate font-size directly.** Use `transform: scale()` on a wrapper. Font-size changes trigger expensive layout recalcs.
2. **Don't use `setTimeout` for animation sequencing.** Use GSAP timeline offsets (`"+=0.1"`, `"-=0.05"`, or absolute positions). Timeouts drift and can't be scrubbed/reversed.
3. **Don't add event listeners directly in components.** All keyboard input flows through `useMenuNavigation` → state machine → dispatch. One listener on `document`, not scattered across components.
4. **Don't forget to kill GSAP instances.** Every `gsap.to()`, `gsap.timeline()`, etc. must be killed on component unmount. The `useGSAP` hook handles this if you pass a scope ref.
5. **Don't use `position: fixed` for the menu items** if you need them to reflow relative to each other. Use absolute positioning within a relative container, and tween `y` values.
6. **Don't import React inside `.astro` files.** Astro components are server-rendered. React components only live in `.tsx` files and are mounted via `<Component client:load />` in Astro templates.
7. **Don't block the main thread during preloading.** Use `Promise.all` with image `onload` events and `document.fonts.ready`. Show the preloader spinner until all critical assets are ready, THEN play the entry animation.

---

## Reference Material

- `docs/IMPLEMENTATION_PLAN.md` - Full implementation plan with animation timing, architecture, and phase breakdown
- `docs/references/` - Screenshots of Metaphor: ReFantazio menu states (hover states for each item, memorandum list view, memorandum detail view)
- GSAP docs: https://gsap.com/docs/v3/
- GSAP React: https://gsap.com/resources/React/
- GSAP Flip: https://gsap.com/docs/v3/Plugins/Flip/
- Astro docs: https://docs.astro.build/
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- splitting.js: https://splitting.js.org/

## Notes
Do not make code read like "AI", no unnecessary comments, no emojis or other characters that aren't easily accessible on a default keyboard (like em-dashes -, or arrow signs)
