import Image from "next/image";
import { CalendarIcon, ChartIcon, CoinsIcon, PeopleIcon } from "@/components/QcmIcons";
import { SiteHeader } from "@/components/SiteHeader";

const companyFacts = [
  {
    title: "Since 2020",
    copy: <>История компании</>,
    Icon: CalendarIcon,
  },
  {
    title: "15+ лет",
    copy: <>опыта основателя<br />на финансовых рынках</>,
    Icon: ChartIcon,
  },
  {
    title: "≈200 клиентов",
    copy: <>в сопровождении QCM</>,
    Icon: PeopleIcon,
  },
  {
    title: "≈$20 млн",
    copy: <>совокупного клиентского<br />капитала</>,
    Icon: CoinsIcon,
  },
] as const;

export function AboutHero() {
  return (
    <section className="about-hero">
      <Image
        className="about-hero__image"
        src="/images/winter-scenery.jpg"
        alt="Зимний горный пейзаж"
        fill
        priority
        sizes="100vw"
      />
      <SiteHeader activePath="/about" />

      <div className="about-hero__content">
        <p className="eyebrow about-hero__eyebrow">О компании</p>
        <h1 className="about-hero__title">
          QCM выросла из частного управления<br />{" "}
          капиталом в международный сервис<br />{" "}
          для состоятельных клиентов.
        </h1>
        <p className="about-hero__lead">
          Quantum Cross Management основана в 2020 году Алексеем Ашихминым.<br />{" "}
          Сегодня QCM объединяет специалистов по инвестициям, налогам и юридическим<br />{" "}
          вопросам — каждый отвечает за свою область компетенции.
        </p>

        <div className="about-facts">
          {companyFacts.map(({ title, copy, Icon }) => (
            <article className="about-fact" key={title}>
              <Icon />
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
        <p className="about-facts__note">Данные на сентябрь 2026 года.</p>

        <div className="about-founder" id="founder">
          <div className="about-founder__portrait">
            <Image
              className="about-founder__portrait-image"
              src="/images/aleksei-founder-new.png"
              alt="Алексей Ашихмин"
              fill
              sizes="490px"
            />
            <p>Дисциплина<br />создаёт<br />свободу</p>
          </div>
          <article className="about-founder__copy">
            <h2>Алексей Ашихмин</h2>
            <p className="about-founder__role">Founder &amp; Chief Investment Officer</p>
            <i aria-hidden="true" />
            <p className="about-founder__bio">
              Более 15 лет на финансовых рынках: от классических акций и облигаций<br />{" "}
              до деривативов и структурных решений. QCM была создана как развитие<br />{" "}
              практики частного управления капиталом в международный инвестиционный<br />{" "}
              сервис.
            </p>
            <p className="about-founder__secondary">
              BVI investment manager · Операционная команда в Алматы · Основная география —<br />{" "}
              Казахстан, страны СНГ и международные клиентские кейсы.
            </p>
            <i aria-hidden="true" />
            <p className="about-founder__infrastructure">
              Брокерская инфраструктура: Interactive Brokers · EXANTE · ChoiceTrade · TradeStation · Freedom · Wolfline Capital · ROQ Capital
            </p>
          </article>
        </div>
      </div>

      <a className="about-hero__transition" href="#approach">
        <span>Наш подход</span>
        <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
