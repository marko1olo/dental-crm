// Проверка храповика и кода 2 у трёх стражей класса REAL. Песочница sb3, продукт не тронут.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SB = "C:/Users/Admin/AppData/Local/Temp/rev-OO4/sb3";
const FILES = {
	app: `${SB}/apps/web/src/useAppLogic.tsx`,
	vv: `${SB}/apps/web/src/VisitView.tsx`,
};
const ORIG = Object.fromEntries(
	Object.entries(FILES).map(([k, p]) => [k, readFileSync(p, "utf8")]),
);
const restore = () => {
	for (const [k, p] of Object.entries(FILES)) writeFileSync(p, ORIG[k]);
};
function run(g) {
	try {
		execFileSync(process.execPath, [`scripts/${g}.mjs`], {
			cwd: SB,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { code: 0, out: "" };
	} catch (e) {
		return { code: e.status ?? -1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
	}
}

const CASES = [
	{
		g: "smoke-speech-recorder-resilience-source",
		file: "app",
		id: "R3 ХРАПОВИК: возвращена configureServerVoiceRecorder (долг закрыт)",
		inject: "\nfunction configureServerVoiceRecorder(a, b, c) {}\n",
	},
	{
		g: "smoke-speech-recorder-resilience-source",
		file: "app",
		id: "R4 НОВАЯ РЕГРЕССИЯ: старт микрофона снова ЖДЁТ статус шлюза",
		anchorInsertAfter: "async function startServerVoiceRecording()",
		inject: "\n\t\tawait loadSpeechGatewayStatus({ silent: true })\n",
		wantCode: 2,
	},
	{
		g: "smoke-speech-final-ready-status-source",
		file: "app",
		id: "F2 ХРАПОВИК: возвращён флаг распознанного текста",
		inject: "\nconst speechRecordingHadRecognizedTextRef = useRef(false);\n",
	},
	{
		g: "smoke-speech-final-ready-status-source",
		file: "app",
		id: "F3 ХРАПОВИК: возвращена диагностика микрофона на стопе",
		inject: "\nconst speechRecordingVoiceLevelAvailableAtStopRef = useRef(false);\n",
	},
	{
		g: "smoke-visit-dictation-simplified-actions-source",
		file: "vv",
		id: "D2 ХРАПОВИК: возвращён шлюз обработки текста",
		inject:
			"\nconst showDictationProcessingActions = hasVisitTranscriptText && !speechVoiceWorkBusy;\n",
	},
	{
		g: "smoke-visit-dictation-simplified-actions-source",
		file: "vv",
		id: "D3 ХРАПОВИК: возвращена карточка очереди аудио",
		inject:
			"\nconst showPendingSpeechQueueCard = pendingSpeechChunkCount > 0 && !speechTranscriptionBusy;\n",
	},
];

restore();
for (const g of [
	"smoke-speech-recorder-resilience-source",
	"smoke-speech-final-ready-status-source",
	"smoke-visit-dictation-simplified-actions-source",
]) {
	console.log(`BASELINE ${g} exit=${run(g).code}`);
}
console.log("");
for (const c of CASES) {
	restore();
	const p = FILES[c.file];
	let s = readFileSync(p, "utf8");
	if (c.anchorInsertAfter) {
		if (!s.includes(c.anchorInsertAfter)) {
			console.log(`NOOP   ${c.id} :: якоря нет`);
			continue;
		}
		s = s.replace(c.anchorInsertAfter, c.anchorInsertAfter + c.inject);
	} else {
		s = s + c.inject;
	}
	writeFileSync(p, s);
	const r = run(c.g);
	const want = c.wantCode ?? 2;
	const label =
		r.code === want ? `BITE(${r.code})` : r.code === 0 ? "MISS(0)" : `code=${r.code}`;
	const hit =
		(r.out.match(/(ДОЛГ ЗАКРЫТ по \d+|Долг закрыт по \d+|СЛОМАН ЖИВОЙ ЛОК \(\d+\)|РЕЕСТР РАЗОШ[^\s(]* С ПРОВЕРКАМИ \(\d+\))/) ??
			[, "—"])[1];
	console.log(`${label} ${c.id} :: exit=${r.code} ждали=${want} :: ${hit}`);
}
restore();
console.log("");
for (const g of [
	"smoke-speech-recorder-resilience-source",
	"smoke-speech-final-ready-status-source",
	"smoke-visit-dictation-simplified-actions-source",
]) {
	console.log(`восстановление ${g} exit=${run(g).code}`);
}
