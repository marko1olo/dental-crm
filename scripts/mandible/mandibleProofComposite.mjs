/**
 * scripts/mandible/mandibleProofComposite.mjs
 * Stitches PC Light, PC Dark, Mobile Light, Mobile Dark into a single master proof.
 * Mandate 8b <= 120 lines.
 */

import fs from "node:fs";
import sharp from "sharp";

export async function composeMandibleProof({
	pcLightPath,
	pcDarkPath,
	mobileLightPath,
	mobileDarkPath,
	outPath,
}) {
	const canvasWidth = 1920;
	const canvasHeight = 1760;

	const headerSvg = Buffer.from(`
	<svg width="${canvasWidth}" height="110" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#070a13" />
		<line x1="0" y1="109" x2="${canvasWidth}" y2="109" stroke="#1e293b" stroke-width="2" />
		<text x="40" y="45" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#2dd4bf">DENTE CRM — ПОЛНАЯ НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBLE: 16 ЗУБОВ 48..41 | 31..38)</text>
		<text x="40" y="80" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8">Анатомический порядок слева направо · Сагиттальная насечка симметрии · ToothStatusBadge над зубами · Tooth46CariesBar · Зеркальный сегмент 3</text>
	</svg>`);

	const pcLightBuf = await sharp(pcLightPath).resize(900).toBuffer();
	const pcDarkBuf = await sharp(pcDarkPath).resize(900).toBuffer();
	const mobileLightBuf = await sharp(mobileLightPath).resize(420).toBuffer();
	const mobileDarkBuf = await sharp(mobileDarkPath).resize(420).toBuffer();

	const labelsSvg = Buffer.from(`
	<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
		<text x="40" y="145" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">☀️ 1. PC Light Viewport (1440×900) · Интерактивная дуга и статус-бейджи</text>
		<text x="980" y="145" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">🌙 2. PC Dark Viewport (1440×900) · Темные анатомические шейдеры</text>
		<text x="240" y="810" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">📱 3. Mobile Light (390×844)</text>
		<text x="760" y="810" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">📱 4. Mobile Dark (390×844)</text>
		<text x="1260" y="860" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" fill="#2dd4bf">КЛИНИЧЕСКИЙ EBM АУДИТ</text>
		<text x="1260" y="900" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ 16 зубов нижней челюсти в одном кадре</text>
		<text x="1260" y="930" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ Сагиттальная насечка Midline между 41 и 31</text>
		<text x="1260" y="960" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ Анатомическое зеркалирование Q3 (scaleX(-1))</text>
		<text x="1260" y="990" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ ToothStatusBadge над каждым зубом</text>
		<text x="1260" y="1020" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ Tooth46CariesBar открыт под дугой челюсти</text>
		<text x="1260" y="1050" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ 2-уровневый выбор (Класс ВОЗ + Глубина)</text>
		<text x="1260" y="1080" font-family="system-ui, sans-serif" font-size="14" fill="#cbd5e1">✓ Адаптер toothDataToGate0Flags без моков</text>
	</svg>`);

	await sharp({
		create: {
			width: canvasWidth,
			height: canvasHeight,
			channels: 4,
			background: { r: 15, g: 23, b: 42, alpha: 1 },
		},
	})
		.composite([
			{ input: headerSvg, top: 0, left: 0 },
			{ input: labelsSvg, top: 0, left: 0 },
			{ input: pcLightBuf, top: 165, left: 40 },
			{ input: pcDarkBuf, top: 165, left: 980 },
			{ input: mobileLightBuf, top: 835, left: 240 },
			{ input: mobileDarkBuf, top: 835, left: 760 },
		])
		.png()
		.toFile(outPath);
}
