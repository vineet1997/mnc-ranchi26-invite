# Ranchi Invitation — Project Choices and Learnings

**Project:** Mukesh & Company × SPACES Ranchi Conference Invitation  
**Recorded:** 12 August 2026

## 1. The brief

Mukesh & Company is the primary host of a conference marking its role as SPACES' authorised distributor for Jharkhand. The audience is the state's retail community. Most guests will encounter the invitation on a mobile phone after opening a link from WhatsApp or Facebook.

The page therefore had to achieve four things in sequence:

1. Feel like a personal, premium invitation.
2. Make Mukesh & Company visibly authoritative as the host.
3. Explain why the event matters to a retailer.
4. Make confirmation, directions, and event retrieval effortless.

The core event details taken from the supplied poster are:

- SPACES Conference
- “Discover. Connect. Grow Together.”
- 23 August 2026
- 3:00 PM onwards
- Chanakya BNR, Ranchi
- Exclusive preview, new collection launch, networking and growth, and event offers

Operational details such as the final WhatsApp number, exact host names, RSVP deadline, agenda, refreshments, and final venue pin remain editable pending confirmation.

## 2. Creative direction

Several disciplines independently converged on two textile metaphors:

- **The Unfolding:** a new business chapter revealed by opening a piece of premium fabric.
- **The Partnership Weave:** individual threads becoming a stronger shared textile.

The final direction is **“A New Chapter Unfolds.”** Fabric is the visual world; a restrained thread is only the guide. This hierarchy prevents the design from becoming a collage of textile tricks.

The experience has two complementary acts:

- An emotional opening that earns attention.
- A practical invitation that communicates the occasion and converts interest into attendance.

## 3. Brand hierarchy

Mukesh & Company is the primary host. SPACES is the featured brand partner.

Important decisions:

- Mukesh & Company appears first and at least matches or exceeds SPACES in visual prominence.
- The custom Mukesh & Company wordmark stands on its own without an extra monogram.
- “Authorised distributor for Jharkhand” belongs in the explanatory story, not crowded into the opening header.
- The SPACES identity is kept authentic and its multicolour mark is not recoloured or imitated throughout the page.
- Guests are described as retail partners rather than an audience to reinforce the relationship-led tone.

## 4. Visual language

The palette is warm bone, ivory, espresso, muted madder, and restrained antique brass. It is intentionally lighter and more hospitable than a black-and-gold luxury treatment.

The real premium ivory fabric photograph supplied for the project became the hero material. It has credible weave, sheen, scale, and fold detail that a procedural texture or generic generated room image could not match.

The photograph is softened in the renderer so that it remains tactile without overpowering the invitation. The static page underneath the moving fabric is a simple warm surface, avoiding the uncanny effect of one bedsheet unfolding over a second faded copy of itself.

Luxury came from restraint:

- One significant motion rather than animation everywhere.
- Editorial typography and generous negative space.
- A small number of tailored textile references rather than many patch-like labels.
- No palace, velvet-curtain, bridal-card, or generic furniture-showroom clichés.

## 5. How the opening evolved

### Attempt 1: a quick decorative reveal

The first unfold was too short to register emotionally. The cloth moved, paused, and the text appeared as separate scenes. It felt like a sequence of effects rather than one event.

**Learning:** motion and information must share causality. The fabric movement should create the invitation, not finish before the invitation begins.

### Attempt 2: line-based image reveals

A left-to-right sharpening line and a second movement line produced a recognisably digital wipe. The visitor could see the mechanism rather than believe the material.

**Learning:** a bedsheet does not reveal itself through a geometric scan line. Avoid using masking language when the intended metaphor is physical material.

### Attempt 3: pre-scripted transforms

Billowing, flutter, overshoot, and settling were approximated with timed transforms. The overshoot happened too late, depth was difficult to perceive, and the movement still read primarily as an unfold.

**Learning:** named animation phases do not guarantee perceptible physical behaviour. The silhouette, acceleration, rebound, and timing must all provide evidence of mass.

### Final approach: simulated cloth

The final system treats the image as a connected cloth surface rather than as a rectangular picture:

- A grid of particles represents the material.
- Structural, shear, and bend constraints hold the weave together.
- A fixed timestep makes behaviour stable across varying frame rates.
- Staggered release and an off-centre impulse make the leading edge feel human rather than mechanical.
- Gravity, a brief gust, damping, and collision provide momentum and rebound.
- A perspective camera, dynamic normals, and a soft displaced shadow make depth visible.
- Invitation copy begins from the measured speed of the cloth, not from a disconnected timer.

This choice was influenced by the game-feel principles recorded in the Penfight field note: real state, consistent units, fixed updates, impulses, damping, and explicit settle detection create a more believable result than decorative easing alone.

## 6. The bed-making choreography

The first physical version proved the simulation worked, but exposed two composition problems:

- The starting sheet was compressed into a thin strip near the top, so much of the meaningful movement happened outside the viewport.
- The final sheet could leave exposed background at the edges, creating unresolved anticipation.

The final choreography models a recognisable human gesture:

1. **Gather:** a substantial folded sheet already occupies roughly the upper half of the screen.
2. **Snap:** the leading portion is released asymmetrically and receives a forward impulse.
3. **Billow:** the connected surface carries the impulse across the visible viewport.
4. **Contact:** the centre progressively meets an implied bed plane.
5. **Settle:** the interior is gently drawn flat while the untucked perimeter retains small curls.

The cloth is larger than the viewport so normal edge contraction never exposes accidental gaps. Late-stage attraction to the bed plane and stronger damping resolve the motion decisively without making the fabric perfectly flat or synthetic.

## 7. Timing and content reveal

The loading screen exists for a practical reason: the full-resolution textile and fonts must be ready before the opening is exposed. This prevents the image from appearing grainy, sharpening abruptly, and then beginning to move.

The loading screen is quiet and branded. Once assets are decoded, the physical sequence begins. Content enters in a coordinated order after the cloth has materially slowed:

1. Mukesh & Company and SPACES lockup
2. “A new chapter unfolds.”
3. Conference identity and event details
4. Attendance and direction actions

Essential information never depends on completing an interaction. A visitor can skip the intro, and reduced-motion users receive the finished invitation immediately.

## 8. Mobile and performance choices

The primary environment is a mobile browser embedded inside a messaging or social application, often on a mid-range Android device and an inconsistent connection.

Accordingly:

- The hero uses a still image, not autoplay video.
- Assets are decoded before animation begins.
- The cloth grid is less dense on compact screens.
- Device pixel ratio is capped to prevent unnecessary rendering cost.
- Physics uses capped substeps to avoid a slow frame causing a spiral of extra work.
- The renderer stops once the material has settled.
- The page remains fully useful when WebGL is unavailable.
- Reduced-motion preferences bypass the animation.
- Event facts and calls to action remain readable over the fabric.

The project deliberately avoids WebGPU-only features because the invitation must behave reliably across in-app browsers. A small custom solver was preferable to a large general physics engine because the requirement is one controlled deformable surface, not a world of rigid objects.

## 9. Information and conversion design

The invitation follows the hospitality sequence:

> I am personally invited → this matters to my business → I know what to expect → I can confirm easily → I can reach the venue.

Practical choices include:

- Date, time, city, and venue are visible very early.
- WhatsApp confirmation is the primary RSVP path.
- Directions are a first-class action.
- Add to Calendar is available for later retrieval.
- A compact form prepares a clear WhatsApp message without requiring a backend.
- The site can later support a restrained event-day state that prioritises venue, time, directions, and contact.

## 10. Engineering architecture

The site uses Next.js, TypeScript, Three.js, and CSS. The main responsibilities are separated:

- `app/invitation.tsx` owns the invitation content and opening state.
- `app/fabric-scene.tsx` owns rendering, asset preparation, responsive resolution, and content staging.
- `app/cloth-simulation.ts` owns particle state, physical constraints, impulses, bed contact, and settle detection.
- `app/globals.css` owns the editorial layout, brand styling, fallbacks, and responsive behaviour.
- `lib/event.ts` centralises event details so provisional information is easy to correct.

The most important tuning parameters are grouped in one `FEEL` configuration. Future iteration should change these intentionally rather than scattering arbitrary durations through rendering and CSS.

## 11. Principles worth reusing

1. **Use the business category as interaction material.** The fabric is meaningful because this is a home-furnishing business.
2. **Prefer one memorable gesture to many effects.** Quiet surroundings make the real moment feel expensive.
3. **Asset readiness is part of choreography.** Loading behaviour can either protect or ruin the first impression.
4. **Animation needs causality.** Content should feel revealed by the physical event.
5. **Physics still needs art direction.** A correct simulation can begin or end in the wrong composition.
6. **Design the first and last frames deliberately.** They carry as much emotional weight as the movement between them.
7. **Overscan physical surfaces.** Deforming edges should not accidentally expose the implementation.
8. **Settle by measurement, not hope.** Velocity thresholds and a safety timeout are clearer than guessing a fixed duration.
9. **Progressive enhancement protects ambition.** A high-impact experience can still have a complete low-power fallback.
10. **Host hierarchy must survive aesthetics.** The page exists to strengthen Mukesh & Company's relationship with retailers, not merely showcase SPACES.

## 12. Next decisions

- Confirm the official RSVP WhatsApp and call numbers.
- Confirm host names, roles, RSVP deadline, and guest policy.
- Confirm exact venue listing, address, entrance, parking, and map pin.
- Add the agenda and refreshment details once final.
- Add authentic SPACES collection imagery only if suitable approved images become available.
- Verify final brand wording and supplied assets before public launch.
- Test the deployed link inside WhatsApp, Facebook, Android Chrome, and iPhone Safari.
- Add a custom production domain and verify the social share preview after deployment.
