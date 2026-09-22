import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

function ArrowIcon() {
  return (
    <svg className="hero-button__icon" viewBox="0 0 22 14" aria-hidden="true">
      <path d="M1 7h19M14 1l6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="home-hero">
      <Image
        className="home-hero__image"
        src="/images/winter-scenery.jpg"
        alt="Зимний горный пейзаж"
        fill
        priority
        sizes="100vw"
      />
      <BrandMark />
      <div className="home-hero__content">
        <div className="home-hero__inner">
          <h1 className="home-hero__title">
            <span>Инвестиции — это</span>
            <em>спокойствие.</em>
          </h1>
          <p className="home-hero__subtitle">
            Профессиональное управление капиталом,<br />
            инвестиционной структурой и финансовыми потоками.
          </p>
          <div className="home-hero__actions">
            <Link className="hero-button hero-button--primary" href="/clients">
              <span>Клиентам</span>
              <ArrowIcon />
            </Link>
            {/* TODO: Replace placeholder once Partner Portal is implemented. */}
            <a className="hero-button" href="#">
              <span>Партнёрам</span>
              <ArrowIcon />
            </a>
          </div>
        </div>
      </div>
      <p className="home-hero__principle">Больше<br />чем доходность</p>
      <p className="home-hero__values">Анализ рисков<br />Планирование<br />Дисциплина<br />Достижение цели</p>
    </main>
  );
}
