const iconStyle = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function AboutTargetIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...iconStyle}>
      <path d="M36.745 17.676a18 18 0 1 1-4.421-4.421M31.011 21.691a11 11 0 1 1-2.702-2.702" />
      <circle cx="22" cy="28" r="3.5" />
      <path d="M22 28 40 10" />
      <path d="M34 16v-6l6-6v6h6l-6 6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AboutGlobeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...iconStyle}>
      <circle cx="24" cy="24" r="20" />
      <ellipse cx="24" cy="24" rx="8.5" ry="20" />
      <path d="M24 4v40M4 24h40M7 13c10 4 24 4 34 0M7 35c10-4 24-4 34 0" />
    </svg>
  );
}

export function AboutBriefcaseIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...iconStyle}>
      <rect x="4" y="14" width="40" height="29" rx="3" />
      <path d="M16 14V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M4 22a3 3 0 0 0 3 3h14m6 0h14a3 3 0 0 0 3-3" />
      <rect x="21" y="23" width="6" height="6" rx="0.5" />
    </svg>
  );
}
