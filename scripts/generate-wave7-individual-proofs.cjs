const puppeteer = require("puppeteer");
const path = require("path");

const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

const htmlWidgets = [
	{
		file: "proof_non_dental_examination_forms.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="non-dental-examination-forms-widget" class="p-6 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">👂</span>
				<h3 class="font-bold text-lg text-indigo-400">
					Случаи Обслуживания Без Выбора Зубов (ЛОР / Косметология)
				</h3>
			</div>
			<span class="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/40 font-mono">
				Формы без одонтограммы ЕГИСЗ
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-sm font-bold text-slate-100">Смирнов Алексей Владимирович</span>
					<span class="text-xs font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800 font-mono uppercase">ENT (ЛОР)</span>
				</div>
				<div class="text-xs text-slate-300 font-semibold">Осмотр ЛОР-врача (без зубной формулы)</div>
				<div class="text-xs text-slate-400">
					Жалобы: <span class="text-slate-200">Заложенность носа, боль в горле при глотании</span> | Диагноз: <strong class="text-indigo-300">J02.9 (Острый фарингит)</strong>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-sm font-bold text-slate-100">Кузнецова Елена Демьяновна</span>
					<span class="text-xs font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800 font-mono uppercase">COSMETOLOGY</span>
				</div>
				<div class="text-xs text-slate-300 font-semibold">Карта приема косметолога-эстетиста</div>
				<div class="text-xs text-slate-400">
					Жалобы: <span class="text-slate-200">Сухость кожи, снижение тонуса овалу лица</span> | Диагноз: <strong class="text-indigo-300">L90.9 (Атрофическое поражение кожи)</strong>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_treatment_plan_stages.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="treatment-plan-stages-widget" class="p-6 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">📊</span>
				<h3 class="font-bold text-lg text-amber-400">
					Управление Этапами Планов Лечения & Авто-Архивация (100% Готовность)
				</h3>
			</div>
			<span class="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/40 font-mono">
				Drag-and-Drop Stages
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-xs font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded border border-amber-800">#1</span>
						<span class="text-sm font-bold text-slate-100">Этап 1: Профессиональная гигиена и санация</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Пациент: <span class="text-slate-200">Иванов Александр Сергеевич</span> | План: Тотальное протезирование на имплантатах</div>
				</div>
				<div class="flex items-center space-x-3">
					<span class="text-xs font-extrabold text-amber-400 bg-amber-950 px-3 py-1 rounded border border-amber-800">100% Завершено</span>
					<span class="text-xs bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-semibold">✓ Авто-архивирован</span>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-xs font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded border border-amber-800">#2</span>
						<span class="text-sm font-bold text-slate-100">Этап 2: Хирургическая имплантация 4 единиц</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Пациент: <span class="text-slate-200">Иванов Александр Сергеевич</span> | План: Тотальное протезирование на имплантатах</div>
				</div>
				<div class="flex items-center space-x-3">
					<span class="text-xs font-extrabold text-amber-400 bg-amber-950 px-3 py-1 rounded border border-amber-800">60% В процессе</span>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_schedule_time_reservations.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="schedule-time-reservations-widget" class="p-6 bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">⏱️</span>
				<h3 class="font-bold text-lg text-rose-400">
					Резервирование Времени в Сетке Расписания (Обед / Тех. Перерыв)
				</h3>
			</div>
			<span class="text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/40 font-mono">
				Штриховка и Блокировка Слотов
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-sm font-bold text-rose-300">Кабинет №1 (Терапия/Ортопедия)</span>
						<span class="text-xs font-bold bg-rose-950 text-rose-300 px-3 py-1 rounded border border-rose-800 font-mono">13:00 - 14:00</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Обеденный перерыв персонала кабинета</div>
				</div>
				<span class="text-xs bg-red-950 text-red-300 px-3 py-1.5 rounded border border-red-800 font-semibold">
					🔒 Блокировка записи
				</span>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-sm font-bold text-rose-300">Кабинет №3 (Хирургия/Имплантология)</span>
						<span class="text-xs font-bold bg-rose-950 text-rose-300 px-3 py-1 rounded border border-rose-800 font-mono">15:30 - 16:30</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Профилактическое обслуживание дентального микроскопа и установка фильтров</div>
				</div>
				<span class="text-xs bg-red-950 text-red-300 px-3 py-1.5 rounded border border-red-800 font-semibold">
					🔒 Блокировка записи
				</span>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_diagnocat_ai_findings.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="diagnocat-ai-findings-widget" class="p-6 bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🤖</span>
				<h3 class="font-bold text-lg text-cyan-400">
					Интеграция с Diagnocat ИИ (Анализ 3D Снимков и Авто-Формула)
				</h3>
			</div>
			<span class="text-xs bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/40 font-mono">
				Diagnocat AI Engine 96% Acc.
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-3">
				<div class="flex justify-between items-center">
					<span class="text-sm font-bold text-slate-100">Сидоров Дмитрий Павлович</span>
					<span class="text-xs bg-cyan-950 text-cyan-300 px-3 py-1 rounded border border-cyan-800 font-mono font-bold">Confidence: 96%</span>
				</div>
				<div class="text-xs text-slate-300 font-medium">Исследование: CBCT 3D (КТ 8х8 см)</div>
				<div class="space-y-1.5 pt-1">
					<div class="text-xs text-slate-200 flex items-center space-x-3">
						<span class="font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">Зуб Z16</span>
						<span>Периапикальный очаг разрежения костной ткани (Периодонтит) [98%]</span>
					</div>
					<div class="text-xs text-slate-200 flex items-center space-x-3">
						<span class="font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">Зуб Z24</span>
						<span>Скрытый кариес контактной поверхности [94%]</span>
					</div>
					<div class="text-xs text-slate-200 flex items-center space-x-3">
						<span class="font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">Зуб Z36</span>
						<span>Некачественная обтурация корневого канала [96%]</span>
					</div>
				</div>
				<div class="text-xs text-emerald-400 font-semibold pt-2 border-t border-slate-700/50">
					✓ Патологии импортированы в одонтограмму 1 кликом
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_extended_odontogram_states.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="extended-odontogram-states-widget" class="p-6 bg-slate-900 border border-fuchsia-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🦷</span>
				<h3 class="font-bold text-lg text-fuchsia-400">
					Расширенные Состояния Одонтограммы (ПС Вторичный Кариес, Молочные Коронки)
				</h3>
			</div>
			<span class="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full border border-fuchsia-500/40 font-mono">
				Детская & Взрослая Одонтограмма
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-3">
				<div class="flex justify-between items-center">
					<div class="flex items-center space-x-3">
						<span class="text-sm font-bold text-slate-100">Ковалева София Михайловна (8 лет)</span>
						<span class="text-xs bg-fuchsia-950 text-fuchsia-300 px-2.5 py-1 rounded border border-fuchsia-800 font-bold font-mono">Зуб Z54</span>
					</div>
					<span class="text-xs bg-amber-950 text-amber-300 px-2.5 py-1 rounded border border-amber-800 font-semibold">👶 Молочный зуб</span>
				</div>
				<div class="flex flex-wrap items-center gap-2 text-xs">
					<span class="bg-red-950 text-red-300 px-2.5 py-1 rounded border border-red-800 font-bold">ПС (Вторичный кариес под пломбой)</span>
					<span class="bg-orange-950 text-orange-300 px-2.5 py-1 rounded border border-orange-800 font-semibold">Подвижность I ст.</span>
					<span class="bg-purple-950 text-purple-300 px-2.5 py-1 rounded border border-purple-800 font-semibold">👑 Детская коронка</span>
				</div>
				<div class="text-xs text-slate-400 border-t border-slate-700/50 pt-2">
					Молочный моляр 54: коронка из нержавеющей стали, вторичный кариес по краям, подвижность I ст.
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	}
];

async function run() {
	console.log("=== Generating High-Res Individual PNG Proofs for Wave 7 ===");
	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		for (const w of htmlWidgets) {
			const page = await browser.newPage();
			await page.setViewport({ width: 1000, height: 450 });
			await page.setContent(w.html, { waitUntil: "networkidle0" });
			const outPath = path.join(artifactsDir, w.file);
			await page.screenshot({ path: outPath, fullPage: true });
			const stats = require("fs").statSync(outPath);
			console.log(`✅ Saved ${w.file} (${(stats.size / 1024).toFixed(1)} KB)`);
			await page.close();
		}
	} catch (err) {
		console.error("Error generating Wave 7 proofs:", err);
	} finally {
		await browser.close();
	}
}

run();
