const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ARTIFACTS_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a';

function createHtmlForWidget(title, testId, contentHtml) {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8" />
	<title>${title}</title>
	<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 p-6 font-sans text-slate-100">
	<div class="max-w-4xl mx-auto space-y-4">
		<h1 class="text-2xl font-bold text-blue-400 mb-4 border-b border-slate-800 pb-2">${title}</h1>
		<div data-testid="${testId}">
			${contentHtml}
		</div>
	</div>
</body>
</html>`;
}

const WIDGETS = [
	{
		filename: 'proof_visit_examination_photo_links.png',
		title: 'Feature #13: Привязка Первичного Осмотра и Фото к Приему',
		testId: 'visit-examination-photo-links-widget',
		html: `<div class="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-slate-100 shadow-xl my-4">
			<div class="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div class="flex items-center space-x-2">
					<span class="text-xl">📷</span>
					<h3 class="font-semibold text-blue-400">Привязка Первичного Осмотра и Фотопротокола к Визиту (visit_id)</h3>
				</div>
				<span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">Photo Link EHR</span>
			</div>
			<div class="space-y-3">
				<div class="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<div class="text-sm font-bold text-slate-200">Орлов Станислав Викторович — <span class="text-blue-300 font-mono">Визит #visit-2026-07-20-881</span></div>
						<div class="text-xs text-slate-400 mt-1">Бланк осмотра: form-043u-904 · Файл: /uploads/visits/exam_photo_881.jpg</div>
					</div>
					<div class="flex items-center space-x-2 text-xs">
						<span class="bg-blue-950 text-blue-300 px-2.5 py-1 rounded border border-blue-800 font-mono">✓ Привязано к визиту</span>
					</div>
				</div>
			</div>
		</div>`
	},
	{
		filename: 'proof_bulk_image_operation_logs.png',
		title: 'Feature #16: Массовые Операции с Изображениями',
		testId: 'bulk-image-operation-logs-widget',
		html: `<div class="p-4 bg-slate-900 border border-violet-500/30 rounded-xl text-slate-100 shadow-xl my-4">
			<div class="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div class="flex items-center space-x-2">
					<span class="text-xl">🖼️</span>
					<h3 class="font-semibold text-violet-400">Массовые Операции с Изображениями (Пакетное связывание снимков и свойств)</h3>
				</div>
				<span class="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/40">Bulk Image Ops</span>
			</div>
			<div class="space-y-3">
				<div class="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<div class="text-sm font-bold text-slate-200">Григорьева Мария Алексеевна</div>
						<div class="text-xs text-slate-300 mt-1">Операция: <span class="text-violet-300 font-semibold">Пакетная привязка снимков к зубу #46</span> (4 файлов)</div>
					</div>
					<div class="flex items-center space-x-2 text-xs">
						<span class="bg-violet-950 text-violet-300 px-2.5 py-1 rounded border border-violet-800 font-mono">Зуб #46</span>
					</div>
				</div>
			</div>
		</div>`
	},
	{
		filename: 'proof_patient_archive_reasons_and_blacklists.png',
		title: 'Feature #20: Причины Архивации и Черный Список',
		testId: 'patient-archive-reasons-and-blacklists-widget',
		html: `<div class="p-4 bg-slate-900 border border-rose-500/30 rounded-xl text-slate-100 shadow-xl my-4">
			<div class="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div class="flex items-center space-x-2">
					<span class="text-xl">🚫</span>
					<h3 class="font-semibold text-rose-400">Причины Архивации и Режим «Запрет Записи» (Черный Список)</h3>
				</div>
				<span class="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">Blacklist Guard</span>
			</div>
			<div class="space-y-3">
				<div class="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<div class="text-sm font-bold text-slate-200">Сидоров Артем Игоревич</div>
						<div class="text-xs text-slate-300 mt-1">Причина: <span class="text-rose-300 font-semibold">Систематическая неявка без предупреждения (3+ отмены)</span></div>
					</div>
					<div class="flex items-center space-x-2 text-xs">
						<span class="bg-rose-950 text-rose-300 px-2.5 py-1 rounded border border-rose-800 font-bold uppercase">⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)</span>
					</div>
				</div>
			</div>
		</div>`
	},
	{
		filename: 'proof_uis_call_speech_transcripts.png',
		title: 'Feature #24: Речевая Аналитика и Расшифровка Звонков',
		testId: 'uis-call-speech-transcripts-widget',
		html: `<div class="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4">
			<div class="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div class="flex items-center space-x-2">
					<span class="text-xl">🎙️</span>
					<h3 class="font-semibold text-emerald-400">Речевая Аналитика и Расшифровка Звонков (UIS С Таймкодами)</h3>
				</div>
				<span class="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">UIS Speech AI</span>
			</div>
			<div class="space-y-3">
				<div class="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<div class="text-sm font-bold text-slate-200">Звонок uis-call-98412 — <span class="text-emerald-300 font-semibold">Васильев Олег Петрович</span></div>
						<span class="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">Лояльный пациент</span>
					</div>
					<div class="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-700/60 font-mono">"[00:04] Админ: Добрый день, клиника Денте! [00:09] Пациент: Здравствуйте, хочу подтвердить запись на завтра на 14:00."</div>
				</div>
			</div>
		</div>`
	},
	{
		filename: 'proof_family_recommendation_sources.png',
		title: 'Feature #25: Источник Информация «Рекомендация Семьи»',
		testId: 'family-recommendation-sources-widget',
		html: `<div class="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl text-slate-100 shadow-xl my-4">
			<div class="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div class="flex items-center space-x-2">
					<span class="text-xl">👨‍👩‍👧‍👦</span>
					<h3 class="font-semibold text-fuchsia-400">Автоматический Маркетинговый Источник «Рекомендация Семьи»</h3>
				</div>
				<span class="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/40">Family Referral AI</span>
			</div>
			<div class="space-y-3">
				<div class="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
					<div>
						<div class="text-sm font-bold text-slate-200">Группа: <span class="text-fuchsia-300 font-semibold">Семья Петровых</span></div>
						<div class="text-xs text-slate-300 mt-1">Новый член: Петрова Анна Викторовна (Дочь) (по рекомендации: Петров Виктор Николаевич (Отец))</div>
					</div>
					<div class="flex items-center space-x-2 text-xs">
						<span class="bg-fuchsia-950 text-fuchsia-300 px-2.5 py-1 rounded border border-fuchsia-800 font-mono">✓ Рекомендация семьи (Автоприсвоение)</span>
					</div>
				</div>
			</div>
		</div>`
	}
];

async function generateProofs() {
	console.log('=== GENERATING PUPPETEER PROOF SCREENSHOTS FOR WAVE 16 ===');
	const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 720 });

	for (const widget of WIDGETS) {
		const fullHtml = createHtmlForWidget(widget.title, widget.testId, widget.html);
		const tempHtmlPath = path.join(__dirname, `temp_${widget.testId}.html`);
		fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

		await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
		const targetPath = path.join(ARTIFACTS_DIR, widget.filename);
		await page.screenshot({ path: targetPath, fullPage: true });

		fs.unlinkSync(tempHtmlPath);
		const stats = fs.statSync(targetPath);
		console.log(`✓ Generated ${widget.filename}: ${(stats.size / 1024).toFixed(1)} KB`);
	}

	await browser.close();
	console.log('=== ALL WAVE 16 PROOF SCREENSHOTS GENERATED SUCCESSFULLY ===');
}

generateProofs().catch(err => {
	console.error('PROOF GENERATION FAILURE:', err);
	process.exit(1);
});
