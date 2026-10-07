/**
 * scripts/build_sharpen_composite_proof.cjs
 * Builds a single high-resolution master infographic poster combining:
 * 1. Cleaned-up Doctor Preferences (Light & Dark)
 * 2. CbctLeftToolDock Sharpen button 3-state cycle (0% -> 50% -> 100%)
 * 3. Side-by-side slices comparison: 04 Catmull-Rom vs 09 Laplacian Sharpen
 * 4. Full CBCT Workbench in Dark Cockpit
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function main() {
	const desktopDir = "C:\\Users\\Admin\\Desktop\\НОВЫЕ_ПРУФЫ_ВНЕДРЕНИЯ_ШАРПЕН_И_CATMULL_ROM";
	const outPoster = path.join(desktopDir, "00_СВОДНЫЙ_ПОСТЕР_ВНЕДРЕНИЯ_ВСЕ_В_ОДНОМ.png");

	const fPrefLight = path.join(desktopDir, "01_Настройки_врача_3_метода_Светлая.png");
	const fPrefDark = path.join(desktopDir, "02_Настройки_врача_3_метода_Темный_кокпит.png");
	const fDock0 = path.join(desktopDir, "03_Док_кнопка_Sharpen_0_процентов_выкл.png");
	const fDock50 = path.join(desktopDir, "04_Док_кнопка_Sharpen_50_процентов_стандарт.png");
	const fDock100 = path.join(desktopDir, "05_Док_кнопка_Sharpen_100_процентов_ЭНДО.png");
	const fWorkbench = path.join(desktopDir, "06_Полный_экран_КТ_Темный_кокпит_100_Sharpen.png");
	const fSlice04 = path.join(desktopDir, "07_Срез_04_Catmull_Rom_Фаворит.png");
	const fSlice09 = path.join(desktopDir, "08_Срез_09_Лапласиан_Эндо_Каналы.png");

	// Canvas dimensions: 1920 width, 2400 height
	const width = 1920;
	const height = 2480;

	// Prepare components
	// 1. Header Banner SVG
	const headerSvg = Buffer.from(`
	<svg width="${width}" height="120" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#070a13" />
		<line x1="0" y1="119" x2="${width}" y2="119" stroke="#1e293b" stroke-width="2" />
		<text x="40" y="50" font-family="Segoe UI, sans-serif" font-size="28" font-weight="bold" fill="#38bdf8">DENTE CRM — ВНЕДРЕНИЕ КАТМУЛЛ-РОМ (04) И ЛАПЛАСИАНА РЕЗКОСТИ (09)</text>
		<text x="40" y="85" font-family="Segoe UI, sans-serif" font-size="16" fill="#94a3b8">Клинический золотой дефолт: Catmull-Rom | Боковой док: 1-клик лапласиан резкости эндодонтии (0% / 50% / 100%) | Удалены: Lanczos-3, Bilateral</text>
	</svg>`);

	// 2. Section 1 title: Настройки врача (3 метода)
	const s1Title = Buffer.from(`
	<svg width="${width}" height="50" xmlns="http://www.w3.org/2000/svg">
		<text x="40" y="35" font-family="Segoe UI, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc">1. ОЧИЩЕННЫЕ НАСТРОЙКИ ВРАЧА (3 КЛИНИЧЕСКИХ МЕТОДА: ДЕФОЛТ CATMULL-ROM, B-SPLINE, BILINEAR)</text>
	</svg>`);

	// Resize preferences cards to width 900 each
	const bPrefLight = await sharp(fPrefLight).resize(900).toBuffer();
	const bPrefDark = await sharp(fPrefDark).resize(900).toBuffer();

	// 3. Section 2 title: Кнопка Sharpen в левом доке Romexis
	const s2Title = Buffer.from(`
	<svg width="${width}" height="50" xmlns="http://www.w3.org/2000/svg">
		<text x="40" y="35" font-family="Segoe UI, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc">2. БОКОВАЯ КНОПКА «SHARPEN / ЭНДО» В ДОКЕ ROMEXIS (3-ШАГОВЫЙ ЦИКЛ: 0% ВЫКЛ → 50% СТАНДАРТ → 100% ЭНДО)</text>
	</svg>`);

	// Docks are tall and narrow. Let's crop/focus or show them side-by-side with annotations
	const bDock0 = await sharp(fDock0).resize({ height: 460 }).toBuffer();
	const bDock50 = await sharp(fDock50).resize({ height: 460 }).toBuffer();
	const bDock100 = await sharp(fDock100).resize({ height: 460 }).toBuffer();

	const dockLabelsSvg = Buffer.from(`
	<svg width="1500" height="460" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#090d16" rx="16" />
		<text x="140" y="60" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#94a3b8">КЛИК 0: 0% (ВЫКЛ)</text>
		<text x="140" y="90" font-family="Segoe UI, sans-serif" font-size="13" fill="#64748b">Нейтральная иконка Focus</text>
		<text x="140" y="110" font-family="Segoe UI, sans-serif" font-size="13" fill="#64748b">Базовый срез Catmull-Rom</text>

		<text x="640" y="60" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">КЛИК 1: 50% (СТАНДАРТ)</text>
		<text x="640" y="90" font-family="Segoe UI, sans-serif" font-size="13" fill="#38bdf8">Циановая неоновая подсветка</text>
		<text x="640" y="110" font-family="Segoe UI, sans-serif" font-size="13" fill="#94a3b8">Контурная резкость корней</text>

		<text x="1140" y="60" font-family="Segoe UI, sans-serif" font-size="16" font-weight="bold" fill="#06b6d4">КЛИК 2: 100% (МАКСИМУМ ЭНДО)</text>
		<text x="1140" y="90" font-family="Segoe UI, sans-serif" font-size="13" fill="#06b6d4">Жирный бейдж 100%, масштаб 110%</text>
		<text x="1140" y="110" font-family="Segoe UI, sans-serif" font-size="13" fill="#94a3b8">Поиск каналов MB1/MB2 и периодонта</text>
	</svg>`);

	// 4. Section 3 title: Сравнение срезов (04 Catmull-Rom vs 09 Laplacian Sharpen)
	const s3Title = Buffer.from(`
	<svg width="${width}" height="50" xmlns="http://www.w3.org/2000/svg">
		<text x="40" y="35" font-family="Segoe UI, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc">3. СРАВНЕНИЕ СРЕЗОВ КТ: 04. CATMULL-ROM (ЗОЛОТОЙ ДЕФОЛТ) vs 09. ЛАПЛАСИАН РЕЗКОСТИ (ЭНДОДОНТИЯ)</text>
	</svg>`);

	// Resize slices to 890 width each
	const bSlice04 = await sharp(fSlice04).resize(890).toBuffer();
	const bSlice09 = await sharp(fSlice09).resize(890).toBuffer();

	// 5. Section 4 title: Полный экран КТ в Dark Cockpit
	const s4Title = Buffer.from(`
	<svg width="${width}" height="50" xmlns="http://www.w3.org/2000/svg">
		<text x="40" y="35" font-family="Segoe UI, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc">4. ЖИВОЙ РАБОЧИЙ СТЕНД DENTE КТ В ТЕМНОМ КОКПИТЕ СО 100% АКТИВНЫМ ЛАПЛАСИАНОМ</text>
	</svg>`);

	const bWorkbench = await sharp(fWorkbench).resize(1840).toBuffer();

	// Composite layout calculations
	// Base dark background: 1920 x 3600
	const finalHeight = 3650;
	let currentY = 0;

	const compositeOps = [];

	// Header at 0
	compositeOps.push({ input: headerSvg, top: 0, left: 0 });
	currentY = 130;

	// S1 Title
	compositeOps.push({ input: s1Title, top: currentY, left: 0 });
	currentY += 50;

	// Pref Light & Dark side by side
	compositeOps.push({ input: bPrefLight, top: currentY, left: 40 });
	compositeOps.push({ input: bPrefDark, top: currentY, left: 980 });
	currentY += 280;

	// S2 Title
	compositeOps.push({ input: s2Title, top: currentY, left: 0 });
	currentY += 50;

	// Docks box
	compositeOps.push({ input: dockLabelsSvg, top: currentY, left: 40 });
	compositeOps.push({ input: bDock0, top: currentY, left: 60 });
	compositeOps.push({ input: bDock50, top: currentY, left: 560 });
	compositeOps.push({ input: bDock100, top: currentY, left: 1060 });
	currentY += 490;

	// S3 Title
	compositeOps.push({ input: s3Title, top: currentY, left: 0 });
	currentY += 50;

	// Slices side by side
	compositeOps.push({ input: bSlice04, top: currentY, left: 40 });
	compositeOps.push({ input: bSlice09, top: currentY, left: 980 });
	currentY += 1000;

	// S4 Title
	compositeOps.push({ input: s4Title, top: currentY, left: 0 });
	currentY += 50;

	// Full Workbench
	compositeOps.push({ input: bWorkbench, top: currentY, left: 40 });
	currentY += 1150;

	console.log(`Compositing master poster (1920 x ${finalHeight})...`);
	await sharp({
		create: {
			width,
			height: finalHeight,
			channels: 4,
			background: { r: 7, g: 10, b: 19, alpha: 1 },
		},
	})
		.composite(compositeOps)
		.png({ quality: 95 })
		.toFile(outPoster);

	console.log("POSTER CREATED SUCCESSFULLY:", outPoster, "size:", fs.statSync(outPoster).size);

	// Also copy to screenshots dir and brain dir
	const legacyOut = path.resolve(__dirname, "..", "screenshots", "00_СВОДНЫЙ_ПОСТЕР_ВНЕДРЕНИЯ_ВСЕ_В_ОДНОМ.png");
	const brainOut = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\3dd8abc3-cf84-46a0-8273-8471441ce17d\\00_СВОДНЫЙ_ПОСТЕР_ВНЕДРЕНИЯ_ВСЕ_В_ОДНОМ.png";
	fs.copyFileSync(outPoster, legacyOut);
	fs.copyFileSync(outPoster, brainOut);
	console.log("COPIED POSTER TO BRAIN AND SCREENSHOTS!");
}

main().catch((err) => {
	console.error("FATAL ERROR in poster generation:", err);
	process.exit(1);
});
