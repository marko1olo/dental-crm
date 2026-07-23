import { parseDictationLocally } from './localDictationParser.js';

const phrases = [
  // Записи (Appointments)
  { context: "schedule", text: "Запиши Иванова Ивана на завтра в 2 часа дня к терапевту" },
  { context: "schedule", text: "Создай запись для Смирновой Анны на 15 мая на половину второго" },
  { context: "schedule", text: "Новый пациент Кузнецов Петр телефон 8 999 123 45 67 на среду в 10 утра" },
  
  // Отмены и переносы (Cancellations & Reschedules)
  { context: "schedule", text: "Отмени запись Сидорова на сегодня" },
  { context: "schedule", text: "Перенеси Петрова с завтрашнего дня на пятницу в 16:30" },

  // Зубная формула и болезни (Teeth & Diseases)
  { context: "visit", text: "Зуб 46 глубокий кариес, зуб 47 пульпит" },
  { context: "visit", text: "С 31 по 34 зубы зубной камень и налет, 21 зуб отсутствует" },
  { context: "visit", text: "План на имплант для 14 и 15 зуба, 16 под коронку" },

  // Надиктовка ЭМК и карточки (EMK Dictation)
  { context: "visit", text: "Жалобы на острую боль в области верхней челюсти справа. Объективно: глубокая кариозная полость в 16 зубе. Диагноз: острый пульпит. План лечения: экстирпация пульпы, пломбирование каналов." },
  
  // Цены (Prices)
  { context: "visit", text: "Вылечили 46 зуб кариес, стоимость 5 с половиной тысяч рублей" },
  { context: "visit", text: "Установка импланта на 24 зуб, взяли 45000" },
  { context: "visit", text: "Консультация и снимок, с пациента 1500 рублей" }
];

console.log("=== HARDCORE NLP PARSER TEST RESULTS ===\n");
let successCount = 0;
let failCount = 0;

for (const p of phrases) {
  console.log(`[Input]: "${p.text}"\n[Context]: ${p.context}`);
  const result = parseDictationLocally(p.text, p.context as any);
  if (result) {
    console.log("[Status]: SUCCESS");
    console.log("[Parsed]:", JSON.stringify(result, null, 2));
    successCount++;
  } else {
    console.log("[Status]: FAILED (Fallback to LLM)");
    failCount++;
  }
  console.log("--------------------------------------------------\n");
}

console.log(`TOTAL SUCCESS (Local Parsed): ${successCount}`);
console.log(`TOTAL FAILED (LLM Fallback): ${failCount}`);
