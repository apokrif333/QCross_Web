import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMapAnalytics } from "@/components/world-map/WorldMapAnalytics";
import { WorldMapCities } from "@/components/world-map/WorldMapCities";

export const metadata: Metadata = {
  title: "Мировая карта недвижимости | Quantum Cross Management",
  description: "Сравнение стоимости жилья, аренды и валовой арендной доходности по странам, городам и районам.",
};

export default function WorldMapPage() {
  return (
    <main className="world-map-page">
      <section className="world-map-hero">
        <Image
          className="world-map-hero__landscape"
          src="/images/winter-scenery.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <Image
          className="world-map-hero__map"
          src="/images/world-map-lights.png"
          alt=""
          width={1672}
          height={941}
          priority
          sizes="(max-width: 767px) 180vw, 1040px"
        />
        <SiteHeader activePath="/insights/world-map" />

        <div className="world-map-hero__content" id="world-map-content">
          <p className="eyebrow world-map-hero__eyebrow">Недвижимость · Аналитика</p>
          <h1>Мировая карта<br />недвижимости</h1>
          <p className="world-map-hero__lead">
            Сравнивайте стоимость жилья, аренду и валовую арендную<br />{" "}
            доходность по странам, городам и районам.
          </p>
          <p className="world-map-hero__support">
            Данные для оценки инвестиционной привлекательности<br />{" "}
            недвижимости и выбора рынка.
          </p>
          <a className="world-map-hero__explore" href="#property-data">
            Исследовать данные <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <WorldMapAnalytics />
      <WorldMapCities />
    </main>
  );
}
