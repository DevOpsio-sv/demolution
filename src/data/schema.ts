import { areas, business } from "./business";
import { services } from "./services";

export function schemaGraph(site: string) {
  const origin = site.replace(/\/$/, "");
  const page = `${origin}/`;
  const organization = `${origin}/#organization`;
  const areaServed = [
    { "@type": "AdministrativeArea", name: "София" },
    { "@type": "AdministrativeArea", name: "Софийска област" },
    { "@type": "AdministrativeArea", name: "Област Ловеч" },
    { "@type": "AdministrativeArea", name: "Област Плевен" },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name: business.provisionalName,
        url: page,
        telephone: business.phoneE164,
        logo: `${origin}/razlom-logo.png`,
        description:
          "Събаряне на стари постройки и демонтаж на покриви, стени и конструкции в София, Ловеч, Плевен и околните населени места.",
        areaServed,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: business.phoneE164,
          contactType: "customer service",
          availableLanguage: ["bg"],
          areaServed: "BG",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: page,
        name: business.provisionalName,
        inLanguage: "bg",
        publisher: { "@id": organization },
      },
      {
        "@type": "WebPage",
        "@id": `${origin}/#webpage`,
        url: page,
        name: "Събаряне на постройки и демонтаж | София, Ловеч, Плевен",
        description:
          "Събаряне на стари и стопански постройки, демонтаж на покриви, стени, гаражи и навеси. Услуги в София, Ловеч и Плевен.",
        inLanguage: "bg",
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": organization },
      },
      {
        "@type": "Service",
        "@id": `${origin}/#service`,
        name: "Събаряне и демонтаж на постройки",
        serviceType: "Демонтаж и събаряне на постройки",
        provider: { "@id": organization },
        areaServed,
        url: page,
        description:
          "Ръчен и контролиран демонтаж на стопански постройки, гаражи, навеси, стени, покриви, дървени конструкции и вътрешни облицовки.",
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Услуги по демонтаж",
          itemListElement: services.map((service, index) => ({
            "@type": "Offer",
            position: index + 1,
            itemOffered: {
              "@type": "Service",
              name: service.title,
              description: service.summary,
            },
          })),
        },
      },
    ],
  };
}

export const areaNames = areas.map((area) => `${area.title} — ${area.suffix}`);
