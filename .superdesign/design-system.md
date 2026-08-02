# Audiff design system

## Product and experience

Audiff is a private, browser-only music player and synchronized A/B comparison tool. Hiyori is not a mascot in a card; she is the living center of the listening room. The interface must make three states legible without changing visual language: no track, one-track listening, and two-track comparison.

## Visual direction

- Warm editorial listening room, informed by Hiyori's cream cardigan, navy uniform, muted red ribbons, and soft anime rendering.
- UI ornamentation leans toward restrained hand-drawn Japanese stationery: warm washi-like paper grain, slightly imperfect ink rules, pencil-soft icon contours, and small hanko-inspired A/B marks. It should feel illustrated by hand, not themed like an anime fan site.
- Hand-drawn character belongs in the edges and surfaces: subtly irregular borders, occasional short brush underlines, and quiet margin annotations. Preserve generous negative space and precise control alignment so the player remains trustworthy.
- Quiet ivory paper background with subtle texture; deep navy editorial type; muted teal for A and coral rose for B.
- Use generous negative space and thin structural rules. Cards should feel like pieces of a listening console, not generic dashboard widgets.
- Large serif headlines may introduce a mode, but controls and metadata use a compact neutral sans-serif.
- Hiyori remains visually integrated through composition, ambient light, and overlap—not through a bordered character panel.
- Avoid gradients with saturated neon color, glassmorphism spectacle, waveform-as-decoration, fake eye-tracking rays, dashed gaze lines, callout arrows, explanatory orbital diagrams, or technical legends.
- Avoid kawaii sticker overload, sakura decoration, manga speed lines, heavy black comic outlines, faux handwritten body copy, or jittering controls. Hand-drawn irregularity is visual only and must never compromise hit targets or alignment.

## Layout

- Listening mode uses a record-book hierarchy with no overlap: editorial masthead, a separate A / session / B score strip, an uninterrupted Live2D stage, then one synchronized transport shelf.
- A and B are structurally above the stage and aligned to its left and right edges. Hiyori's damped eye and head focus can look upward-left or upward-right toward credible spatial targets without any connector decoration.
- Solo retains the same score strip so adding B feels like completing the facing page.
- Mobile keeps both compact track notes above the character, followed by the uninterrupted stage and transport. Never place cards across the model's feet or body.

## Components

- Track notes: flat manuscript rows inside the score strip, separated by fine ink rules rather than floating rounded cards. Use a hanko-like A/B identity marker, concise metadata, restrained active underline, and no decorative connector.
- Track state language: use `READY` for a decoded inactive track, `CUED` for the selected paused track, and `PLAYING` only while audio is audible. Do not pair a generic success checkmark with overlapping hover-only actions. Replace and Remove remain stable, separately labeled controls that reserve their own layout space.
- Status capsule: compact text only; it can state Listening to A/B but must not draw a line toward a target.
- Transport: shared clock and play control are primary. A/B selector is adjacent and unambiguous. Waveform-like amplitude bars are functional seeking context only.
- Buttons: navy primary, ivory paper secondary, pencil-soft icon treatment, clear keyboard focus. Every interactive surface has exactly one persistent boundary; never duplicate its border with an offset pseudo-element or inset ring. Depth comes from a soft diffuse shadow, while an extra outline appears only for `:focus-visible`.
- Icon system: secondary actions use one optically balanced 1.7px rounded monoline family with geometric SVG rendering and 32–40px hit areas. Filled geometry is reserved for the primary play/pause control. Product title, session title, status, and metadata must remain four distinct typographic levels.
- Brand mark: one navy rounded-square silhouette with no permanent outer contour, inset ring, or hard bottom-edge shadow.
- Precision time: current time and total duration use tabular numerals, never wrap, and occupy a reserved column wide enough for two `00:00.000` values plus separator. Timeline A/B row labels must never share that overflow space.
- Camera controls: a small stage-edge capsule with Director/Manual state, explicit Portrait and Wide presets, and a transient zoom readout. Entering the player establishes a 212% upper-body portrait before handing off to the Director; wheel framing switches to persistent Manual control. Manual framing may reach 235%. Never use a permanent large zoom slider.
- Secondary controls and status copy should not repeat the same information. File removal stays discoverable on hover/focus; clear-all remains visually subordinate; privacy and keyboard help may recede further once the listening scene is active.

## Motion principles

- Every music-driven change is continuous and phase-coherent. Never launch random authored full-body motions on isolated thresholds.
- The visible beat must be expressed through Hiyori's internal pose parameters, never by translating, rotating, or scaling the entire Live2D display object. Onsets produce a restrained head-nod spring; bass shapes internal body sway.
- Hair, skirt, and ribbons are outputs of Hiyori's authored Physics and must follow head/body movement naturally rather than being driven directly.
- A/B gaze changes use normalized eye/head focus targets with damping. Do not visualize the gaze path with UI decoration.
- Automatic camera changes operate at phrase scale and must be perceptible without becoming rhythmic zoom: use bounded 12–18 second push/pull arcs between roughly 142% and 210%, velocity-limited easing, and no onset-driven camera changes. Start near portrait framing, then let the phrase arc earn the pull-back.
- Paused state settles gradually to the authored idle rather than snapping still.
- Playing state must read before close inspection: ease into a softened attentive expression, slight forward listening posture, beat-timed internal head nod, and bass-weighted body sway. Paused state removes those offsets while preserving Hiyori's authored idle and natural blink.
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
