# Figma Design Extraction

## Exact Figma source used

- File URL: `https://www.figma.com/design/Z1n6Pk2zhtLD7wFV0sVPjf/Untitled?node-id=1-2392&m=dev&t=uFUn8gB9NK3T8frJ-1`
- File key: `Z1n6Pk2zhtLD7wFV0sVPjf`
- Node ID: `1:2392`
- Frame name: `Crazyui - Hero7`
- Extraction method:
  - Figma MCP `get_metadata`
  - Figma MCP `get_design_context`

## Visual summary

The frame is a premium dark SaaS hero with a strong security-product tone. It combines:

- a deep navy-to-blue atmospheric background gradient
- a frosted/glass top navigation bar
- a centered headline block with a capsule badge and two CTAs
- a large floating browser-window mockup that previews a product dashboard

The overall feel is polished, modern, product-led, and trust-oriented rather than playful. It reads more like a secure infrastructure platform than a consumer landing page.

## Layout structure

Canvas:

- Root frame: `1440 x 949`
- Desktop-first composition

Top navigation:

- Full-width top bar, height about `80`
- Left: logo mark + wordmark
- Center: compact nav links in pill-like items
- Right: primary contact button
- Semi-transparent dark/glass treatment with subtle bottom border

Hero content:

- Centered content block starting around `y=180`
- Fixed content width around `734`
- Three main rows:
  - capsule eyebrow/badge strip
  - large centered headline
  - supporting text
- CTA row below with two buttons

Product mockup:

- Large floating panel positioned below the hero copy
- Outer glass/white framed shell around `1240` wide
- Inner browser chrome and dashboard preview
- Mockup intentionally overlaps below-the-fold to create depth and product credibility

## Component hierarchy

Top-level hierarchy from the frame:

- `Crazyui - Hero7`
  - background gradient image layer
  - hero content wrapper
    - pill badge strip
      - badge
      - supporting label
      - arrow icon
    - headline
    - subheadline
    - CTA row
      - primary button
      - secondary button
  - top navigation bar
    - logo cluster
    - contact button
    - nav items row
  - large dashboard/browser mockup
    - browser toolbar
      - traffic-light dots
      - address field
      - toolbar icons
    - application shell
      - sidebar
      - top content area
      - KPI cards
      - list cards
      - progress widgets

## Colors

Observed primary palette:

- Near-black navy background: approximately `#050814` to `#08122A`
- Deep blue hero field: approximately `#0A1F4A`
- Bright right-side blue glow: approximately `#3F86C8`
- White: `#FFFFFF`
- Soft white border overlays:
  - `rgba(255,255,255,0.05)`
  - `rgba(255,255,255,0.08)`
  - `rgba(255,255,255,0.2)`
  - `rgba(255,255,255,0.51)`
- Muted light blue-gray:
  - `#C9CBCF`
  - `#EEF1F7`
  - `#DEE5ED`
- Dark text inside mockup: around `#1C1D1D`
- Status dots in browser chrome:
  - red `#E25454`
  - yellow `#F2C94C`
  - green `#00B473`

Color behavior:

- outer hero uses dark-to-bright blue contrast
- CTAs use white and translucent blue surfaces
- mockup switches to a bright white application surface for contrast and credibility

## Typography

Primary families visible in extracted context:

- `Inter`
- `Inter Tight`
- `Sora`
- `LT Wave`
- `Eighties Comeback It VAR`

Usage pattern:

- Main headline:
  - `Inter` medium
  - size about `60`
  - line height about `66`
  - tracking about `-2.4`
  - centered
- Highlighted hero word:
  - italic display face `Eighties Comeback It VAR`
  - used only for one emphasized word
- Supporting paragraph:
  - `Inter` regular
  - size about `18`
  - line height about `25.2`
- Nav items:
  - `Inter Tight` medium
  - size about `16`
- Buttons:
  - `Inter` medium
  - size about `16`
- Dashboard mockup headings and cards:
  - `Sora` for product UI labels and section titles

Typography takeaway:

- marketing layer uses expressive but controlled editorial contrast
- product layer uses cleaner application typography

## Spacing

Observed rhythm:

- top nav horizontal padding: about `100`
- hero content vertical gaps:
  - around `24` between label, headline, subtext
  - around `34` between text stack and CTA row
- CTA gap: `16`
- button padding:
  - primary/secondary hero buttons around `24 x 10`
- nav item padding:
  - about `16 x 12`
- mockup shell padding:
  - outer about `9`
  - inner cards commonly around `20` to `30`

Spacing character:

- hero uses generous spacing and centering
- inner application preview uses tighter, operational spacing

## Radii

Observed radii:

- hero badge outer pill: about `43`
- badge inner chip: about `36`
- nav pills: about `8`
- top-right and hero CTA buttons: about `10`
- logo tile: about `9`
- browser/address field: about `7.8`
- large mockup frame outer radius: about `11`
- inner app container radius: about `21`
- dashboard cards inside mockup: about `9.9`

Pattern:

- rounded but not cartoonish
- small-to-medium radii dominate
- pills are used for navigation and meta labels

## Shadows and effects

Top bar:

- blurred/frosted image-backed navigation shell
- subtle border bottom

Hero:

- large atmospheric gradient image with dark overlay `rgba(0,0,0,0.2)`

Mockup shell:

- layered soft elevation:
  - `0 -2.1 4.2 rgba(0,0,0,0.05)`
  - `0 7.349 15.749 rgba(106,114,128,0.05)`
  - `0 26.248 83.993 rgba(106,114,128,0.05)`
  - `0 12.599 20.998 rgba(106,114,128,0.05)`

Inner cards:

- repeated soft ambient shadows around `0 0 19.766 rgba(0,0,0,0.07)`

Other effects:

- logo tile has an inset highlight
- translucent surfaces use light borders instead of heavy shadow

## Backgrounds

Main background:

- photographic or generated gradient asset stretched wider than the frame
- dark navy left side
- brighter blue toward top-right
- black/dark vignette in lower-left

Navigation background:

- glass-like transparent overlay over hero background

Mockup backgrounds:

- outer shell: translucent white frame
- inner application: white
- content surface: pale gray-blue `#F5F7FA`

## Assets and icons

Visible assets:

- gradient hero background image
- logo mark shape
- multiple vector icons in the nav and browser toolbar
- many dashboard icons inside the browser mockup

Icon style:

- simple line/glyph icons
- monochrome or lightly toned
- consistent modern SaaS iconography

Notable asset types:

- browser chrome controls
- dropdown chevron
- dashboard navigation icons
- KPI and card icons

## Responsive assumptions

The frame is designed desktop-first.

Likely intended responsive behavior:

- top nav probably collapses or simplifies on tablet/mobile
- headline and subtext remain centered
- CTA row may stack on smaller widths
- large browser mockup likely scales down and eventually crops or moves below content
- mockup internal detail is too dense to preserve 1:1 on phone sizes

Practical implementation assumption for our app:

- use this as visual direction for desktop shell and hero-level treatment
- do not try to preserve the exact landing-page composition on mobile

## Reusable frontend primitives we should derive from this design

Marketing-shell primitives:

- `GlassTopBar`
- `LogoLockup`
- `HeroBadge`
- `HeroHeadline`
- `PrimaryCTAButton`
- `SecondaryCTAButton`

Product-shell primitives:

- `BrowserMockupFrame`
- `WindowChrome`
- `SidebarNavRail`
- `SurfaceCard`
- `MetricCard`
- `MiniProgressRow`
- `ToolbarField`

Cross-cutting tokens:

- dark premium hero background
- translucent bordered pill surface
- soft-elevation card system
- dual typography mode:
  - expressive display for marketing
  - disciplined product UI typography for app screens

## What should be preserved

- dark premium blue tone and trust-oriented atmosphere
- centered strong headline treatment
- restrained glass/translucent surfaces
- crisp white CTA styling
- rounded but controlled shape language
- contrast between dark exterior shell and light product surface
- sense of product credibility from showing a real interface preview

## What should be adapted for PromoCode Manager

This design is a landing-page hero for a security company, not an internal analytics console. For PromoCode Manager we should adapt it in these ways:

- replace marketing copy with operational product framing:
  - discount exposure
  - campaign performance
  - promo risk
  - revenue impact
- use the dark hero language as a top-level shell or auth/welcome screen, not as the full analytics page background
- translate the browser mockup idea into:
  - dashboard preview
  - live analytics snapshot
  - promo ledger teaser
- replace course/dashboard semantics with:
  - users analytics
  - promocode performance
  - promo usage ledger
  - order operations
- use the pill/badge language for promo-code instruments and status badges
- keep the premium blue palette, but add operational accents for:
  - success
  - warning
  - risk
  - inactive/expired states
- keep card softness, but increase information density for real fintech table workflows

## Risks and missing information

- The extracted node is a full hero composition, not a component library, so tokens must still be normalized by hand.
- Figma MCP exposed rendered structure and many values, but not a clean semantic style-token inventory.
- The frame mixes two products:
  - outer security-marketing hero
  - inner education-dashboard mockup
  so some internal UI choices are demonstrative rather than system-level.
- No mobile variant was provided in the inspected node.
- Some font families may not exist in the local runtime stack and will need substitution or licensing review.
- The browser/dashboard mockup is a visual prop, not a complete operational design system.
- We should avoid over-copying the landing-page composition into analytics pages, because PromoCode Manager needs a more table-first internal-console layout.
