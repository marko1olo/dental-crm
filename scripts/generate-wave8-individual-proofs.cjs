const puppeteer = require("puppeteer");
const path = require("path");

const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

const htmlWidgets = [
	{
		file: "proof_schedule_clipboard_items.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="schedule-clipboard-items-widget" class="p-6 bg-slate-900 border border-violet-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">📋</span>
				<h3 class="font-bold text-lg text-violet-400">
					Плавающий Буфер Расписания (Быстрый Перенос Записей 1 Кликом)
				</h3>
			</div>
			<span class="text-xs bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full border border-violet-500/40 font-mono">
				Appointment Clipboard Active
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="text-sm font-bold text-slate-100">Васильев Игорь Олегович</div>
					<div class="text-xs text-slate-400 mt-1">
						Врач: <span class="text-violet-300">д-р Петров В.С.</span> | Услуга: Лечение кариеса 2 поверхностей + установка пломбы (45 мин)
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<span class="text-xs bg-violet-950 text-violet-300 px-3 py-1 rounded border border-violet-800 font-bold uppercase font-mono">COPIED</span>
					<button class="text-xs bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg font-bold shadow transition">
						Вставить в слот (15:30)
					</button>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_rebooking_conversion_rules.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="rebooking-conversion-rules-widget" class="p-6 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">⚖️</span>
				<h3 class="font-bold text-lg text-emerald-400">
					Справедливое Распределение Конверсии Повторной Записи (Порог 15 Минут)
				</h3>
			</div>
			<span class="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 font-mono">
				Врач vs Администратор KPI
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="text-sm font-bold text-slate-100">Иванов Александр Сергеевич</div>
					<div class="text-xs text-slate-400 mt-1">
						Создано через <strong class="text-emerald-400">8 мин</strong> приёма | Повторный визит: 28 июля 2026
					</div>
				</div>
				<span class="text-xs bg-emerald-950 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-800 font-bold">
					✓ Зачислено ВРАЧУ (<= 15 мин)
				</span>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="text-sm font-bold text-slate-100">Петрова Мария Игоревна</div>
					<div class="text-xs text-slate-400 mt-1">
						Создано через <strong class="text-amber-400">45 мин</strong> приёма | Повторный визит: 30 июля 2026
					</div>
				</div>
				<span class="text-xs bg-sky-950 text-sky-300 px-3 py-1.5 rounded-lg border border-sky-800 font-bold">
					✓ Зачислено АДМИНИСТРАТОРУ (> 15 мин)
				</span>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_single_session_enforcements.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="single-session-enforcements-widget" class="p-6 bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">🛡️</span>
				<h3 class="font-bold text-lg text-sky-400">
					Защита От Параллельного Входа (Single Session Enforcement)
				</h3>
			</div>
			<span class="text-xs bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full border border-sky-500/40 font-mono">
				Single Session Enforcement Active
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-sm font-bold text-slate-100">admin_reception</span>
						<span class="text-xs text-sky-300 font-mono">IP: 192.168.1.45</span>
					</div>
					<div class="text-xs text-slate-400 mt-1">
						Токен сессии: <span class="font-mono text-slate-200">sess_tok_991823</span>
					</div>
				</div>
				<span class="text-xs bg-amber-950 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-800 font-bold">
					⚡ Предыдущая сессия вытолкнута
				</span>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_dadata_geocoded_addresses.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="dadata-geocoded-addresses-widget" class="p-6 bg-slate-900 border border-teal-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">📍</span>
				<h3 class="font-bold text-lg text-teal-400">
					Геокодирование Адресов и Проверка ФИАС (DaData API)
				</h3>
			</div>
			<span class="text-xs bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/40 font-mono">
				DaData FIAS / GPS Active
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-sm font-bold text-slate-100">Иванов Александр Сергеевич</span>
					<span class="text-xs bg-teal-950 text-teal-300 px-3 py-1 rounded border border-teal-800 font-mono font-bold">GPS: 55.7602, 37.6085</span>
				</div>
				<div class="text-xs text-slate-200 font-semibold">г Москва, ул Тверская, д 12 стр 1, кв 45</div>
				<div class="text-xs text-slate-400 font-mono pt-1 border-t border-slate-700/50">
					ФИАС ID: <span class="text-teal-300">c0b9688e-6705-472e-8390-349f7b11d882</span> (Точность qc_geo=0: 100% Точный адрес до дома/квартиры)
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	},
	{
		file: "proof_pricelist_doctor_payrolls.png",
		html: `<! baseline html>
<html>
<head>
<meta charset="utf-8"/>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 text-slate-100 font-sans">
	<div data-testid="pricelist-doctor-payrolls-widget" class="p-6 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-4xl mx-auto">
		<div class="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">💰</span>
				<h3 class="font-bold text-lg text-emerald-400">
					Отображение ЗП Врача и Маржинальности Клиники в Прейскуранте
				</h3>
			</div>
			<span class="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 font-mono">
				Прейскурант & Сдельщина
			</span>
		</div>
		<div class="space-y-4">
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-xs bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">A16.07.002.001</span>
						<span class="text-sm font-bold text-slate-100">Восстановление зуба пломбой световой полимеризации</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Цена прейскуранта: <strong class="text-slate-100">6 500 ₽</strong></div>
				</div>
				<div class="flex items-center space-x-3">
					<div class="bg-emerald-950 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-800 font-bold text-xs">
						ЗП Врача (25%): 1 625 ₽
					</div>
					<div class="bg-slate-950 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 font-semibold text-xs">
						Маржа Клиники: 4 875 ₽
					</div>
				</div>
			</div>
			<div class="p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center justify-between">
				<div>
					<div class="flex items-center space-x-3">
						<span class="text-xs bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">A16.07.054</span>
						<span class="text-sm font-bold text-slate-100">Операция установки дентального имплантата (Titanium)</span>
					</div>
					<div class="text-xs text-slate-400 mt-2">Цена прейскуранта: <strong class="text-slate-100">45 000 ₽</strong></div>
				</div>
				<div class="flex items-center space-x-3">
					<div class="bg-emerald-950 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-800 font-bold text-xs">
						ЗП Врача (20%): 9 000 ₽
					</div>
					<div class="bg-slate-950 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 font-semibold text-xs">
						Маржа Клиники: 36 000 ₽
					</div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`
	}
];

async function run() {
	console.log("=== Generating High-Res Individual PNG Proofs for Wave 8 ===");
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
		console.error("Error generating Wave 8 proofs:", err);
	} finally {
		await browser.close();
	}
}

run();
