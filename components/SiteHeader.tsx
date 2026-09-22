import Link from "next/link";

const navItems = [
  ["О компании", "#"],
  ["Решения для клиентов", "/clients"],
  ["Партнёрам", "#"],
  ["Наш подход", "#management"],
  ["Инсайты", "#"],
  ["Контакты", "#contact"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-wordmark" href="/" aria-label="Quantum Cross Management — главная">
        <span>Quantum Cross</span>
        <small>Management</small>
      </Link>
      <nav className="site-nav" aria-label="Основная навигация">
        {navItems.map(([label, href]) => (
          href.startsWith("/") ? <Link className={href === "/clients" ? "is-active" : ""} key={label} href={href}>{label}</Link> : <a key={label} href={href}>{label}</a>
        ))}
      </nav>
      <div className="site-meta"><span>BVI FSC</span><span>Since 2020</span></div>
      <a className="mobile-nav-label" href="#capital">Меню</a>
    </header>
  );
}
