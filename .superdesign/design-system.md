# Audiff design system

## Product and experience

Audiff is a private, browser-only music player and synchronized A/B comparison tool. Hiyori is not a mascot in a card; she is the living center of the listening room. The interface must make three states legible without changing visual language: no track, one-track listening, and two-track comparison.

## Visual direction

- Warm editorial listening room, informed by Hiyori's cream cardigan, navy uniform, muted red ribbons, and soft anime rendering.
- Quiet ivory paper background with subtle texture; deep navy editorial type; muted teal for A and coral rose for B.
- Use generous negative space and thin structural rules. Cards should feel like pieces of a listening console, not generic dashboard widgets.
- Large serif headlines may introduce a mode, but controls and metadata use a compact neutral sans-serif.
- Hiyori remains visually integrated through composition, ambient light, and overlap—not through a bordered character panel.
- Avoid gradients with saturated neon color, glassmorphism spectacle, waveform-as-decoration, fake eye-tracking rays, dashed gaze lines, callout arrows, explanatory orbital diagrams, or technical legends.

## Layout

- Desktop comparison: A occupies the left listening position, Hiyori the central focal position, B the right listening position. The active side is communicated through card emphasis, status copy, and Hiyori's actual gaze.
- Solo: retain the same spatial grammar so adding B feels like filling an existing listening position.
- The synchronized transport is a single calm instrument panel below the listening scene.
- Mobile: stack mode heading, character, tracks, and transport with compact vertical rhythm. Hiyori should remain large enough to read her motion and gaze.

## Components

- Track cards: warm solid surface, fine border, large A/B identity marker, file metadata, restrained active state. No floating decorative connector.
- Status capsule: compact text only; it can state Listening to A/B but must not draw a line toward a target.
- Transport: shared clock and play control are primary. A/B selector is adjacent and unambiguous. Waveform-like amplitude bars are functional seeking context only.
- Buttons: navy primary, ivory surface secondary, clear keyboard focus.

## Motion principles

- Every music-driven change is continuous and phase-coherent. Never launch random authored full-body motions on isolated thresholds.
- The visible beat must be expressed through Hiyori's internal pose parameters, never by translating, rotating, or scaling the entire Live2D display object. Onsets produce a restrained head-nod spring; bass shapes internal body sway.
- Hair, skirt, and ribbons are outputs of Hiyori's authored Physics and must follow head/body movement naturally rather than being driven directly.
- A/B gaze changes use normalized eye/head focus targets with damping. Do not visualize the gaze path with UI decoration.
- Paused state settles gradually to the authored idle rather than snapping still.
- Strong onsets may pulse a soft A/B-colored ambient bloom and floor light. Keep the physical contact shadow narrow, centered, and independent from the colored light.
- EyeOpen is controlled by one continuous eased blink curve; do not combine authored EyeOpen curves with a second automatic blink writer.

## Tokens

- Background: #f8f4ed
- Primary ink: #202b46
- Muted ink: #737786
- Track A: #5b8d86
- Track B: #d45f73
- Ready: #61c79a
- Surface: rgba(255, 252, 247, 0.92)
- Border: rgba(32, 43, 70, 0.14)
- Display font: Georgia, Times New Roman, serif
- UI font: Inter-like system sans-serif
- Main radii: 14px, 22px, 26px
- Breakpoints: 900px, 600px
