# Design System

## Product

A healthcare marketplace where patients discover nearby hospitals, clinics, and doctors, then request appointments. Patients can browse without signing in. Clinic staff must approve appointment requests before they are confirmed.

## Visual direction

Use a calm, modern clinical style that feels trustworthy, welcoming, and easy to use.

- Keep layouts clear, uncluttered, and responsive.
- Use generous whitespace and a clear visual hierarchy.
- Avoid a cold hospital look, overly playful styling, and decorative elements that compete with important information.
- Use straightforward, patient-friendly wording.

## Color palette

- **Primary teal:** `#0F766E` — primary actions, links, and selected states.
- **Navy:** `#14324A` — headings and strong text.
- **Warm white:** `#F8FAF9` — page background.
- **Pale mint:** `#E7F5F1` — soft section backgrounds and subtle highlights.
- **White:** `#FFFFFF` — cards and input surfaces.
- **Success green:** use for positive statuses, with sufficient text contrast.
- **Error red:** use only for errors, cancellations, or urgent warnings.

Do not use color alone to communicate status. Pair colors with labels, icons, or other visual cues. Check text and control contrast for accessibility.

## Typography

- Use a clean, highly readable sans-serif font.
- Establish consistent styles for page titles, section headings, body text, labels, and helper text.
- Use medium or bold weights for headings and important actions.
- Keep body copy comfortable to read and form labels concise.
- Avoid using too many font sizes or weights on one screen.

## Layout and spacing

- Use a consistent spacing scale throughout the app.
- Keep content aligned to a clear grid and readable maximum width.
- Make layouts responsive for desktop, tablet, and mobile browser widths.
- Keep primary actions easy to find without making pages feel crowded.
- Use whitespace to separate sections and group related information.

## Components

- Use cards with modest corner rounding and subtle borders or shadows.
- Use clear buttons with descriptive labels, such as **“Request appointment.”**
- Use simple icons for specialties and care categories.
- Provider cards should prioritize the information patients need to decide: provider name and type, location or distance, specialties or services, and appointment availability.
- Keep forms consistent, with visible labels, focus states, validation messages, and clear error text.
- Include thoughtful loading, empty, success, and error states.

## Statuses

Appointment statuses must include readable text labels. Use consistent visual treatments for **Pending**, **Confirmed**, **Rejected**, **Cancelled**, **Completed**, and **No-show**.

## Accessibility

- Maintain readable contrast for text and controls.
- Support keyboard navigation and visible focus indicators.
- Use labels and instructions that work with assistive technology.
- Do not rely on color alone for meaning.
- Make interactive targets comfortable to use on touch screens.

## Role-specific feel

- **Patient-facing pages:** welcoming, reassuring, and easy to scan.
- **Clinic, hospital, doctor, and admin pages:** more information-dense and task-focused, while using the same palette, typography, spacing, and component styles.

## Consistency

Centralize colors, typography, spacing, and reusable component styles so they can be adjusted without restyling every page. Apply this design system consistently to the web app and the future Expo app.
