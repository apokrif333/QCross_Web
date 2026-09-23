import { ArrowIcon, ClientCareIcon, DocumentIcon, GrowthIcon, ReferralIcon } from "@/components/QcmIcons";
import { MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";

const partnershipFlow = [
  {
    title: "Вы знакомите клиента",
    copy: <>Передаёте запрос и сохраняете<br />отношения с клиентом.</>,
    Icon: ReferralIcon,
  },
  {
    title: "QCM решает задачу",
    copy: <>Инвестиционные, налоговые<br />и финансовые решения под<br />потребности клиента.</>,
    Icon: DocumentIcon,
  },
  {
    title: <>Клиент получает<br />сопровождение</>,
    copy: <>QCM ведёт реализацию<br />и поддерживает клиента<br />по согласованной модели.</>,
    Icon: ClientCareIcon,
  },
  {
    title: <>Партнёр получает<br />вознаграждение</>,
    copy: <>Регулярное вознаграждение<br />от дохода QCM по привлечённым<br />клиентам — до 50% в соответствии<br />с договором.</>,
    Icon: GrowthIcon,
  },
] as const;

const partnershipTerms = [
  {
    number: "01",
    title: "Условия закреплены договором",
    copy: <>С каждым партнёром заключается<br />индивидуальное соглашение, определяющее<br />модель взаимодействия и вознаграждения.</>,
  },
  {
    number: "02",
    title: "Прозрачная экономика",
    copy: <>Партнёр получает регулярное<br />вознаграждение от дохода QCM<br />по привлечённым клиентам<br />в соответствии с условиями договора.</>,
  },
  {
    number: "03",
    title: "Поддержка и обучение",
    copy: <>Подробное раскрытие продуктов QCM,<br />помощь в разборе индивидуальных<br />клиентских кейсов и обучение основам<br />финансового планирования.</>,
  },
] as const;

export function PartnerLongTerm() {
  return (
    <section className="light-section partner-long-term" id="long-term">
      <SectionContainer className="light-section__content partner-long-term__content">
        <header className="section-intro partner-long-term__intro">
          <SectionEyebrow>Долгосрочное сотрудничество</SectionEyebrow>
          <SectionHeading>
            Партнёрство, которое продолжает приносить доход<br />
            вместе с клиентскими отношениями
          </SectionHeading>
          <p>
            QCM выстраивает долгосрочные партнёрские отношения: вы сохраняете доверие клиента,<br />
            а QCM предоставляет решения, сопровождение и инфраструктуру.
          </p>
        </header>

        <div className="partner-flow">
          {partnershipFlow.map(({ title, copy, Icon }, index) => (
            <div className="partner-flow__fragment" key={index}>
              <article className="partner-flow__step">
                <div className="icon-medallion"><Icon /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
              {index < partnershipFlow.length - 1 && <ArrowIcon className="partner-flow__arrow" />}
            </div>
          ))}
        </div>

        <div className="partner-terms">
          {partnershipTerms.map(({ number, title, copy }) => (
            <article className="partner-term" key={number}>
              <div className="partner-term__heading">
                <span>{number}</span><i />
                <h3>{title}</h3>
              </div>
              <p>{copy}</p>
            </article>
          ))}
        </div>

        <a className="partner-cta" href="#">
          <span>Стать партнёром QCM</span>
          <span aria-hidden="true">→</span>
        </a>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
