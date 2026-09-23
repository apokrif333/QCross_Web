import Image from "next/image";
import { ChartIcon, DocumentIcon, GlobeIcon, HouseIcon } from "@/components/QcmIcons";
import { SiteHeader } from "@/components/SiteHeader";

const partnerSolutions = [
  {
    number: "01",
    title: <>Инвестиционные<br />портфели</>,
    copy: <>Формирование и управление<br />портфелями под цели<br />и допустимый риск клиента.</>,
    Icon: ChartIcon,
  },
  {
    number: "02",
    title: <>Финансовое<br />планирование</>,
    copy: <>Долгосрочная структура<br />капитала, денежных потоков<br />и финансовых целей.</>,
    Icon: DocumentIcon,
  },
  {
    number: "03",
    title: <>Международное<br />налоговое планирование</>,
    copy: <>Анализ структуры активов,<br />доходов и налоговых<br />последствий.</>,
    Icon: GlobeIcon,
  },
  {
    number: "04",
    title: <>Международная<br />недвижимость и резидентство</>,
    copy: <>Подбор решений с учётом<br />финансовых, налоговых<br />и семейных целей.</>,
    Icon: HouseIcon,
  },
] as const;

export function PartnerHero() {
  return (
    <section className="partner-hero">
      <Image
        className="partner-hero__image"
        src="/images/winter-scenery.jpg"
        alt="Зимний горный пейзаж"
        fill
        priority
        sizes="100vw"
      />
      <SiteHeader activePath="/partners" />
      <div className="partner-hero__content">
        <p className="eyebrow partner-hero__eyebrow">Партнёрство с QCM</p>
        <h1 className="partner-hero__title">
          Расширьте возможности,<br />
          которые вы предлагаете<br />
          <em>своим клиентам.</em>
        </h1>
        <p className="partner-hero__subtitle">
          QCM позволяет партнёрам дополнять собственную экспертизу<br />
          профессиональными инвестиционными, налоговыми<br />
          и финансовыми решениями.
        </p>

        <div className="partner-benefits__heading">Что получает партнёр</div>
        <div className="partner-solutions">
          {partnerSolutions.map(({ number, title, copy, Icon }) => (
            <article className="partner-solution" key={number}>
              <Icon />
              <h2>{number} — {title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>

        <div className="partner-closing">
          <p>
            <span>Вы сохраняете отношения с клиентом.</span>
            <em>QCM предоставляет экспертизу и инфраструктуру для решения его задач.</em>
          </p>
        </div>
      </div>
      <a className="partner-hero__transition" href="#long-term" aria-label="Долгосрочное сотрудничество">
        <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
