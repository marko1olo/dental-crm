import { Buffer } from "node:buffer";

function trimPromptBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  
  let end = value.length;
  while (end > 0 && Buffer.byteLength(value.slice(0, end), "utf8") > maxBytes) {
    end--;
  }
  
  const clipped = value.slice(0, end);
  const lastComma = clipped.lastIndexOf(",");
  if (lastComma > 0) {
    return clipped.slice(0, lastComma).trimEnd() + ".";
  }
  return clipped.trimEnd() + ".";
}

const p = "Жалобы на боли в зубе 36 от холодного. Анамнез: зуб 46 лечен ранее. Объективно: Status praesens без особенностей. Зондирование и перкуссия болезненны, термопроба положительная. Диагноз Dx: Кариес, пульпит 36, периодонтит 11. Проведено: ОПТГ, КЛКТ, RVG-контроль. Анестезия, изоляция коффердам, некрэктомия, экстирпация пульпы. Инструментальная и медикаментозная обработка корневых каналов (ИМО). Пломба Filtek светового отверждения. Выполнено, назначены рекомендации. Доп. термины: FDI 11-48, зуб 11, зуб 36, зуб 46, один один = 11, три шесть = 36, тридцать шестого = 36, зуб 3.6 = зуб 36, четыре шесть = 46, сорок шестого = 46, верхняя правая шестерка = зуб 16, верхняя левая шестерка = зуб 26, нижняя левая шестерка = зуб 36, нижняя правая шестерка = зуб 46, RVG, РВГ, OPG, ОПТГ, CBCT, КЛКТ, КТ, TRG, ТРГ, жалобы, без жалоб, жалобы отрицает.";
console.log(trimPromptBytes(p, 890));
