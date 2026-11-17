export interface Service {
  id: string;
  number: string;
  title: string;
  summary: string;
  detail: string;
  inquiry: string;
  photo: string;
}

export const services: Service[] = [
  {
    id: "farm",
    number: "01",
    title: "Стопански постройки",
    summary: "Събаряне и демонтаж на стари селскостопански сгради, обори, плевни и помощни постройки.", 
    detail:"",  
    inquiry: "Стопанска постройка",
    photo: "farm",
  },
  {
    id: "shed",
    number: "02",
    title: "Гаражи и навеси",
    summary: "Демонтаж на гаражи, навеси, бараки и други помощни конструкции от зидария, ламарина или дърво.",
    detail:
      "",
    inquiry: "Гараж или навес",
    photo: "shed",
  },
  {
    id: "masonry",
    number: "03",
    title: "Стени и зидария",
    summary: "Демонтаж на стени и зидария, включително преградни стени при ремонт.",
    detail:
      "",
    inquiry: "Стена или зидария",
    photo: "wall",
  },
  {
    id: "roof",
    number: "04",
    title: "Покривни конструкции",
    summary: "Сваляне на стари покриви, летви, обшивки и покривни елементи.",
    detail:
      "",
    inquiry: "Покрив",
    photo: "roof",
  },
  {
    id: "timber",
    number: "05",
    title: "Дървени конструкции",
    summary: "Демонтаж на дървени елементи, гредоред, обшивки и помощни дървени постройки.",
    detail:
      "",
    inquiry: "Дървена конструкция",
    photo: "timber",
  },
  {
    id: "interior",
    number: "06",
    title: "Вътрешен демонтаж",
    summary: "Подготовка за ремонт: неносещи прегради, плочки, стари настилки и облицовки.",
    detail:
      "Опасни отпадъци и намеса в конструкцията не се поемат без отделна оценка.",
    inquiry: "Вътрешен демонтаж",
    photo: "interior",
  },
];
