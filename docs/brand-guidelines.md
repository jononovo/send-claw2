# 5Ducks Brand Guidelines

A comprehensive design system and branding reference for the 5Ducks application.

---

## 1. Brand Overview

### Brand Identity
- **Name:** 5Ducks
- **Tagline:** "Sales. Gamified." / "Sell to 5 new people every day"
- **Personality:** Approachable, gamified, professional yet playful
- **Primary Mascot:** 3D Cute Duckling (yellow, fluffy, expressive eyes)
- **Secondary Mascots:** Bear (brown, friendly) and Fox (orange, enthusiastic)
- **Logo Mark:** Duckling emoji with eggs (🐥🥚🥚🥚🥚) representing growth stages

### Core Concept
5Ducks simplifies B2B sales prospecting and outreach through gamification. The brand balances professionalism with a sense of fun and achievement, making sales feel like completing quests rather than tedious work.

### Gamification Elements
- **XP System:** Actions reward experience points (e.g., "+50XP" for Email Sent)
- **Streaks:** Track consecutive days of activity (e.g., "🔥 12 Days")
- **Quests:** Step-by-step challenges that guide users through features
- **Credits:** Earned through completing quests, used for premium features
- **Secret Codes:** Exclusive unlock mechanism for stealth/beta access
- **Social Proof:** "1,248 Players Waiting" with avatar stack

---

## 2. Color System

### Primary Palette

| Color Name | Hex | HSL | Usage |
|------------|-----|-----|-------|
| **Primary Blue** | `#3B82F6` | `217 100% 50%` | Interactive elements, CTAs, links |
| **Primary Blue (Dark)** | `#2563EB` | `217 100% 60%` | Dark mode primary |
| **Accent Gold** | `#EAB308` | `45 93% 47%` | Highlights, premium features, achievements |

### Warm/Quest Palette (Amber/Brown Tones)

| Color Name | Hex | HSL | Usage |
|------------|-----|-----|-------|
| **Yellow 400** | `#FACC15` | `48 96% 53%` | Headlines, glows, confetti |
| **Yellow 500** | `#EAB308` | `45 93% 47%` | Progress bars, badges |
| **Amber 400** | `#FBBF24` | `43 96% 56%` | Trophy icons, quest accents |
| **Amber 500** | `#F59E0B` | `38 92% 50%` | In-progress states, warm CTAs |
| **Amber 800** | `#92400E` | `26 90% 31%` | Background gradients (warm) |
| **Amber 900** | `#78350F` | `22 90% 26%` | Deep warm backgrounds |

### Neutral Palette

| Color Name | Hex | Usage |
|------------|-----|-------|
| **Gray 50** | `#F9FAFB` | Light backgrounds |
| **Gray 100** | `#F3F4F6` | Cards (light mode) |
| **Gray 400** | `#9CA3AF` | Secondary text, icons |
| **Gray 700** | `#374151` | Borders, dividers |
| **Gray 800** | `#1F2937` | Dark mode cards |
| **Gray 900** | `#111827` | Dark mode backgrounds |
| **Gray 950** | `#030712` | Deep dark backgrounds |

### Semantic Colors

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Success** | `#22C55E` (green-500) | `#4ADE80` (green-400) |
| **Destructive** | `#EF4444` (red-500) | `#DC2626` (red-600) |
| **Warning** | `#F59E0B` (amber-500) | `#FBBF24` (amber-400) |
| **Info** | `#3B82F6` (blue-500) | `#60A5FA` (blue-400) |

### Gradients

```css
/* Hero headline gradient (golden glow) */
background: linear-gradient(to right, #FACC15, #FEF9C3);
text-shadow: 0 0 30px rgba(250, 204, 21, 0.3);

/* Quest in-progress card */
background: linear-gradient(to bottom-right, rgba(120, 53, 15, 0.3), rgba(146, 64, 14, 0.2));

/* Quest completed card */
background: linear-gradient(to bottom-right, rgba(20, 83, 45, 0.3), rgba(22, 101, 52, 0.2));

/* Dark page background */
background: linear-gradient(to bottom, #030712, #111827, #030712);

/* Landing page atmospheric accents */
/* Subtle purple/magenta and cyan light spots in background */
background-image: 
  radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 40%),
  radial-gradient(circle at 70% 60%, rgba(6, 182, 212, 0.1) 0%, transparent 35%),
  radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.08) 0%, transparent 30%);

/* Input focus glow (blue) */
box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);

/* Unlock/Success glow (gold) */
box-shadow: 0 0 40px rgba(250, 204, 21, 0.5);
```

---

## 3. Typography

### Font Families

| Purpose | Font | Fallback |
|---------|------|----------|
| **Headings** | Outfit | sans-serif |
| **Body** | Outfit | sans-serif |
| **Display/Serif** | DM Serif Display | serif |
| **Code/Terminal** | Courier New | monospace |

### Font Sizes

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero Title | 6xl-8xl (60-96px) | Bold (700) | 0.9 |
| Page Title | 3xl (30px) | Bold (700) | 1.2 |
| Section Header | 2xl (24px) | Semibold (600) | 1.3 |
| Card Title | lg-xl (18-20px) | Semibold (600) | 1.4 |
| Body | base (16px) | Regular (400) | 1.5 |
| Small/Caption | sm-xs (14-12px) | Medium (500) | 1.4 |
| Monospace Input | xl-2xl (20-24px) | Regular (400) | 1.2 |

### Text Styling

```css
/* Quest subtitle - uppercase tracking */
.quest-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9CA3AF;
}

/* Stealth mode badge */
.stealth-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.2);
}

/* Code/terminal input */
.code-input {
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

---

## 4. Component Styling

### Buttons

**Primary Button (Blue)**
```css
.btn-primary {
  background: hsl(217 100% 50%);
  color: white;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
}
.btn-primary:hover {
  background: hsl(217 100% 45%);
}
```

**Warm/Quest Button (Amber)**
```css
.btn-warm {
  background: linear-gradient(to right, #F59E0B, #D97706);
  color: white;
}
```

**Success Button (Green)**
```css
.btn-success {
  background: linear-gradient(to right, #22C55E, #10B981);
  color: white;
}
```

### Cards

**Standard Card**
```css
.card {
  background: white; /* dark: #111827 */
  border: 1px solid hsl(240 6% 90%); /* dark: hsl(240 4% 16%) */
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Quest Card (In Progress)**
```css
.quest-card-progress {
  background: linear-gradient(to bottom-right, 
    rgba(120, 53, 15, 0.3), 
    rgba(146, 64, 14, 0.2)
  );
  border: 1px solid rgba(245, 158, 11, 0.3);
  backdrop-filter: blur(4px);
}
```

**Quest Card (Completed)**
```css
.quest-card-complete {
  background: linear-gradient(to bottom-right, 
    rgba(20, 83, 45, 0.3), 
    rgba(22, 101, 52, 0.2)
  );
  border: 1px solid rgba(34, 197, 94, 0.3);
}
```

### Inputs

**Terminal/Code Style Input**
```css
.terminal-input {
  height: 4rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border: none;
  font-family: 'Courier New', monospace;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
  color: white;
}

/* Corner brackets decoration */
.terminal-input-wrapper::before,
.terminal-input-wrapper::after {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.6);
}
```

**Search Input**
```css
.search-input {
  padding: 1.75rem 3rem 1.75rem 3rem;
  font-size: 1.125rem;
  border-radius: 9999px;
  border: transparent;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
.search-input:focus {
  ring: 2px solid #3B82F6;
}
```

### Progress Bars

```css
.progress-bar {
  height: 0.5rem;
  background: #374151;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill-amber {
  background: linear-gradient(to right, #F59E0B, #FBBF24);
}

.progress-fill-green {
  background: linear-gradient(to right, #F59E0B, #22C55E);
}

.progress-fill-blue {
  background: hsl(217 100% 50%);
}
```

---

## 5. Iconography

### Icon Library
- **Primary:** Lucide React
- **Brand Logos:** React Icons (si prefix)

### Key Icons by Feature

| Feature | Icon | Color |
|---------|------|-------|
| Search | `Search` | Gray/Blue |
| Quests/Achievements | `Trophy` | Amber/Yellow |
| Current Challenge | `Target` | Gray/Amber |
| Locked | `Lock` | Gray |
| Complete | `Check` | Green |
| Progress | `Map` | White |
| Email/Outreach | `Mail` | Blue |
| Celebrate | `Sparkles` | Yellow |
| Premium | `Gem` | Purple |
| Navigation | `ChevronRight`, `ArrowRight` | White/Gray |

### Icon Sizing

| Context | Size |
|---------|------|
| Inline with text | 16-20px (h-4/h-5) |
| Button icon | 20px (h-5) |
| Card accent | 24-28px (h-6/h-7) |
| Page header | 40px (h-10) |
| Hero/Feature | 48-64px (h-12/h-16) |

---

## 6. Animation & Motion

### Transitions

```css
/* Standard transition */
transition: all 0.2s ease;

/* Smooth drawer/panel */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Bounce effect */
transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Keyframe Animations

**Guidance Pulse (Quest Highlights)**
```css
@keyframes guidance-pulse {
  0% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.5); }
  50% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.8); }
  100% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.5); }
}
```

**Racing Light (Search Input)**
```css
@keyframes racingLight {
  0% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15); }
  50% { box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.55); }
  100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15); }
}
```

**Bee Float (Mascot)**
```css
@keyframes bee-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

### Framer Motion Presets

```typescript
// Fade in from bottom
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

// Slide in from side
const slideIn = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
};

// Spring bounce
const springBounce = {
  type: "spring",
  stiffness: 300,
  damping: 25
};
```

---

## 7. Confetti & Celebrations

### Color Palettes

**Golden Unlock**
```javascript
colors: ['#fbbf24', '#f59e0b', '#d97706', '#fef3c7']
```

**Success Burst**
```javascript
colors: ['#22c55e', '#10b981', '#a3e635']
```

**Full Celebration**
```javascript
colors: ['#fbbf24', '#f59e0b', '#d97706', '#22c55e', '#10b981']
```

### Usage Guidelines
- Fire confetti on successful actions (unlock, quest completion)
- Use golden colors for achievements/unlocks
- Use green accents for completions
- Origin point should be from the triggering element

---

## 8. Page Layouts

### Dark/Stealth Pages
- Force dark mode (`<html class="dark">`)
- Deep background gradient (gray-950 → gray-900 → gray-950)
- Background image with blur overlay and reduced opacity
- Content layered with z-index for depth
- Dramatic glows and shadows

**Background Imagery:**
- Abstract 3D illustrations (envelopes, charts, targets)
- Mix-blend-mode: screen for light integration
- Opacity: 30-40% with backdrop blur
- Subtle purple/magenta and cyan light spots for atmosphere
- Creates depth without distracting from content

### Standard App Pages
- Respect user theme preference
- Clean white/light gray backgrounds (light mode)
- Subtle gradients (slate-50 → blue-50)
- Cards with clear boundaries
- Functional, focused layouts

### Quest/Gamification Pages
- Dark mode preferred
- Amber/warm accent colors for progress
- Green for completions
- Trophy/achievement visual language
- Progress bars prominently displayed

---

## 9. Mascot & Branding Elements

### 3D Mascot Characters

**Primary Mascot - Duckling ("Fluffy")**
- Style: 3D rendered, cute/kawaii aesthetic
- Color: Warm yellow (#FFD93D body, orange beak/feet)
- Personality: Curious, helpful, expressive
- Usage: Hero sections, onboarding, achievements
- Size: Large prominence on landing page (right side)

**Secondary Mascots - Bear & Fox**
- Style: 3D rendered, matching cute aesthetic
- Bear: Brown (#8B5A2B), friendly, celebrates success
- Fox: Orange (#FF6B35), enthusiastic, points to features
- Usage: Feature demonstrations, "Meeting Booked" celebrations
- Shown together holding signs/notifications

**Emoji Representation:**
- Full: `🐥🥚🥚🥚🥚` (1 hatched + 4 eggs)
- Growing: Add more 🐥 as user progresses
- Mobile simplified: `🐥`

### Action Notification Cards

Floating cards that appear around mascots showing real-time activity:

**"Email Sent" Card**
```css
.action-card {
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  backdrop-filter: blur(8px);
}
.action-xp {
  color: #3B82F6; /* blue-500 */
  font-weight: 600;
}
```

**"Prospect Found" Card**
- Icon: Target/radar with pink accent
- Label: "NEW LEAD" in small caps

**"Meeting Booked" Card**
- Larger format, held by mascots
- Shows time (e.g., "10:00 AM")
- Confetti celebration around it

**"Streak" Card**
- Icon: 🔥 flame
- Display: "12 Days" format
- Background: Dark with warm glow

### Logo Placement
- Top-left on landing pages (duckling + eggs)
- Navbar on app pages
- Certificate/achievement modals

### Stealth Mode Badge
```css
.stealth-badge {
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.2);
}
```

---

## 10. CSS Variables Reference

```css
:root {
  /* Typography */
  --font-sans: 'Outfit', sans-serif;
  --font-heading: 'Outfit', sans-serif;
  --font-serif: 'DM Serif Display', serif;
  --font-code: 'Courier New', monospace;

  /* Light Theme */
  --background: 0 0% 100%;
  --foreground: 240 10% 4%;
  --primary: 217 100% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 5% 96%;
  --secondary-foreground: 240 6% 10%;
  --muted: 240 5% 96%;
  --muted-foreground: 240 4% 46%;
  --accent: 45 93% 47%;
  --accent-foreground: 240 10% 4%;
  --accent-hover: 45 93% 47% / 0.1;
  --accent-active: 45 93% 47% / 0.15;
  --accent-border-hover: 45 93% 47% / 0.3;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 4%;
  --border: 240 6% 90%;
  --input: 240 6% 90%;
  --ring: 217 100% 50%;
  --destructive: 0 84% 60%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 4%;
  --foreground: 0 0% 98%;
  --primary: 217 100% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4% 16%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;
  --accent: 45 93% 47%;
  --accent-foreground: 240 10% 4%;
  --accent-hover: 45 93% 52% / 0.1;
  --accent-active: 45 93% 52% / 0.15;
  --accent-border-hover: 45 93% 52% / 0.3;
  --card: 240 10% 4%;
  --card-foreground: 0 0% 98%;
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 45 93% 47%;
  --destructive: 0 63% 31%;
}
```

---

## 11. Accessibility

### Focus States
```css
*:focus-visible {
  outline: 2px solid rgb(147, 197, 253);
  outline-offset: 1px;
}
```

### Color Contrast
- Ensure text meets WCAG AA standards (4.5:1 for normal text)
- Use `text-gray-300` minimum on dark backgrounds
- Use `text-gray-700` minimum on light backgrounds

### Motion
- Respect `prefers-reduced-motion` for animations
- Provide alternative visual feedback without motion

---

## 12. Application Context

### Key User Flows

1. **Stealth Landing → Registration → Onboarding**
   - Dramatic, exclusive entry experience
   - Code-based unlock creates sense of achievement
   - Questionnaire gathers user context

2. **Search → Results → Email Outreach**
   - Clean, functional search interface
   - Results displayed as cards with contact actions
   - Email drawer for composing outreach

3. **Quest Progression**
   - Gamified learning/onboarding
   - Progress tracking with amber/green colors
   - Certificate achievement on completion

### Design Principles

1. **Gamification over Friction** - Make sales feel like quests, not chores
2. **Progressive Disclosure** - Reveal features as users need them
3. **Celebration Moments** - Reward achievements with visual feedback
4. **Professional Playfulness** - Balance fun with business credibility
5. **Dark Mode Excellence** - Premium, dramatic experiences in dark mode

---

*Last updated: December 2024*
