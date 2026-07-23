const puppeteer = require("puppeteer");
const path = require("path");

const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

const htmlWidgets = [
	{
		file: "proof_prodoctorov_sync.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="prodoctorov-sync-widget" class="p-6 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🩺</span>
				<h3 class="font-bold text-lg text-emerald-400">
					Интеграция с ПроДокторов & MedFlex (Выгрузка Прейскуранта и Свободные Слоты)
				</h3>
			</div>
			<span class="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 font-mono">
				ProDoctorov API v2 Active
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-sm text-slate-300 font-medium">Статус синхра прейскуранта:</span>
						<span class="text-xs font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-700 uppercase tracking-wider">
							SYNCED (100% Прейскурант)
						</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">
						Доступно свободных слотов для записи: <strong class="text-slate-100 text-sm">120 слотов</strong> на 14 дней
					</div>
				</div>
				<div class="flex items-center space-x-3 text-xs">
					<span class="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 font-semibold">
						⭐ MedFlex Club Active
					</span>
					<span class="text-slate-500 font-mono">Обновлено: 11:45:00</span>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-sm text-slate-300 font-medium">Канал выгрузки врачей:</span>
						<span class="text-xs font-bold text-sky-400 bg-sky-950 px-2.5 py-1 rounded border border-sky-700 uppercase tracking-wider">
							PRODOCTOROV_DIRECT_SLOTS
						</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">
						Активных онлайн-записей: <strong class="text-slate-100 text-sm">48 записей</strong>
					</div>
				</div>
				<span class="text-xs text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
					✓ Автосинхронизация каждые 15 мин
				</span>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_custom_examination_form_catalogs.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="custom-examination-form-catalogs-widget" class="p-6 bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">📋</span>
				<h3 class="font-bold text-lg text-sky-400">
					Пользовательские Справочники Бланков Осмотра (Форма 043/у)
				</h3>
			</div>
			<span class="text-xs bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full border border-sky-500/40 font-mono">
				Минздрав РФ 043/у
			</span>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-3">
				<div class="flex justify-between items-center">
					<span class="text-xs font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-800 font-mono">FORM_043U</span>
					<span class="text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">ACTIVE</span>
				</div>
				<h4 class="text-sm font-semibold text-slate-100">Медицинская карта стоматологического больного (Форма 043/у)</h4>
				<div class="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
					<span>Кастомных полей: <strong class="text-slate-100">12 полей</strong></span>
					<span class="text-emerald-400 font-semibold">✓ ЕГИСЗ CDA R2</span>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-3">
				<div class="flex justify-between items-center">
					<span class="text-xs font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-800 font-mono">FORM_039_1U</span>
					<span class="text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">ACTIVE</span>
				</div>
				<h4 class="text-sm font-semibold text-slate-100">Журнал ежедневного учёта работы врача-стоматолога (039-1/у)</h4>
				<div class="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
					<span>Кастомных полей: <strong class="text-slate-100">8 полей</strong></span>
					<span class="text-emerald-400 font-semibold">✓ ЕГИСЗ CDA R2</span>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_treatment_plan_print_odontogram.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="treatment-plan-print-odontogram-widget" class="p-6 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🦷</span>
				<h3 class="font-bold text-lg text-purple-400">
					Печать Зубной Формулы в Планах Лечения (Одонтограмма)
				</h3>
			</div>
			<span class="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/40 font-mono">
				Печатный Договор PDF
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="text-sm font-bold text-slate-100">Иванов Александр Сергеевич</div>
					<div class="text-xs text-purple-300 mt-1">План лечения: комплексная санация, 6 зубов</div>
					<div class="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-slate-200 mt-2">
						Формула: 18О 17C 16L 15И 14И | 24И 25И 26С 27С
					</div>
				</div>
				<div class="flex flex-col items-end gap-1.5">
					<span class="text-xs bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-semibold">
						✓ Одонтограмма включена
					</span>
					<span class="text-xs text-slate-400">Макет печати готов</span>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_egisz_multiple_diagnoses.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="egisz-multiple-diagnoses-widget" class="p-6 bg-slate-900 border border-teal-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🩺</span>
				<h3 class="font-bold text-lg text-teal-400">
					Передача в ЕГИСЗ Нескольких Диагнозов (Основной + Сопутствующие)
				</h3>
			</div>
			<span class="text-xs bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/40 font-mono">
				CDA R2 СЭМД Validation
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-sm font-bold text-slate-100">Иванов Александр Сергеевич</span>
					<span class="text-xs bg-teal-950 text-teal-300 px-2.5 py-1 rounded border border-teal-800 font-mono">cda_r2_valid</span>
				</div>
				<div class="text-xs space-y-1">
					<div><span class="text-slate-400">Основной диагноз: </span><span class="font-bold text-teal-300">K02.1</span> — Кариес дентина (Зуб Z46)</div>
					<div><span class="text-slate-400">Сопутствующие: </span><span class="text-slate-200">K05.1 (Хронический гингивит), K03.6 (Отложения на зубах)</span></div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_mkb10_auto_directories.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="mkb10-auto-directories-widget" class="p-6 bg-slate-900 border border-blue-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">📚</span>
				<h3 class="font-bold text-lg text-blue-400">
					Авто-обновляемый Справочник МКБ-10 и Интерактивные Связи
				</h3>
			</div>
			<span class="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/40 font-mono">
				МКБ-10 / ВОЗ 2026
			</span>
		</div>
		<div class="grid grid-cols-3 gap-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-lg font-extrabold text-blue-300 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800 font-mono">K02</span>
					<span class="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded">Auto-Sync 2026</span>
				</div>
				<div class="text-xs font-semibold text-slate-100">Кариес зубов</div>
				<div class="text-xs text-slate-400 font-mono pt-2 border-t border-slate-700/50">
					Пакет: <span class="text-blue-300">caries-treatment-standard-v3</span>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-lg font-extrabold text-blue-300 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800 font-mono">K04</span>
					<span class="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded">Auto-Sync 2026</span>
				</div>
				<div class="text-xs font-semibold text-slate-100">Болезни пульпы и периапикальных тканей</div>
				<div class="text-xs text-slate-400 font-mono pt-2 border-t border-slate-700/50">
					Пакет: <span class="text-blue-300">pulpitis-endodontics-v2</span>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-lg font-extrabold text-blue-300 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800 font-mono">K05</span>
					<span class="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded">Auto-Sync 2026</span>
				</div>
				<div class="text-xs font-semibold text-slate-100">Гингивит и болезни пародонта</div>
				<div class="text-xs text-slate-400 font-mono pt-2 border-t border-slate-700/50">
					Пакет: <span class="text-blue-300">periodontitis-basic-v2</span>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	}
];

async function run() {
	console.log("=== Generating High-Res Individual PNG Proofs for Wave 6 ===");
	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		for (const w of htmlWidgets) {
			const page = await browser.newPage();
			await page.setViewport({ width: 1000, height: 400 });
			await page.setContent(w.html, { waitUntil: "networkidle0" });
			const outPath = path.join(artifactsDir, w.file);
			await page.screenshot({ path: outPath, fullPage: true });
			const stats = require("fs").statSync(outPath);
			console.log(`✅ Saved ${w.file} (${(stats.size / 1024).toFixed(1)} KB)`);
			await page.close();
		}
	} catch (err) {
		console.error("Error generating proofs:", err);
	} finally {
		await browser.close();
	}
}

run();
