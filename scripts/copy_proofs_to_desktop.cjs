const fs = require("fs");
const path = require("path");

const desktopDir = "C:\\Users\\Admin\\Desktop\\CBCT_Interpolation_Proofs_512x512";
if (!fs.existsSync(desktopDir)) {
  fs.mkdirSync(desktopDir, { recursive: true });
}

const screenshotsDir = "C:\\Clinic_MVP\\dental-crm\\screenshots";
const files = fs.readdirSync(screenshotsDir).filter((f) => f.startsWith("ct_512_") && f.endsWith(".png"));

let copiedCount = 0;
for (const f of files) {
  const src = path.join(screenshotsDir, f);
  const dest = path.join(desktopDir, f);
  fs.copyFileSync(src, dest);
  copiedCount++;
}

// Копируем интерактивный HTML-атлас
const htmlSrc = "C:\\Clinic_MVP\\dental-crm\\apps\\web\\cbct_interpolation_interactive.html";
const htmlDest = path.join(desktopDir, "ОТКРЫТЬ_АТЛАС_В_БРАУЗЕРЕ.html");
fs.copyFileSync(htmlSrc, htmlDest);

// Создаем понятный README
const readmeContent = `=== АТЛАС 2D-ИНТЕРПОЛЯЦИИ ДЕНТАЛЬНОГО КТ (512x512) ===
Пациент: Захаров И.Д. (Реальный томографический срез, 16-bit DICOM, воксель 0.25 мм)
Разрешение каждого снимка: СТРОГО 512x512 пикселей.
Всего скопировано изображений: ${copiedCount} PNG файлов.

СОДЕРЖИМОЕ ПАПКИ:
1. "ct_512_composite_*.png" (10 файлов)
   - Сводные квадрантные карты 4-в-1 для всей зубной дуги (L1 коронки, L2 пульпа, L3 каналы, L5 кость) с формулами ядер W(x).
2. "ct_512_macro_composite_*.png" (10 файлов)
   - Макро-зум 2.2x на резцы, эмаль, дентин и корневые каналы крупным планом.
3. "ct_512_*_L1_crowns.png" ... "L5_bone.png" (50 файлов)
   - Отдельные анатомические срезы для каждого из 10 методов.
4. "ОТКРЫТЬ_АТЛАС_В_БРАУЗЕРЕ.html"
   - Интерактивный просмотрщик в реальном времени с мгновенным переключением 10 методов, зумом и уровнями.
`;

fs.writeFileSync(path.join(desktopDir, "README_АТЛАС_ПРУФОВ.txt"), readmeContent, "utf8");

console.log(`УСПЕШНО скопировано ${copiedCount} файлов PNG и HTML-атлас на Рабочий стол:`);
console.log(desktopDir);
