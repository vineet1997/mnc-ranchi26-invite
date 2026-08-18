# Indian Trading Company — SPACES Ranchi Conference Invitation

A mobile-first digital invitation for the SPACES Conference hosted by Indian Trading Company, authorised distributor for Jharkhand.

The experience is designed primarily for links opened from WhatsApp and Facebook. Its signature opening uses the event's home-textile context directly: premium ivory fabric is snapped open, billows across the screen, and settles into the invitation.

## Event

- **Date:** 25 August 2026
- **Time:** 6:00 PM onwards
- **Venue:** Lemon Tree Hotel, Ranchi - Conference Hall, 7th Floor
- **Host:** Indian Trading Company
- **Brand partner:** SPACES

Contact information and some event details are intentionally easy to update as they are confirmed.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run build
```

## Printed invitation proof

The one-sided card is a 148 x 99 mm landscape invitation with 3 mm bleed.
Its QR is generated as vector artwork with high error correction, so the
destination can be replaced safely without redesigning the card.

```bash
$env:INVITATION_URL = "https://your-final-vercel-url"
npm run generate:print
```

The output is written to `output/print/`. Do not send the included proof to
print until `INVITATION_URL` has been set to the final deployed website.

## Technology

- Next.js App Router
- TypeScript
- Three.js
- A purpose-built fixed-timestep cloth simulation
- CSS-based responsive invitation layout

The cloth renderer progressively enhances the page. Reduced-motion preferences and unsupported devices receive a complete static invitation.

## Deployment

The project is ready for deployment as a standard Next.js application on Vercel.
