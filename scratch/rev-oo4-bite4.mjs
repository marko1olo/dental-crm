// Третий заход: НЕОЦЕНИМО не имеет храповика? И остался ли вырожденный indexOf>indexOf?
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SB = "C:/Users/Admin/AppData/Local/Temp/rev-OO4/sb3";
const APP = `${SB}/apps/web/src/useAppLogic.tsx`;
const ORIG = readFileSync(APP, "utf8");
const restore = () => writeFileSync(APP, ORIG);
function run(g) {
	try {
		const out = execFileSync(process.execPath, [`scripts/${g}.mjs`], {
			cwd: SB,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { code: 0, out };
	} catch (e) {
		return { code: e.status ?? -1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
	}
}
const G = "smoke-speech-recorder-resilience-source";

function probe(id, transform, expectNote) {
	restore();
	const s = transform(ORIG);
	if (s === ORIG) {
		console.log(`NOOP   ${id}`);
		return;
	}
	writeFileSync(APP, s);
	const r = run(G);
	const summary = (r.out.match(/ИТОГ:[^\n]*/) ?? [, "—"])[0];
	const broken = (r.out.match(/СЛОМАН ЖИВОЙ ЛОК \((\d+)\)/) ?? [, "0"])[1];
	console.log(`exit=${r.code} broken=${broken} :: ${id}`);
	console.log(`        ${summary}`);
	if (expectNote) console.log(`        ${expectNote}`);
}

restore();
console.log(`BASELINE exit=${run(G).code} :: ${(run(G).out.match(/ИТОГ:[^\n]*/) ?? [, ""])[0]}`);
console.log("");

// 1. Сначала СОЗДАЁМ живой лок кода 2 — чтобы было что терять.
//    R4 уже показал: `await loadSpeechGatewayStatus` в startBlock => код 2.
probe(
	"A. Регрессия внутри блока старта (контроль): должно быть 2",
	(s) =>
		s.replace(
			"async function startServerVoiceRecording()",
			"async function startServerVoiceRecording()\n\t\tawait loadSpeechGatewayStatus({ silent: true })\n",
		),
	"контрольный случай",
);

// 2. Та же регрессия + СНОС ГРАНИЦЫ БЛОКА. Живой лок исчезает в «неоценимо».
probe(
	"B. Та же регрессия, но границу блока снесли (переименовали stopServerVoiceRecording)",
	(s) =>
		s
			.replace(
				"async function startServerVoiceRecording()",
				"async function startServerVoiceRecording()\n\t\tawait loadSpeechGatewayStatus({ silent: true })\n",
			)
			.split("function stopServerVoiceRecording()")
			.join("function stopServerVoiceRecordingRenamed()"),
	"если exit упал с 2 до 1 — НЕОЦЕНИМО глотает новую регрессию",
);

// 3. Вырожденный indexOf>indexOf: блок recorder.onstop существует как ПУСТАЯ строка.
probe(
	"C. recorderStopBlock станет пустой строкой (не null): проверка порядка вырождается",
	(s) =>
		s
			.replace(
				"async function startServerVoiceRecording()",
				"async function startServerVoiceRecording()\n\t\tawait loadSpeechGatewayStatus({ silent: true })\n",
			)
			.replace(
				"function configureServerVoiceRecorderX(",
				"function configureServerVoiceRecorderX(",
			),
	"нужен живой configureServerVoiceRecorder — в продукте его нет, случай нерепродуцируем сегодня",
);

restore();
console.log("");
console.log(`восстановление exit=${run(G).code}`);
