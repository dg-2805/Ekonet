"use client";

import { useEffect, useState } from "react";

type PreloaderProps = {
  name?: string;
  minDurationMs?: number;
  /** If true, always show the loader once on mount, ignoring sessionStorage. */
  force?: boolean;
};

/**
 * Fullscreen preloader that shows the project name while a green "grass" animation
 * grows and wraps around the text, then fades into the app.
 * Uses sessionStorage to show only on the first page load per tab.
 */
export default function Preloader({ name = "wild", minDurationMs = 2400, force = false }: PreloaderProps) {
  // Start visible to avoid content flash on first load; we'll immediately hide if not needed.
  const [visible, setVisible] = useState<boolean>(true);
  const [fade, setFade] = useState<boolean>(false);

  useEffect(() => {
    // Respect reduced motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Only show once per tab session
  const alreadyShown = !force && typeof window !== "undefined" && sessionStorage.getItem("preloader-done") === "1";

  if (alreadyShown || prefersReduced) {
      // Skip animation
      setVisible(false);
      return;
    }

    setVisible(true);

    const t1 = window.setTimeout(() => setFade(true), Math.max(400, minDurationMs - 400));
    const t2 = window.setTimeout(() => {
      setVisible(false);
      try { if (!force) sessionStorage.setItem("preloader-done", "1"); } catch {}
    }, minDurationMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [minDurationMs, force]);

  if (!visible) return null;

  return (
    <div
      className={
        "fixed inset-0 z-[9999] bg-[#0b0f0a] text-white overflow-hidden flex items-center justify-center transition-opacity duration-500 " +
        (fade ? "opacity-0 pointer-events-none" : "opacity-100")
      }
      aria-hidden
    >
      <AnimatedGrassTitle name={name} />
    </div>
  );
}

function AnimatedGrassTitle({ name }: { name: string }) {
  // Responsive SVG that draws the title and grass layers
  // ViewBox is landscape; we scale text based on viewport using SVG.
  return (
    <>
      <svg
      role="img"
      aria-label={`${name} loading`}
      viewBox="0 0 1200 800"
      className="w-[min(90vw,1100px)] h-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Title text for reuse */}
        <symbol id="titleSymbol" viewBox="0 0 1200 800">
          <text
            x="600"
            y="430"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-geist-sans, ui-sans-serif), system-ui, Arial, sans-serif"
            fontWeight={800}
            fontSize="220"
            letterSpacing="6"
          >
            {name.toUpperCase()}
          </text>
        </symbol>

        {/* A small repeating grass tile pattern */}
        <pattern id="grassPattern" patternUnits="userSpaceOnUse" width="64" height="160">
          <rect width="64" height="160" fill="#147a28" />
          {/* blades */}
          <path d="M8,160 C14,120 6,80 12,40 L14,40 L12,160Z" fill="#1ea038" />
          <path d="M24,160 C30,126 28,94 34,60 L36,60 L34,160Z" fill="#1d8d33" />
          <path d="M48,160 C54,118 46,84 52,44 L54,44 L52,160Z" fill="#23b040" />
          {/* small accents */}
          <path d="M16,160 C20,146 18,132 22,118 L24,118 L22,160Z" fill="#2cc94d" opacity=".8" />
          <path d="M40,160 C44,148 42,132 46,116 L48,116 L46,160Z" fill="#28bb46" opacity=".85" />
        </pattern>

        {/* mask so grass shows only inside the text for the front layer */}
        <mask id="textMask">
          <rect width="1200" height="800" fill="black" />
          <use href="#titleSymbol" fill="white" />
        </mask>
      </defs>

      {/* Background subtle gradient */}
      <rect width="1200" height="800" fill="url(#bgGrad)" opacity="0.0" />
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0f0a" />
          <stop offset="100%" stopColor="#0f130e" />
        </linearGradient>
      </defs>

      {/* Title base (stroke) */}
      <use href="#titleSymbol" fill="none" stroke="#e8fde9" strokeWidth="6" strokeLinejoin="round" />

      {/* Back grass rising behind the title */}
  <g className="grass-rise-back">
        <rect x="-20" y="300" width="1240" height="400" fill="url(#grassPattern)" />
        {/* an uneven top edge */}
        <path d="M-20,300 C100,280 240,320 360,300 C520,270 700,330 860,300 C980,280 1120,330 1220,300 L1220,700 L-20,700Z" fill="#1ea038" />
      </g>

      {/* Front grass rising inside the letters (masked to text) */}
  <g mask="url(#textMask)" className="grass-rise-front">
        <rect x="-20" y="320" width="1240" height="420" fill="url(#grassPattern)" />
        <path d="M-20,320 C120,300 280,340 420,320 C600,288 760,352 940,320 C1060,300 1160,350 1220,320 L1220,760 L-20,760Z" fill="#22b245" />
      </g>

      {/* Title fill that fades to green as grass reaches it */}
      <use href="#titleSymbol" fill="#e8fde9" className="title-fill-fade" />
    </svg>
    <style jsx>{`
      .grass-rise-back, .grass-rise-front {
        transform-box: fill-box;
        transform-origin: 50% 100%;
        transform: translateY(180px);
        animation: rise 1600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        will-change: transform;
      }
      .grass-rise-front {
        animation-delay: 180ms;
      }
      .title-fill-fade {
        opacity: 0;
        animation: titleIn 1200ms ease-out 260ms forwards;
      }
      @keyframes rise {
        to { transform: translateY(0); }
      }
      @keyframes titleIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
    `}</style>
    </>
  );
}
