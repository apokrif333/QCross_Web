import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function PersonIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="24" cy="14" r="7" {...base}/><path d="M10.5 39v-5.2c0-7.3 6-11.8 13.5-11.8s13.5 4.5 13.5 11.8V39z" {...base}/></svg>;
}

export function BankIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="m7 17 17-10 17 10H7Zm3 4h28M8 39h32M12 21v14m8-14v14m8-14v14m8-14v14" {...base}/></svg>;
}

export function DocumentIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M13 5h16l8 8v30H13zM29 5v9h8M19 23h12M19 29h12M19 35h8" {...base}/></svg>;
}

export function ChartIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M10 40V30m9 10V22m9 18V14m9 26V7" {...base}/></svg>;
}

export function ShieldIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M24 5c5 4 10 5 16 5v11c0 11-6.6 18-16 22-9.4-4-16-11-16-22V10c6 0 11-1 16-5Z" {...base}/></svg>;
}

export function CalendarIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><rect x="8" y="11" width="32" height="30" rx="2" {...base}/><path d="M15 6v10M33 6v10M8 20h32" {...base}/></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg viewBox="0 0 62 20" aria-hidden="true" {...props}><path d="M1 10h57M50 2l8 8-8 8" {...base}/></svg>;
}
