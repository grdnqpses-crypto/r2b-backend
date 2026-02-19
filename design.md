# Belief Field Detector — Design Document

## Concept

A scientific-feeling mobile app that uses every available phone sensor to measure environmental conditions while a user focuses on a belief. The app makes every reading transparent — the user sees what each sensor measures, understands why it matters, and watches how their focused belief correlates with environmental changes. The experience is educational, immersive, and empowering.

## Design Philosophy

- **Full Transparency**: Every sensor reading is visible with plain-language explanation of what it measures and why.
- **Scientific Feel**: Data-rich UI with real numbers, units, graphs — like a lab instrument, not a toy.
- **Guided Experience**: The user is walked through each step so they understand the process.
- **Mobile Portrait (9:16)**: One-handed use, thumb-friendly controls at bottom, data displays above.
- **iOS HIG Compliance**: Native feel, SF-style icons, system fonts, clean spacing.

---

## Color Palette

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| primary | #6C3CE1 | #9B7AFF | Deep violet — belief/energy/consciousness |
| background | #0A0A1A | #0A0A1A | Always dark — scientific instrument feel |
| surface | #141428 | #141428 | Cards, panels |
| foreground | #E8E8F0 | #E8E8F0 | Primary text |
| muted | #7A7A9A | #7A7A9A | Secondary text, labels |
| border | #2A2A4A | #2A2A4A | Subtle dividers |
| success | #00E676 | #00E676 | Positive readings, high belief |
| warning | #FFB300 | #FFB300 | Medium readings |
| error | #FF5252 | #FF5252 | Low readings, alerts |

The app uses a permanently dark theme to feel like a scientific instrument / detector device.

---

## Screen List

### 1. Onboarding (3 slides)
- **Slide 1 — "Your Phone Is a Lab"**: Shows icons of all sensors. Explains the phone has 7+ scientific instruments built in.
- **Slide 2 — "Belief Creates Energy"**: Explains the concept — when you focus belief, your body changes (heart rate, micro-movements, temperature) and the phone can detect these shifts.
- **Slide 3 — "Measure Your Field"**: Shows how the app works — choose a belief, focus, and watch the sensors respond. "Begin" button.

### 2. Home / Belief Input (Tab 1: "Detect")
- **Header**: "Belief Field Detector" with subtle pulse animation
- **Belief Input Section**: 
  - Text input: "What do you believe in?" with suggestions (Santa Claus, Guardian Angels, Luck, Love, The Universe, Ghosts, etc.)
  - Quick-pick chips for common beliefs
- **Belief Intensity Slider**: 1-10 scale, "How strongly do you believe?"
- **"Begin Scan" Button**: Large, glowing, centered — starts the detection session
- **Recent Scans**: Last 3 scans shown as mini-cards with belief name and score

### 3. Live Scanner (Full Screen Overlay)
The core experience. Shows all sensors in real-time during a 60-second scan.

- **Top**: Timer countdown (60s), belief name displayed
- **Sensor Dashboard Grid** (2 columns, scrollable):
  Each sensor card shows:
  - Sensor name + icon
  - **Current reading** (real number with units)
  - **What it measures** (one-line explanation)
  - **Why it matters** (how it relates to belief)
  - Mini sparkline graph of last 10 seconds
  - Status indicator (active/baseline/shifting)

  **Sensors displayed:**
  1. **Accelerometer** — "Measures micro-movements (m/s²)" — "Your body subtly shifts when you focus belief"
  2. **Gyroscope** — "Measures rotation rate (rad/s)" — "Belief focus changes your postural stability"
  3. **Magnetometer** — "Measures magnetic field (μT)" — "Electromagnetic fields shift with concentrated energy"
  4. **Barometer** — "Measures air pressure (hPa)" — "Atmospheric pressure responds to environmental energy"
  5. **Light Sensor** — "Measures ambient light (lux)" — "Light perception shifts with heightened awareness"
  6. **Device Motion** — "Measures orientation & gravity" — "Your physical alignment changes during focus"
  7. **Pedometer** — "Measures movement steps" — "Stillness during belief indicates deep focus"

- **Central Belief Field Visualization**: 
  A pulsing, animated orb/field that grows and shifts color based on aggregate sensor deviation from baseline. This is the "belief field" — the visual representation of all sensor data combined.

- **Bottom**: "Understanding" ticker — scrolling text explaining what's happening in real-time ("Magnetometer shifted +2.3μT from baseline — your focused energy is affecting the local magnetic field")

### 4. Results Screen (After Scan)
- **Belief Field Score**: Large number (0-100) with label and color
- **Score Breakdown**: How the score was calculated — each sensor's contribution shown as a bar
- **Sensor Detail Cards**: Expandable cards for each sensor showing:
  - Baseline vs. peak reading
  - Deviation percentage
  - Plain-language interpretation ("Your magnetic field shifted 15% during peak focus — this suggests your belief energy created a measurable electromagnetic change")
- **"What This Means" Section**: Summary paragraph explaining the results in accessible language
- **Save & Share buttons**

### 5. History (Tab 2: "History")
- List of past scans sorted by date
- Each entry shows: belief name, score, date, mini sensor summary
- Tap to view full results
- Stats at top: total scans, average score, strongest belief

### 6. Learn (Tab 3: "Learn")
- **"How Your Phone Sensors Work"**: Educational cards explaining each sensor
- **"The Science of Belief"**: Articles about placebo effect, psychosomatic responses, observer effect
- **"Understanding Your Results"**: How to interpret scores and what they mean
- Each article is a scrollable card with clear headings and illustrations

---

## Key User Flows

### Primary Flow: Run a Belief Scan
1. User opens app → Home screen
2. Types or selects a belief (e.g., "Guardian Angels")
3. Sets intensity slider (e.g., 8/10)
4. Taps "Begin Scan"
5. 5-second countdown: "Clear your mind... Focus on your belief..."
6. Live Scanner screen appears — all sensors active, readings visible
7. User watches real-time data for 60 seconds
8. Scan completes → Results screen with score and breakdown
9. User reads interpretation, optionally saves

### Secondary Flow: Review History
1. User taps History tab
2. Scrolls through past scans
3. Taps a scan → Full results view
4. Compares scores across different beliefs

### Tertiary Flow: Learn About Sensors
1. User taps Learn tab
2. Browses educational content
3. Reads about how each sensor works and the science behind belief measurement

---

## Navigation Structure

**Tab Bar (3 tabs):**
1. **Detect** (house icon) — Home + belief input
2. **History** (clock icon) — Past scans
3. **Learn** (book icon) — Educational content

**Modal/Overlay:**
- Live Scanner (full screen, no tabs)
- Results (full screen, dismiss to home)
- Onboarding (shown once on first launch)

---

## Key Interaction Patterns

- **Sensor cards**: Each shows name, icon, live value, unit, explanation, and mini-graph
- **Belief field orb**: Central animated visualization responding to aggregate data
- **Real-time ticker**: Scrolling explanations of what sensors are detecting
- **Haptic feedback**: Subtle vibration when belief field intensity changes significantly
- **Keep awake**: Screen stays on during scan
