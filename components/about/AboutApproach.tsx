import Image from "next/image";
import targetIcon from "@/drafts/arrow.png";
import chartIcon from "@/drafts/bar chart.png";
import puzzleIcon from "@/drafts/pazzle.png";
import networkIcon from "@/drafts/vibes.png";
import { MountainFade, SectionContainer, SectionEyebrow, SectionHeading } from "@/components/SectionPrimitives";

const approachItems = [
  {
    title: "Финансовый план раньше портфеля",
    copy: <>Инвестиционная стратегия строится вокруг<br />целей клиента, горизонта инвестирования<br />и необходимых денежных потоков.</>,
    icon: targetIcon,
    iconClassName: "about-approach__icon--target",
  },
  {
    title: "Простота там, где она эффективнее",
    copy: <>В большинстве случаев основой становятся<br />глобально диверсифицированные портфели<br />с низкими издержками и учётом налоговой<br />эффективности.</>,
    icon: chartIcon,
    iconClassName: "about-approach__icon--chart",
  },
  {
    title: "Сложность только там, где она оправдана",
    copy: <>Если задача клиента этого требует, QCM использует<br />более специализированные решения — от внебиржевых<br />облигаций до структурных и деривативных<br />инструментов.</>,
    icon: puzzleIcon,
    iconClassName: "about-approach__icon--puzzle",
  },
  {
    title: "Финансы рассматриваются как единая система",
    copy: <>Инвестиции, налоги, резидентство, недвижимость<br />и движение денежных средств анализируются<br />совместно, когда это необходимо для достижения<br />цели клиента.</>,
    icon: networkIcon,
    iconClassName: "about-approach__icon--network",
  },
] as const;

export function AboutApproach() {
  return (
    <section className="light-section about-approach" id="approach">
      <SectionContainer className="light-section__content about-approach__content">
        <header className="section-intro about-approach__intro">
          <SectionEyebrow>Наш подход</SectionEyebrow>
          <SectionHeading>
            Сначала задача клиента. Потом —<br />
            инвестиционный инструмент.
          </SectionHeading>
          <p>
            Мы начинаем не с выбора фонда, акции или структурного продукта. Сначала анализируем<br />
            капитал, денежные потоки, налоги, резидентство, риски и финансовые цели клиента.
          </p>
        </header>

        <div className="about-approach__grid">
          {approachItems.map(({ title, copy, icon, iconClassName }) => (
            <article className="about-approach__item" key={title}>
              <div className="icon-medallion">
                <Image
                  className={`about-approach__icon ${iconClassName}`}
                  src={icon}
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="about-approach__closing">
          Хороший портфель — лишь часть<br />
          хорошего финансового решения.
        </p>
      </SectionContainer>
      <MountainFade />
    </section>
  );
}
