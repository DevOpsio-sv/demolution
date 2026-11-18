export const business = {
  provisionalName: "DEMONT",
  phoneDisplay: "0882 820025",
  phoneE164: "+359882820025",
  viberHref: "viber://chat?number=%2B359882820025",
  email: null as string | null,
  legalName: null as string | null,
  eik: null as string | null,
  address: null as string | null,
  retention: null as string | null,
} as const;

export const navigation = [
  { href: "#uslugi", label: "Услуги" },
  { href: "#proces", label: "Как работим" },
  { href: "#proekti", label: "Проекти" },
  { href: "#rayoni", label: "Райони" },
  { href: "#vaprosi", label: "Въпроси" },
  { href: "#kontakt", label: "Контакт" },
] as const;

export const pageMeta = {
  title: "Събаряне на постройки и демонтаж | София, Ловеч, Плевен",
  description:
    "Събаряне на стари и стопански постройки, демонтаж на покриви, стени, гаражи и навеси. Услуги в София, Ловеч и Плевен. Поискайте оферта.",
} as const;

export const areas = [
  {
    id: "sofia",
    title: "София",
    suffix: "и Софийска област",
    text: "Възможността за поемане на обект се уточнява според местоположението, достъпа и необходимата организация.",
    subtext: "Основни населени места: София · Банкя · Божурище · Костинброд · Елин Пелин · Ботевград · Правец · Своге · Самоков",
  },
  {
    id: "lovech",
    title: "Ловеч",
    suffix: "и област Ловеч",
    text: "Работим по събаряне и разглобяване на стари селскостопански постройки, плевни, обори, навеси и неизползваеми конструкции.",
    subtext: "Основни населени места: Ловеч · Луковит · Тетевен · Троян · Ябланица · Угърчин · Летница · Априлци",
  },
  {
    id: "pleven",
    title: "Плевен",
    suffix: "и област Плевен",
    text: "Извършваме демонтаж на помощни и стопански постройки, гаражи, покриви и зидария.",
    subtext: "Основни населени места: Плевен · Червен бряг · Кнежа · Левски · Долни Дъбник · Долна Митрополия · Белене · Никопол",
  },
] as const;
