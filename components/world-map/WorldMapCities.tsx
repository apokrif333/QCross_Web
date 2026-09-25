"use client";

import { useRef } from "react";

export function WorldMapCities() {
  const mapSlotRef = useRef<HTMLDivElement>(null);

  async function openFullscreen() {
    if (mapSlotRef.current && document.fullscreenElement !== mapSlotRef.current) {
      await mapSlotRef.current.requestFullscreen();
    }
  }

  return (
    <section className="world-map-cities" id="city-yields" aria-labelledby="city-yields-heading">
      <header className="world-map-cities__intro">
        <p className="world-map-cities__eyebrow">Города и районы</p>
        <h2 id="city-yields-heading">Арендная доходность по городам и районам</h2>
        <p className="world-map-cities__lead">
          На карте отображается медианная доходность аренды по городам. Выберите точку, чтобы увидеть<br className="world-map-cities__desktop-break" />{" "}
          цены, аренду и доходность по районам внутри выбранного рынка.
        </p>
        <p className="world-map-cities__support">
          Если карта кажется перегруженной, вы можете отфильтровать диапазоны доходности<br className="world-map-cities__desktop-break" />{" "}
          и оставить только интересующие вас значения.
        </p>
        <button className="world-map-cities__fullscreen" type="button" onClick={openFullscreen}>
          Открыть карту во весь экран <span aria-hidden="true">⟶</span>
        </button>
      </header>

      <div
        className="world-map-cities__map-slot"
        id="city-yield-map"
        ref={mapSlotRef}
      >
        <iframe
          className="world-map-embed"
          src="/api/world-map/cities"
          title="Арендная доходность по городам и районам"
          loading="lazy"
        />
      </div>
    </section>
  );
}
