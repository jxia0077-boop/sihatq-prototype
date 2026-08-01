---
name: Sejahtera Wellness
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#55615a'
  on-secondary: '#ffffff'
  secondary-container: '#d9e6dd'
  on-secondary-container: '#5b6760'
  tertiary: '#545c72'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c748b'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#d9e6dd'
  secondary-fixed-dim: '#bdcac1'
  on-secondary-fixed: '#131e19'
  on-secondary-fixed-variant: '#3e4943'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style
The design system is centered on trust, clarity, and inclusivity within the Malaysian healthcare landscape. It balances professional medical authority with an approachable, lifestyle-oriented wellness aesthetic.

The visual style is **Corporate / Modern** with a focus on high legibility and data visualization. It employs a clean, systematic layout with ample whitespace to reduce cognitive load during health assessments. To ensure the app feels modern and accessible rather than sterile, the system utilizes soft, organic depth and rounded geometry. The interface must remain culturally neutral yet inclusive, accommodating diverse user demographics across Malaysia.

## Colors
The palette is led by **Trustworthy Teal**, evoking medical expertise and stability. The **Calming Sage** background is used extensively for large surfaces to reduce eye strain and create a "breathable" atmosphere. 

- **Primary (Teal):** Used for key actions, active states, and brand-defining elements.
- **Secondary (Sage):** The foundational background color for screens and containers.
- **Risk Indicators:** A traffic-light system is strictly enforced for assessments. Red (#E11D48) for high risk, Orange (#F59E0B) for moderate risk, and Green (#10B981) for low risk/healthy status.
- **Neutrals:** Slate and Blue-Greys are used for text and borders to maintain a cool, professional temperature.

## Typography
This design system utilizes a dual-font strategy. **Lexend** is used for headlines and numerical data to provide a modern, highly readable, and friendly character. **Inter** is used for all body copy and functional labels, providing a systematic and neutral tone that ensures clarity in dense medical information.

Line heights are intentionally generous to improve readability for users of all ages. Numerical values in risk reports should use `headline-lg` to ensure they are the primary focal point of the screen.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a focus on mobile-first implementation, given the Malaysian market's heavy mobile usage.

- **Mobile:** 4-column grid with 20px side margins and 16px gutters.
- **Tablet/Desktop:** 12-column grid with a maximum content width of 1140px.
- **Rhythm:** An 8px linear scale is used for all internal component spacing to maintain a rigorous, professional structure. Vertical rhythm between sections should typically be `xl` (32px) to ensure clear separation of different health metrics.

## Elevation & Depth
The system uses **Tonal Layers** combined with **Ambient Shadows** to create a soft, non-threatening hierarchy. 

Surfaces are primarily defined by subtle shifts in background color (Sage to White). Shadows should be extremely diffused (Blur: 20px-40px) with very low opacity (5-8%) and a slight Teal/Slate tint to avoid a "dirty" grey look. This creates a "lifted" effect for interactive cards and modals, suggesting they are closer to the user for immediate action. High-risk alerts may use a slightly tighter shadow to feel more urgent and grounded.

## Shapes
The shape language is consistently **Rounded**, using `rounded-2xl` (1.5rem / 24px) for primary containers and cards. This high degree of rounding softens the "clinical" nature of the app, making the health assessment feel like a lifestyle companion rather than a rigid medical tool.

- **Buttons:** Fully rounded (pill-shaped) for primary actions.
- **Input Fields:** `rounded-lg` (1rem / 16px) for a balance of structure and softness.
- **Cards:** `rounded-2xl` for all main dashboard and assessment result containers.

## Components
- **Primary Buttons:** Pill-shaped, Primary Teal background with White text. Uses a subtle glow shadow on hover.
- **Assessment Cards:** White background, `rounded-2xl`, with a 1px border of Sage-Dark. Top-border accent colors (Green, Orange, Red) indicate the risk level.
- **Progress Indicators:** Thick, rounded stroke bars. Completed segments in Teal; remaining segments in Sage-Medium.
- **Input Fields:** Background-filled (Secondary Sage), no border in default state, 2px Teal border on focus. Label text always sits above the field in `label-md`.
- **Health Chips:** Small, rounded-full badges used for categorizing metrics (e.g., "Heart Health," "BMI"). Use low-saturation background tints of the category color.
- **Risk Gauges:** Circular or semi-circular gauges with a needle or progress arc, utilizing the defined risk color palette for immediate visual feedback.