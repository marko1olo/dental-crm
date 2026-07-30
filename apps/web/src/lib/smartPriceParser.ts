import { textToNumbers, normalizeDentalSlang } from "./stringUtils";

export interface ParsedPriceData {
  serviceName: string;
  price: number | null;
  category: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  хирурги: "Хирургия",
  терапи: "Терапия",
  ортопеди: "Ортопедия",
  ортодонт: "Ортодонтия",
  гигиен: "Гигиена",
  профилактик: "Профилактика",
  имплантаци: "Имплантация",
  рентген: "Диагностика",
  диагностик: "Диагностика",
  детств: "Детская стоматология",
  детск: "Детская стоматология",
};

export function parsePriceDictationLocal(input: string): ParsedPriceData {
  const result: ParsedPriceData = {
    serviceName: "",
    price: null,
    category: null,
  };
  let normalized = textToNumbers(input);
  normalized = normalizeDentalSlang(normalized);

  // Extract Price
  // Look for number before "руб", "р", "тысяч", "тыс"
  const priceRegexes = [
    /(\d+[\d\s]*)\s*(?:тысяч|тыс|т\.р\.|т\.р|тр)\b/i,
    /(\d+[\d\s]*)\s*(?:рублей|руб|р\.|р\b)/i,
    /цена\s*(\d+[\d\s]*)/i,
    /стоимость\s*(\d+[\d\s]*)/i,
    /за\s*(\d+[\d\s]*)/i,
  ];

  for (const regex of priceRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const rawNum = match[1].replace(/\s+/g, "");
      let price = parseInt(rawNum, 10);

      if (regex.source.includes("тысяч|тыс")) {
        price = price * 1000;
      } else if (price < 100 && rawNum.length < 3) {
        price = price * 1000;
      }

      result.price = price;
      normalized = normalized.replace(match[0], " ");
      break;
    }
  }

  /* Цена без слова-подсказки.
     Все регулярки выше ищут «руб», «тысяч», «цена», «стоимость» или «за».
     Но textToNumbers к этому моменту уже заменил надиктованные словами
     числа цифрами и сами слова-множители из текста убрал. Диктовка
     «удаление зуба тридцати тысяч» превращалась в «удаление зуба 30000»:
     ни одной подсказки не осталось, цена не находилась вовсе, а число
     уходило в название услуги. Замерено, scratch/probe-price-parser.mjs.

     Берём самое большое отдельно стоящее число не меньше 100. Порог
     отсекает номера зубов (11–48, и normalizeDentalSlang превращает
     «шестерка» в 16) и мелкие количества, а цены в клинике начинаются от
     сотен. */
  if (result.price === null) {
    const standaloneNumbers = normalized.match(
      /(?:^|[^\d.,])(\d{3,})(?=[^\d.,]|$)/g,
    );
    if (standaloneNumbers) {
      const values = standaloneNumbers
        .map((chunk) => Number.parseInt(chunk.replace(/\D/g, ""), 10))
        .filter((value) => Number.isFinite(value) && value >= 100);
      if (values.length > 0) {
        const priceValue = Math.max(...values);
        result.price = priceValue;
        normalized = normalized.replace(
          new RegExp(`(?:^|[^\\d])${priceValue}(?=[^\\d]|$)`),
          " ",
        );
      }
    }
  }

  // Extract Category
  for (const [key, categoryName] of Object.entries(CATEGORY_MAP)) {
    const catRegex = new RegExp(`(?:категори[а-я]*\\s*)?${key}[а-я]*`, "i");
    const match = normalized.match(catRegex);
    if (match) {
      result.category = categoryName;
      normalized = normalized.replace(match[0], " ");
      break;
    }
  }

  // Clean up service name
  // Remove stopwords like "добавь", "в прайс", "услугу"
  /* «цена» и «стоимость» остаются в названии услуги, когда цену нашла
     регулярка по слову «рублей»: она забирает только число и «рублей».
     Диктовка «осмотр стоимость 500 рублей» давала услугу «Осмотр
     стоимость». Это слова-подсказки, а не часть названия. */
  const stopWords =
    /(?:^|[^а-яёa-z0-9])(добавь|добавить|создай|услугу|в прайс|прайс|позицию|новую|сделай|напиши|запиши|цена|цену|ценой|стоимость|стоимостью|за)(?:[^а-яёa-z0-9]|$)/gi;
  normalized = normalized.replace(stopWords, " ").replace(stopWords, " ");

  // Clean stray punctuation
  normalized = normalized
    .replace(/[,;.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length > 0) {
    result.serviceName =
      normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return result;
}
