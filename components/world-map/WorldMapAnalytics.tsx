import { ChartIcon } from "@/components/QcmIcons";

const yieldLevels = [
  { range: "< 4%", label: "Низкая", className: "world-map-analytics__level--low" },
  { range: "4 – 7%", label: "Умеренная", className: "world-map-analytics__level--moderate" },
  { range: "7 – 10%", label: "Высокая", className: "world-map-analytics__level--high" },
  { range: "> 10%", label: "Требует дополнительной проверки", className: "world-map-analytics__level--highest" },
] as const;

export function WorldMapAnalytics() {
  return (
    <section className="world-map-analytics" id="property-data" aria-labelledby="property-data-heading">
      <header className="world-map-analytics__intro">
        <p className="world-map-analytics__eyebrow">Глобальная аналитика</p>
        <h2 id="property-data-heading">Где недвижимость приносит больше?</h2>
        <p>
          Сравнение валовой арендной доходности по странам позволяет быстро оценить<br className="world-map-analytics__desktop-break" />{" "}
          относительную стоимость рынков и потенциальный денежный поток.
        </p>
      </header>

      <div className="world-map-analytics__layout">
        <aside className="world-map-analytics__guide" aria-labelledby="rental-yield-heading">
          <div className="world-map-analytics__guide-heading">
            <span className="world-map-analytics__icon" aria-hidden="true"><ChartIcon /></span>
            <h3 id="rental-yield-heading">Rental Yield</h3>
          </div>

          <p>Валовая арендная доходность — это отношение годовой арендной платы к стоимости недвижимости.</p>
          <p>Показатель не учитывает налоги, расходы на содержание, простой и транзакционные издержки.</p>

          <div className="world-map-analytics__legend">
            <h4>Ориентировочные уровни доходности</h4>
            <ul>
              {yieldLevels.map(({ range, label, className }) => (
                <li key={range} className={className}>
                  <span className="world-map-analytics__swatch" aria-hidden="true" />
                  <strong>{range}</strong>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="world-map-analytics__note">
            <span className="world-map-analytics__info-icon" aria-hidden="true">i</span>
            <span>Доходность — лишь один из факторов инвестиционного решения. Высокая доходность может сопровождаться повышенными рисками.</span>
          </p>
        </aside>

        <div className="world-map-analytics__map-slot" id="property-map">
          <iframe
            className="world-map-embed"
            src="/maps/countries_rental_yield.html"
            title="Арендная доходность по странам"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
