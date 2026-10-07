const fs = require("fs");
const path = require("path");

// Исследуем датасет Сумароковой И.О. (сектор 24-26 КЛКТ 0.15 мм) и Захарова И.Д. (600x600)
const sumarokovaDir = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34";
const zakharovDir = "apps/web/public/radiology/demo_cbct";

console.log("=== ПОИСК 5 ИДЕАЛЬНЫХ КЛИНИЧЕСКИХ УРОВНЕЙ СРЕЗОВ КТ ===");

// Функция для чтения DICOM файла и анализа плотности
function analyzeDicomFile(filePath, isDemo = false) {
  const buf = fs.readFileSync(filePath);
  let offset = -1;
  for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0xE0 && buf[i+1] === 0x7F && buf[i+2] === 0x10 && buf[i+3] === 0x00) {
      const vr = String.fromCharCode(buf[i+4], buf[i+5]);
      offset = (vr === "OW" || vr === "OB") ? i + 12 : i + 8;
      break;
    }
  }
  if (offset === -1) return null;

  const w = isDemo ? 600 : 277;
  const h = isDemo ? 600 : 333;
  const total = w * h;
  const raw = new Int16Array(buf.buffer, buf.byteOffset + offset, total);

  let enamelCount = 0; // > 2200 HU
  let dentinCount = 0; // 1200 .. 1800 HU
  let boneCount = 0;   // 400 .. 1100 HU
  let pulpCount = 0;   // 20 .. 150 HU внутри зуба
  let maxHU = -32768, minHU = 32767;

  for (let i = 0; i < total; i++) {
    const v = raw[i];
    if (v > maxHU) maxHU = v;
    if (v < minHU) minHU = v;
    if (v > 2200) enamelCount++;
    if (v >= 1200 && v <= 2000) dentinCount++;
    if (v >= 400 && v < 1200) boneCount++;
    if (v >= 20 && v <= 150) pulpCount++;
  }

  return { enamelCount, dentinCount, boneCount, pulpCount, minHU, maxHU, w, h };
}

// 1. Анализируем стопку Захарова (312 срезов)
const zFiles = fs.readdirSync(zakharovDir).filter(f => f.endsWith(".dcm")).sort();
console.log(`Захаров И.Д.: ${zFiles.length} срезов.`);

const zStats = [];
for (let i = 50; i < zFiles.length - 50; i += 10) {
  const res = analyzeDicomFile(path.join(zakharovDir, zFiles[i]), true);
  if (res) zStats.push({ z: i, file: zFiles[i], ...res });
}

console.log("\nСтатистика Захарова по Z:");
zStats.forEach(s => {
  console.log(`Z=${s.z} (${s.file}): Эмаль=${s.enamelCount}, Дентин=${s.dentinCount}, Кость=${s.boneCount}`);
});

// 2. Анализируем стопку Сумароковой (344 среза)
if (fs.existsSync(sumarokovaDir)) {
  const sFiles = fs.readdirSync(sumarokovaDir).filter(f => f.endsWith(".dcm")).sort((a,b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
  console.log(`\nСумарокова И.О.: ${sFiles.length} срезов.`);
  const sStats = [];
  for (let i = 40; i < sFiles.length - 40; i += 15) {
    const res = analyzeDicomFile(path.join(sumarokovaDir, sFiles[i]), false);
    if (res) sStats.push({ z: i, file: sFiles[i], ...res });
  }
  console.log("Статистика Сумароковой по Z:");
  sStats.forEach(s => {
    console.log(`Z=${s.z} (${s.file}): Эмаль=${s.enamelCount}, Дентин=${s.dentinCount}, Кость=${s.boneCount}`);
  });
}
