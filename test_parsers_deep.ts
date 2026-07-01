import { parseScheduleDictationLocal } from "./apps/web/src/lib/smartScheduleParser";
import { parseVisitDictationLocal } from "./apps/web/src/lib/smartVisitParser";
import { parsePatientDictationLocal } from "./apps/web/src/lib/smartPatientParser";


function runTest(name: string, func: Function, phrases: string[]) {
  console.log(`\n=========================================`);
  console.log(`TESTING: ${name}`);
  console.log(`=========================================`);
  phrases.forEach((phrase, idx) => {
    console.log(`\n[Input ${idx + 1}]: "${phrase}"`);
    try {
      const result = func(phrase);
      console.log(`[Output] :`, JSON.stringify(result, null, 2));
    } catch (err) {
      console.log(`[ERROR]  :`, err);
    }
  });
}

const schedulePhrases = [
  "Запиши Иванова Ивана на завтра в 14:00 на удаление восьмерки",
  "Отмени запись Смирновой на послезавтра",
  "Перенеси Сидорова с понедельника на вторник в три часа дня", // tricky relative time
  "Ааа запиши короче пациентка Анна кариес в среду в 12:30", // dirty dictation
  "Удали запись на 18:00 сегодня",
];

const visitPhrases = [
  "Пациент жалуется на сильную боль в шестом зубе снизу прикусывать больно", // complaints
  "Объективно глубокий кариес пульпа вскрыта кровит перкуссия резко болезненная", // objective
  "Лечение сделали анестезию ультакаином экстирпация пульпы пломбировка каналов гуттаперчей временная пломба", // treatment
  "Диагноз острый пульпит", // diagnosis
  "Жалобы на эстетику передних зубов анамнез травма в детстве планируется реставрация композитом", // mixed
  "жалобы ноет зуб после сладкого диагноз средний кариес лечение препарирование пломба", // continuous fast dictation
];

const patientPhrases = [
  "Добавь нового пациента Смирнов Алексей Петрович телефон восемь 900 123 45 67 дата рождения 15 мая 1985 года",
  "Новый пациент Анна Сергеевна телефон 89998887766 заметка очень тревожная просит анестезию без адреналина",
  "Запиши пациентку Иванова Мария 10 октября 90 года рождения номер 8 911 222 33 44",
];

runTest("smartScheduleParser", parseScheduleDictationLocal, schedulePhrases);
runTest("smartVisitParser", parseVisitDictationLocal, visitPhrases);
runTest("smartPatientParser", parsePatientDictationLocal, patientPhrases);
