const fs = require("fs");
const path = require("path");

const dir = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34";

// Проверим срез в середине стопки (например, 170)
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".dcm"));
console.log(`Найдено ${files.length} DICOM файлов.`);

// Найдем файл со срезом зуба ~150-180
const targetFile = files.find(f => f.includes("170")) || files[Math.floor(files.length / 2)];
console.log(`Выбран срез: ${targetFile}`);

const buf = fs.readFileSync(path.join(dir, targetFile));

// Простой парсинг DICOM тегов (Rows: 0x0028, 0x0010; Columns: 0x0028, 0x0011; RescaleSlope, Intercept)
// Ищем Pixel Data (7FE0, 0010)
let pixelDataOffset = -1;
for (let i = 0; i < buf.length - 8; i++) {
    if (buf[i] === 0xE0 && buf[i+1] === 0x7F && buf[i+2] === 0x10 && buf[i+3] === 0x00) {
        // Нашли тег 7FE0,0010
        // VR (2 байта, например OW или OB) + 2 байта длины или резерв
        const vr = String.fromCharCode(buf[i+4], buf[i+5]);
        if (vr === "OW" || vr === "OB") {
            pixelDataOffset = i + 12; // 8 байт тег+длина (32 бит длина после 2 байт резерва)
        } else {
            pixelDataOffset = i + 8;
        }
        break;
    }
}

console.log(`Pixel Data смещение: ${pixelDataOffset}`);
const cols = 277;
const rows = 333;
const totalPixels = cols * rows;

// Читаем 16-битные значения
const pixels = new Int16Array(totalPixels);
for (let i = 0; i < totalPixels; i++) {
    const byteIdx = pixelDataOffset + i * 2;
    if (byteIdx + 1 < buf.length) {
        pixels[i] = buf.readInt16LE(byteIdx);
    }
}

let min = Infinity, max = -Infinity;
for (let i = 0; i < totalPixels; i++) {
    if (pixels[i] < min) min = pixels[i];
    if (pixels[i] > max) max = pixels[i];
}
console.log(`Диапазон HU среза: min=${min}, max=${max}`);

// Сохраняем в apps/web/public/radiology/real_molar_slice_277x333.json
const outPath = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/radiology/real_molar_slice_277x333.json");
const publicDir = path.dirname(outPath);
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const sliceData = {
    patientName: "Сумарокова И.О.",
    caseInfo: "КЛКТ верхней челюсти, сектор 24-26 (моляры, премоляры, пазуха)",
    cols,
    rows,
    pixelSpacingMm: 0.15,
    minHU: min,
    maxHU: max,
    data: Array.from(pixels)
};

fs.writeFileSync(outPath, JSON.stringify(sliceData));
console.log(`Успешно сохранен реальный КТ срез в: ${outPath} (${fs.statSync(outPath).size} байт)`);
