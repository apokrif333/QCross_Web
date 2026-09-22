import type { ReactNode } from "react";

export function SectionContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`section-container ${className}`.trim()}>{children}</div>;
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function SectionHeading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`section-heading ${className}`.trim()}>{children}</h2>;
}

export function MountainFade() {
  return <div className="mountain-fade" aria-hidden="true" />;
}

export function EditorialLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="editorial-link" href={href}>
      <span>{children}</span><span aria-hidden="true">→</span>
    </a>
  );
}
