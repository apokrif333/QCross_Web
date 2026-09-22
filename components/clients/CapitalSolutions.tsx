import Image from "next/image";
import { EditorialLink, MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";

const solutions = [
  { number: "01", title: <>Долгосрочное<br />финансовое планирование</>, copy: "Семейное финансовое планирование с учётом активов, доходов и расходов для создания устойчивого долгосрочного денежного потока.", image: "/images/qcm-capital-1.jpg", position: "50% 50%" },
  { number: "02", title: <>Инвестиционные<br />портфели</>, copy: "Формирование и управление портфелями для достижения необходимого соотношения доходности и риска.", image: "/images/qcm-capital-2.jpg", position: "50% 50%" },
  { number: "03", title: <>Международное<br />налоговое планирование</>, copy: "Анализ международных доходов и налоговых последствий, включая подачу налоговой отчётности.", image: "/images/qcm-capital-3.jpg", position: "50% 50%" },
  { number: "04", title: <>Зарубежная недвижимость<br />и ВНЖ</>, copy: "Подбор зарубежной недвижимости и инвестиционных программ ВНЖ с учётом целей клиента, налогов и структуры капитала.", image: "/images/qcm-capital-4-updated.jpg", position: "50% 50%" },
] as const;

export function CapitalSolutions() {
  return (
    <section className="light-section capital-section" id="capital">
      <SectionContainer className="light-section__content">
        <header className="section-intro">
          <SectionEyebrow>Что мы решаем</SectionEyebrow>
          <SectionHeading>Решения для капитала</SectionHeading>
          <p>Ключевые направления работы QCM для частных и корпоративных клиентов.</p>
        </header>
        <div className="solutions-grid">
          {solutions.map((item) => (
            <article className="solution-item" key={item.number}>
              <div className="solution-photo">
                <Image src={item.image} alt="" fill sizes="(max-width: 767px) 100vw, 300px" style={{ objectPosition: item.position }} />
              </div>
              <div className="solution-copy">
                <span className="item-number">{item.number}<i /></span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
        <EditorialLink href="#risk-return">Доходность и риск</EditorialLink>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
