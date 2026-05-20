# Design System Specification: Kinetic Precision

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Kinetic Precision."** 

In the high-stakes environment of public transport management, the UI must function like a high-performance cockpit—authoritative, luminous, and relentlessly clear. We are moving away from the "flat web" aesthetic and toward a **Vanguardist Editorial** approach. This system rejects generic grids in favor of intentional asymmetry and "Floating Data Geometry." By utilizing overlapping glass surfaces and high-contrast tonal shifts, we create a sense of movement and technological sophistication that reflects a city in motion.

## 2. Colors
The palette is rooted in deep obsidian tones with luminous, electrified accents. It is designed to minimize eye strain during long-shift monitoring while highlighting critical data points with surgical precision.

### The Palette
- **Core Background:** `background` (#060e20) – The foundation of the entire experience.
- **Accents (Movement & Tech):** `primary` (#a1faff) and `primary_container` (#00f4fe). These electric cyans are reserved for active states, movement indicators, and primary calls to action.
- **Secondary/Status:** `secondary` (#d8e3fb) and `tertiary` (#9bddff) provide softer nuances for non-critical information.
- **Critical Alerts:** `error` (#ff716c) – High-vibrancy red for immediate intervention.

### The "No-Line" Rule
Traditional 1px borders are prohibited for sectioning. They clutter the visual field and feel "templated." Boundaries must be defined through:
1.  **Background Shifts:** Placing a `surface_container_low` module on a `surface` background.
2.  **Tonal Transitions:** Using depth to separate the side navigation from the main dashboard.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Nesting is the key to organizing high-density data without visual noise.
- **Level 0 (Base):** `surface` (#060e20).
- **Level 1 (Sub-sections):** `surface_container_low` (#091328).
- **Level 2 (Active Modules/Cards):** `surface_container_high` (#141f38).
- **Level 3 (Pop-overs/Modals):** `surface_container_highest` (#192540).

### The "Glass & Gradient" Rule
To evoke a premium, cutting-edge feel, use **Glassmorphism** for floating elements (e.g., flight/route details, floating action menus). Apply `surface_container_high` with 60% opacity and a `backdrop-filter: blur(20px)`. Main CTAs should utilize a subtle linear gradient from `primary` (#a1faff) to `primary_container` (#00f4fe) at a 135-degree angle to simulate light-source movement.

## 3. Typography
We utilize a dual-typeface system to balance "Vanguardist" personality with extreme technical readability.

- **Display & Headlines:** **Space Grotesk**. This typeface brings a geometric, technical "NASA-chic" aesthetic. Use `display-lg` (3.5rem) for high-level KPIs and `headline-sm` (1.5rem) for module titles.
- **Body & Technical Data:** **Inter**. Chosen for its exceptional legibility at small sizes. Used for all data tables, labels, and paragraph text.

### Typographic Hierarchy
- **Primary Metrics:** `display-md` (2.75rem, Space Grotesk) — Reserved for live fleet counts or critical percentages.
- **System Labels:** `label-sm` (0.6875rem, Inter, All Caps, Letter Spacing: 0.05rem) — Used for technical metadata (e.g., "LAT/LONG," "TS-DELAY").

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than structural lines.

- **The Layering Principle:** Place a `surface_container_lowest` (#000000) data table inside a `surface_container_low` (#091328) panel to create a "recessed" look, drawing the eye inward toward the data.
- **Ambient Shadows:** For floating glass panels, use a diffused shadow: `box-shadow: 0 24px 48px -12px rgba(0, 244, 254, 0.08)`. Note the use of a `primary` tint in the shadow to mimic the glow of a high-tech screen.
- **The "Ghost Border" Fallback:** If a separation is required for accessibility, use a "Ghost Border": `outline_variant` (#40485d) at **15% opacity**. This provides a hint of structure without breaking the seamless aesthetic.
- **Glassmorphism:** All overlays must use `backdrop-blur`. This allows the vibrant teal accents of the underlying map or data-viz to bleed through, maintaining a cohesive "layered" environment.

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` (#006165) text, `xl` (0.75rem) corner radius.
- **Secondary (Glass):** `surface_variant` (#192540) at 40% opacity, `backdrop-blur`, with a `Ghost Border`.
- **Tertiary:** No fill. Text in `primary` with an underline that appears only on hover.

### Data Modules & Tables
- **Forbid Dividers:** Do not use lines between rows. Use alternating row colors (e.g., `surface_container_low` and `surface_container`) or `sm` (0.125rem) vertical spacing between row-blocks.
- **Density:** Use `body-sm` for table data to allow for high information density. Headers should be `label-md` in `on_surface_variant` (#a3aac4).

### Status Indicators
- **Active/On-Time:** A glowing pulse using `primary` (#a1faff).
- **Delayed:** `tertiary` (#9bddff) with a steady glow.
- **Critical Failure:** `error` (#ff716c) with a high-contrast `error_container` background.

### Input Fields
- **State:** Fields use `surface_container_highest` with a bottom-only "Ghost Border" that expands to a full 1px `primary` glow when focused.
- **Typography:** `title-sm` (Inter) for user input.

## 6. Do's and Don'ts

### Do:
- **Do** use intentional asymmetry. A map that takes up 65% of the screen with a 35% data-sidebar creates a more editorial feel than a 50/50 split.
- **Do** use `primary_fixed_dim` for icons to ensure they feel "lit from within."
- **Do** lean into high data density. Management platforms require "at-a-glance" complexity; use `Inter` at small sizes with generous line-height (1.5) to maintain clarity.

### Don't:
- **Don't** use pure white (#FFFFFF). It breaks the sophisticated dark-theme atmosphere. Use `on_surface` (#dee5ff) instead.
- **Don't** use standard "drop shadows" (black with high opacity). They make the UI look "dirty" on a dark background.
- **Don't** use sharp 90-degree corners. Even in a "vanguardist" system, the `DEFAULT` (0.25rem) or `md` (0.375rem) radius is required to maintain the "premium tech" feel.
- **Don't** use solid separators. Rely on white space and background tonal shifts to define the information architecture.