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

export function GlobeIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="24" cy="24" r="18" {...base}/><path d="M6 24h36M24 6c5 4.8 8 10.8 8 18s-3 13.2-8 18c-5-4.8-8-10.8-8-18s3-13.2 8-18Z" {...base}/></svg>;
}

export function HouseIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M6 22 24 7l18 15M10 19v24h28V19M19 43V29h10v14" {...base}/></svg>;
}

export function ReferralIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="17" cy="17" r="7" {...base}/><circle cx="31" cy="22" r="8" {...base}/><path d="M5 39v-4c0-7 5.2-11 12-11 3.1 0 5.8.8 7.8 2.3M18 43v-4.5C18 31 23.2 27 31 27s12.5 4 12.5 11.5V43Z" {...base}/></svg>;
}

export function ClientCareIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="18" cy="15" r="7" {...base}/><path d="M5 36v-3.5C5 25.8 10.1 22 18 22c4.2 0 7.7 1.1 10 3.2M34 24c3.1 2.3 6 3.2 9 3.2v6.2c0 5.5-3.3 9-9 11.6-5.7-2.6-9-6.1-9-11.6v-6.2c3 0 5.9-.9 9-3.2Z" {...base}/><path d="M34 30v9M30.5 34.5h7" {...base}/></svg>;
}

export function GrowthIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M7 41h35M11 41v-9h7v9M23 41V25h7v16M35 41V17h7v24M9 25c7.8-1 14.2-4.7 19-10.2L34 8" {...base}/><path d="M27 8h7v7" {...base}/></svg>;
}

export function PeopleIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="19" cy="15" r="6.5" {...base}/><circle cx="31.5" cy="18" r="5.5" {...base}/><path d="M6 39v-4c0-7.1 5.1-11.5 13-11.5S32 27.9 32 35v4H6Zm25.5-13.5c6.5.4 10.5 4 10.5 9.8V39H32" {...base}/></svg>;
}

export function CoinsIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><ellipse cx="24" cy="10" rx="13" ry="5" {...base}/><path d="M11 10v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 18v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 26v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8" {...base}/></svg>;
}

export function TargetIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="22" cy="27" r="16" {...base}/><circle cx="22" cy="27" r="9" {...base}/><circle cx="22" cy="27" r="2.5" {...base}/><path d="m23.5 25.5 15-15M32 10.5h6v6M37.5 10.5l-5-5" {...base}/></svg>;
}

export function PuzzleIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><path d="M8 8h12v7a5 5 0 1 0 10 0V8h10v12h-6a5 5 0 1 0 0 10h6v10H28v-6a5 5 0 1 0-10 0v6H8V28h6a5 5 0 1 0 0-10H8Z" {...base}/></svg>;
}

export function NetworkIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" {...props}><circle cx="24" cy="24" r="8" {...base}/><circle cx="24" cy="6" r="4" {...base}/><circle cx="42" cy="22" r="4" {...base}/><circle cx="34" cy="40" r="4" {...base}/><circle cx="8" cy="34" r="4" {...base}/><circle cx="7" cy="16" r="4" {...base}/><path d="m24 10v6m8 4 6-1m-9 12 3 5M17 29l-6 3m6-12-6-2" {...base}/></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg viewBox="0 0 62 20" aria-hidden="true" {...props}><path d="M1 10h57M50 2l8 8-8 8" {...base}/></svg>;
}
