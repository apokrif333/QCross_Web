import { EditorialLink, MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";
import { MonteCarloCalculator } from "@/components/clients/MonteCarloCalculator";

export function RiskReturnSection() {
  return (
    <section className="light-section risk-section" id="risk-return">
      <SectionContainer className="light-section__content">
        <header className="section-intro compact">
          <SectionEyebrow>Доходность и риск</SectionEyebrow>
          <SectionHeading>Доходность и риск всегда связаны.</SectionHeading>
          <p>Чем выше доходность, тем шире разброс конечного результата и глубже просадки.<br />Вы выбираете комфортный уровень риска — QCM формирует инвестиционный портфель, соответствующий вашим целям.</p>
        </header>
        <div className="risk-layout">
          <MonteCarloCalculator />
          <aside className="risk-statement">
            <h3>Доходность<br />можно пожелать.<br />Риск приходится<br />принять.</h3>
            <i />
            <p>QCM начинает построение портфеля не с вопроса «сколько вы хотите заработать?», а с вопроса «какую просадку вы способны выдержать?».</p>
          </aside>
        </div>
        <EditorialLink href="#management">Как устроено управление</EditorialLink>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
