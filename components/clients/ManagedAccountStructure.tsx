import { ArrowIcon, BankIcon, ChartIcon, DocumentIcon, PersonIcon, ShieldIcon } from "@/components/QcmIcons";
import { EditorialLink, MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";

const flow = [
  { title: <>Клиент</>, copy: "Составляется инвестиционный портфель в соответствии с разработанным для вас финансовым планом", Icon: PersonIcon },
  { title: <>Собственный<br />брокерский счёт</>, copy: "Вы пополняете ваш личный брокерский счёт", Icon: BankIcon },
  { title: <>Торговые<br />полномочия QCM</>, copy: "Вы предоставляете QCM ограниченные торговые полномочия для управления портфелем.", Icon: DocumentIcon },
  { title: <>Управление<br />портфелем</>, copy: "QCM размещает средства и управляет ими в соответствии с ранее разработанным финансовым планом", Icon: ChartIcon },
  { title: <>Активы остаются<br />на счёте клиента</>, copy: "Денежные средства и ценные бумаги всегда находятся на вашем личном, застрахованном брокерском счёте.", Icon: ShieldIcon },
] as const;

const principles = [
  { number: "01", title: "Вы владеете активами", copy: "Денежные средства и ценные бумаги находятся на брокерском счёте клиента." },
  { number: "02", title: "QCM принимает инвестиционные решения", copy: "Компания осуществляет торговые операции в рамках предоставленных полномочий." },
  { number: "03", title: "Владение отделено от управления", copy: "Управляющий принимает инвестиционные решения, но не становится владельцем клиентских активов." },
] as const;

export function ManagedAccountStructure() {
  return (
    <section className="light-section management-section" id="management">
      <SectionContainer className="light-section__content">
        <header className="section-intro compact">
          <SectionEyebrow>Как это работает</SectionEyebrow>
          <SectionHeading>Как устроено управление</SectionHeading>
          <p>QCM управляет инвестиционными решениями,<br />в то время как активы остаются на вашем собственном брокерском счёте.</p>
        </header>
        <div className="management-flow">
          {flow.map(({ title, copy, Icon }, index) => (
            <div className="flow-fragment" key={copy}>
              <article className="flow-step">
                <div className="icon-medallion"><Icon /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
              {index < flow.length - 1 && <ArrowIcon className="flow-arrow" />}
            </div>
          ))}
        </div>
        <div className="principles-grid">
          {principles.map((item) => (
            <article className="principle" key={item.number}>
              <span className="item-number">{item.number}<i /></span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
        {/* TODO: Connect this CTA to the future contact workflow. */}
        <EditorialLink href="#">Связаться с QCM</EditorialLink>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
