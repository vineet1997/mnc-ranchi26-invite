"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarBlank,
  Check,
  MapPin,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { event, promises } from "@/lib/event";

const FabricScene = dynamic(
  () => import("./fabric-scene").then((module) => module.FabricScene),
  { ssr: false },
);

function SpacesMark() {
  return (
    <div className="spaces-mark" aria-label="SPACES">
      {["S", "P", "A", "C", "E", "S"].map((letter, index) => (
        <span key={`${letter}-${index}`}>{letter}</span>
      ))}
    </div>
  );
}

function MukeshWordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`mukesh-mark${inverse ? " inverse" : ""}`}>
      <strong>Mukesh <i>&</i> Company</strong>
    </div>
  );
}

type OpeningPhase = "loading" | "opening" | "complete" | "static";

export function Invitation() {
  const [openingStart, setOpeningStart] = useState<number | null>(null);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>("loading");
  const [showDock, setShowDock] = useState(false);
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [town, setTown] = useState("");
  const [guests, setGuests] = useState("1");
  const loaderStartedAtRef = useRef(0);
  const openingCommittedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);

  const handleFabricReady = useCallback((usableForOpening: boolean) => {
    if (openingCommittedRef.current) return;
    openingCommittedRef.current = true;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumHold = reducedMotion ? 120 : 1350;
    const elapsed = performance.now() - loaderStartedAtRef.current;
    const remainingHold = Math.max(minimumHold - elapsed, 0);

    releaseTimerRef.current = window.setTimeout(() => {
      if (!usableForOpening || reducedMotion) {
        setOpeningPhase("static");
        return;
      }

      const start = performance.now();
      setOpeningStart(start);
      setOpeningPhase("opening");
    }, remainingHold);
  }, []);

  const completeOpening = useCallback(() => {
    setOpeningPhase("complete");
  }, []);

  const skipOpening = useCallback(() => {
    openingCommittedRef.current = true;
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }
    setOpeningStart(null);
    setOpeningPhase("static");
  }, []);

  useEffect(() => {
    loaderStartedAtRef.current = performance.now();
    const fallbackTimer = window.setTimeout(() => handleFabricReady(false), 6500);
    return () => {
      window.clearTimeout(fallbackTimer);
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    };
  }, [handleFabricReady]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      document.documentElement.style.setProperty("--thread-progress", String(progress));
      setShowDock(window.scrollY > Math.min(window.innerHeight * 0.88, 760));
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const whatsappHref = useMemo(() => {
    const person = name.trim() || "[your name]";
    const shop = store.trim() || "[store name]";
    const place = town.trim() || "[town]";
    const message = `Namaste, I'm ${person} from ${shop}, ${place}. I would like to confirm our attendance at the SPACES Conference in Ranchi on 23 August 2026. Total guests: ${guests}.`;
    return `https://wa.me/${event.rsvpNumber}?text=${encodeURIComponent(message)}`;
  }, [guests, name, store, town]);

  return (
    <main className={`invitation opening-${openingPhase}`}>
      <div className="thread" aria-hidden="true"><span /></div>

      <section className="hero" id="top">
        {openingPhase !== "static" ? (
          <FabricScene
            startAt={openingStart}
            onReady={handleFabricReady}
            onComplete={completeOpening}
          />
        ) : null}

        <div className="opening-loader" aria-live="polite" aria-label="Preparing your invitation">
          <div className="opening-loader-mark"><MukeshWordmark /></div>
          <div className="opening-loader-thread" aria-hidden="true"><span /></div>
          <p>Preparing your invitation<span aria-hidden="true">...</span></p>
        </div>

        {openingPhase === "loading" || openingPhase === "opening" ? (
          <button className="opening-skip" type="button" onClick={skipOpening}>
            Skip intro
          </button>
        ) : null}

        <div className="hero-nav">
          <MukeshWordmark />
          <span className="partnership-stitch" aria-hidden="true" />
          <SpacesMark />
        </div>

        <div className="hero-copy">
          <h1>
            A new chapter
            <em>unfolds.</em>
          </h1>
          <div className="hero-title-row">
            <p>SPACES Conference</p>
            <span>Ranchi &middot; 2026</span>
          </div>
        </div>

        <div className="hero-details" aria-label="Event details">
          <div>
            <span>Date</span>
            <strong>{event.shortDate}</strong>
            <small>{event.weekday}</small>
          </div>
          <div>
            <span>Time</span>
            <strong>3:00 PM</strong>
            <small>Onwards</small>
          </div>
          <div>
            <span>Venue</span>
            <strong>Chanakya BNR</strong>
            <small>Ranchi</small>
          </div>
        </div>

        <div className="hero-actions">
          <a className="button button-primary" href="#rsvp">
            Confirm attendance <ArrowDown weight="bold" />
          </a>
          <a className="text-link" href={event.directionsUrl} target="_blank" rel="noreferrer">
            Get directions <ArrowUpRight weight="bold" />
          </a>
        </div>
        <p className="hero-note">Discover. Connect. Grow together.</p>
      </section>

      <section className="chapter section-pad reveal-section">
        <div className="section-heading">
          <p className="overline">A landmark partnership</p>
          <h2>Woven around<br />shared growth.</h2>
        </div>
        <div className="chapter-copy">
          <p className="lead">
            Mukesh & Company is delighted to begin its journey as the authorised
            distributor for SPACES across Jharkhand.
          </p>
          <p>
            We invite our retail partners to an afternoon of considered design,
            meaningful conversation and opportunities for the season ahead.
          </p>
          <div className="signature">
            <span>With warm regards</span>
            <strong>Mukesh & Company</strong>
          </div>
        </div>
      </section>

      <section className="promises section-pad reveal-section">
        <header className="section-heading centered">
          <p className="overline">What awaits you</p>
          <h2>A first look at<br /><em>what comes next.</em></h2>
        </header>
        <div className="promise-grid">
          {promises.map((promise) => (
            <article className="promise-card" key={promise.numeral}>
              <span className="promise-index">{promise.numeral}</span>
              <div>
                <h3>{promise.title}</h3>
                <p>{promise.copy}</p>
              </div>
              <span className="selvedge" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="occasion reveal-section" id="details">
        <div className="occasion-inner">
          <p className="overline">Save the date</p>
          <div className="date-display">
            <span>Sunday</span>
            <strong>23</strong>
            <div><b>August</b><small>2026</small></div>
          </div>
          <div className="occasion-rule" aria-hidden="true"><span /></div>
          <div className="occasion-info">
            <div>
              <CalendarBlank weight="thin" />
              <span>Begins at</span>
              <strong>{event.timeLabel}</strong>
            </div>
            <div>
              <MapPin weight="thin" />
              <span>Meet us at</span>
              <strong>{event.venue}</strong>
              <small>{event.address}</small>
            </div>
          </div>
          <div className="occasion-actions">
            <a className="button button-light" href={event.directionsUrl} target="_blank" rel="noreferrer">
              Open in Maps <ArrowUpRight weight="bold" />
            </a>
            <a className="button button-ghost" href="/calendar">
              Add to calendar <CalendarBlank weight="bold" />
            </a>
          </div>
        </div>
      </section>

      <section className="rsvp section-pad reveal-section" id="rsvp">
        <div className="rsvp-intro">
          <p className="overline">Your invitation</p>
          <h2>We look forward<br />to welcoming you.</h2>
          <p>
            Kindly confirm by {event.rsvpDeadline}. Your message will open in
            WhatsApp for you to review before sending.
          </p>
          <div className="contact-line">
            <span>Hosted by</span>
            <strong>{event.hostName} & {event.coHostName}</strong>
            <a href={`tel:+${event.rsvpNumber}`}>{event.displayRsvpNumber}</a>
          </div>
        </div>

        <form className="rsvp-form" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" autoComplete="name" />
          </label>
          <label>
            <span>Store name</span>
            <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Your business" autoComplete="organization" />
          </label>
          <div className="form-row">
            <label>
              <span>Town / City</span>
              <input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Your town" autoComplete="address-level2" />
            </label>
            <label>
              <span>Total guests</span>
              <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                {[1, 2, 3, 4, 5].map((guest) => <option key={guest} value={guest}>{guest}</option>)}
              </select>
            </label>
          </div>
          <a className="button button-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
            <WhatsappLogo weight="fill" /> Confirm on WhatsApp
          </a>
          <p className="form-note"><Check weight="bold" /> No information is stored on this website.</p>
        </form>
      </section>

      <footer>
        <div className="closing-knot" aria-hidden="true"><span /></div>
        <MukeshWordmark inverse />
        <SpacesMark />
        <p>Let&apos;s create a season of success together.</p>
        <a href="#top">Back to top <ArrowDown weight="bold" /></a>
      </footer>

      <nav className={`mobile-dock${showDock ? " visible" : ""}`} aria-label="Quick actions">
        <a href="#rsvp"><WhatsappLogo weight="fill" /> Confirm</a>
        <a href={event.directionsUrl} target="_blank" rel="noreferrer"><MapPin weight="fill" /> Directions</a>
      </nav>
    </main>
  );
}
