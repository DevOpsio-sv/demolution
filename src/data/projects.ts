export interface Project {
  id: string;
  title: string;
  service: string;
  location: string | null;
  photo: string;
  illustrative: boolean;
  caption: string;
  before?: string;
  after?: string;
}

export const projectsIntro =
  "Това са част от сградите, които внимателно сме съборили. Демонтажът на постройки се извършва основно с ръчен труд и без тежка техника. В някои случаи се използват подходящи инструменти или багери за по-бързо и безопасно премахване на конструкциите.";

export const projects: Project[] = [
  {
    id: "wide",
    title: "Тухлена постройка на два етажа",
    service: "Тухлени конструкции и покриви",
    location: null,
    photo: "wide",
    illustrative: false,
    caption: "Стара тухлена постройка на два етажа. Премахната е с ръчен труд и без тежка техника.",
  },
  {
    id: "woven",
    title: "Стара стопанска постройка от дърво и керпич",
    service: "Дървени конструкции",
    location: null,
    photo: "woven",
    illustrative: true,
    caption: "Събарянето е извършено с ръчен труд и без тежка техника.",
  },
  {
    id: "opening",
    title: "Градинска бетонна ограда",
    service: "Бетонни конструкции",
    location: null,
    photo: "fence",
    illustrative: false,
    caption: "Извъшено е с подходящи инструменти и без тежка техника.",
  },
];
