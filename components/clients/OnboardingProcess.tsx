import { ArrowIcon, BankIcon, ChartIcon, DocumentIcon, PersonIcon, ShieldIcon } from "@/components/QcmIcons";
import { EditorialLink, MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";

const steps = [
  { number: "01", title: "Знакомство", copy: "Определяем цели, структуру капитала, инвестиционный горизонт и ключевые ограничения.", Icon: PersonIcon },
  { number: "02", title: "Анализ", copy: "Оцениваем допустимый риск и подбираем инвестиционный подход, соответствующий вашим задачам.", Icon: DocumentIcon },
  { number: "03", title: <>Брокерский счёт<br />и полномочия</>, copy: "Клиент использует собственный брокерский счёт и предоставляет QCM торговые полномочия для управления портфелем.", Icon: BankIcon },
  { number: "04", title: "Управление", copy: "QCM формирует структуру портфеля, осуществляет операции и поддерживает его в рамках согласованной стратегии.", Icon: ChartIcon },
  { number: "05", title: <>Мониторинг<br />и отчётность</>, copy: "Портфель регулярно контролируется, сопровождается аналитикой и понятной отчётностью для клиента.", Icon: ShieldIcon },
] as const;

export function OnboardingProcess() {
  return (
    <section className="light-section onboarding-section" id="onboarding">
      <SectionContainer className="light-section__content">
        <header className="section-intro compact">
          <SectionEyebrow>Как начинается работа</SectionEyebrow>
          <SectionHeading>Начало работы с QCM</SectionHeading>
          <p>Пять последовательных шагов — от первичного знакомства<br />до регулярного сопровождения и отчётности.</p>
        </header>
        <div className="onboarding-flow">
          {steps.map(({ number, title, copy, Icon }, index) => (
            <div className="onboarding-fragment" key={number}>
              <article className="onboarding-step">
                <span className="item-number">{number}<i /></span>
                <div className="icon-medallion"><Icon /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
              {index < steps.length - 1 && <ArrowIcon className="flow-arrow" />}
            </div>
          ))}
        </div>
        <div className="closing-statement">QCM строит долгосрочную работу вокруг<br />дисциплины, прозрачности и контроля риска.</div>
        {/* TODO: Connect this CTA to the future contact workflow. */}
        <EditorialLink href="#">Связаться с QCM</EditorialLink>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
