import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { renderFdiFormulaTableHtml } from "../apps/web/src/components/emr/record/html/recordHtmlFdiTable.ts";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/181fddf2-210a-4374-abad-f6df15f65e66";

[OUT_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const sampleTeeth = [
	{ toothNumber: 16, statusCode: "caries", clinicalNotes: "Глубокий кариес" },
	{ toothNumber: 11, statusCode: "filled_satisfactory", clinicalNotes: "Световая пломба" },
	{ toothNumber: 26, statusCode: "pulpitis", clinicalNotes: "Острый пульпит" },
	{ toothNumber: 36, statusCode: "extracted_absent", clinicalNotes: "Удален в 2022 году" },
	{ toothNumber: 46, statusCode: "implant", clinicalNotes: "Имплант Straumann" },
	{ toothNumber: 47, statusCode: "crown", clinicalNotes: "Коронка E.max" },
];

const formulaHtml = renderFdiFormulaTableHtml(sampleTeeth);

const fullHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Медицинская карта приёма — Векторная анатомическая одонтограмма А4</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 10mm;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			background: #f8fafc;
			color: #0f172a;
			margin: 0;
			padding: 24px;
			display: flex;
			justify-content: center;
		}
		.sheet {
			background: #ffffff;
			width: 210mm;
			min-height: 297mm;
			padding: 15mm;
			box-sizing: border-box;
			box-shadow: 0 4px 20px rgba(0,0,0,0.08);
			border: 1px solid #e2e8f0;
		}
		.header-title {
			text-align: center;
			font-size: 14pt;
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			margin-bottom: 4px;
			color: #0f172a;
		}
		.header-sub {
			text-align: center;
			font-size: 9pt;
			color: #64748b;
			margin-bottom: 16px;
		}
		.patient-info {
			display: flex;
			justify-content: space-between;
			border-bottom: 1.5px solid #0f172a;
			padding-bottom: 8px;
			margin-bottom: 16px;
			font-size: 9.5pt;
		}
		.section-title {
			font-size: 10.5pt;
			font-weight: 700;
			text-transform: uppercase;
			color: #0f172a;
			margin-top: 14px;
			margin-bottom: 6px;
			border-left: 3px solid #0d9488;
			padding-left: 8px;
		}
	</style>
</head>
<body>
	<div class="sheet">
		<div class="header-title">Медицинская карта стоматологического пациента</div>
		<div class="header-sub">ООО «ДЕНТЕ КЛИНИК» · Лицензия ЛО41-01137-77/00345678 · г. Москва</div>
		
		<div class="patient-info">
			<div><strong>Пациент:</strong> Иванов Сергей Павлович (1988 г.р.)</div>
			<div><strong>Карта №:</strong> 8821 / 2026</div>
			<div><strong>Лечащий врач:</strong> Смирнова Е. В.</div>
		</div>

		<div class="section-title">3.1. Анатомическая одонтограмма и зубная формула FDI</div>
		${formulaHtml}

		<div class="section-title">3.2. Клинический диагноз и план лечения</div>
		<p style="font-size:9pt; line-height:1.5; color:#334155;">
			<strong>К02.1</strong> — Кариес дентина зуба 16 (поверхности O, M).<br/>
			<strong>К04.0</strong> — Пульпит зуба 26.<br/>
			<strong>К08.1</strong> — Потеря зуба 36 вследствие несчастного случая/удаления.<br/>
			Состояние импланта зуба 46 и ортопедической коронки зуба 47 — стабильное, краевое прилегание удовлетворительное.
		</p>
	</div>
</body>
</html>
`;

const tempHtmlPath = path.join(OUT_DIR, "a4_medical_card_preview.html");
writeFileSync(tempHtmlPath, fullHtml, "utf-8");

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const page = await browser.newPage({
	viewport: { width: 1200, height: 1400 },
	deviceScaleFactor: 1.5,
});

await page.goto(`file://${tempHtmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const targetPng = path.join(OUT_DIR, "05_emr_a4_vector_arch_print_preview.png");
await page.screenshot({ path: targetPng, fullPage: true });

const brainPng = path.join(BRAIN_DIR, "05_emr_a4_vector_arch_print_preview.png");
copyFileSync(targetPng, brainPng);

console.log("[PROOF CAPTURED] 05_emr_a4_vector_arch_print_preview.png -> A4 Medical Card with Vector Wheeler Arch");

await browser.close();
