// Ревьюерский стенд биты для OO4. Продукт НЕ трогается: мутируется файл в песочнице
// /tmp/rev-OO4/sandbox, настоящий страж запускается с cwd песочницы.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SB = "C:/Users/Admin/AppData/Local/Temp/rev-OO4/sandbox";
const TARGETS = {
	visit: `${SB}/apps/web/src/hooks/domains/useVisitLogic.ts`,
	app: `${SB}/apps/web/src/useAppLogic.tsx`,
};
const ORIG = Object.fromEntries(
	Object.entries(TARGETS).map(([k, p]) => [k, readFileSync(p, "utf8")]),
);

function restore() {
	for (const [k, p] of Object.entries(TARGETS)) writeFileSync(p, ORIG[k]);
}

function run() {
	try {
		const out = execFileSync(
			process.execPath,
			["scripts/smoke-speech-queue-source.mjs"],
			{ cwd: SB, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
		);
		return { code: 0, out };
	} catch (e) {
		return {
			code: e.status ?? -1,
			out: String(e.stdout ?? "") + String(e.stderr ?? ""),
		};
	}
}

const MUTATIONS = [
	// --- четыре мутации, ОПУБЛИКОВАННЫЕ исполнителем ---
	{
		id: "M1(его) вердикт всегда true",
		file: "visit",
		from: "return result.chunk.visitId === activeVisitId;",
		to: "return true;",
	},
	{
		id: "M2(его) безусловная сборка очереди",
		file: "visit",
		from:
			"if (speechTranscriptionMatchesActiveVisit(result))\n\t\t\t\t\tflushedRecordingIds.add(item.recordingId);",
		to: "flushedRecordingIds.add(item.recordingId);",
	},
	{
		id: "M3(его) recovery по patientId вместо visitId",
		file: "visit",
		from: 'params.set("visitId", dashboard?.activeVisit?.id);',
		to: 'params.set("visitId", dashboard?.activeVisit?.patientId);',
	},
	{
		id: "M4(его) some -> every в удержании аудио",
		file: "visit",
		from: "const hasAudioWaitingForServer = queue.some((item) =>",
		to: "const hasAudioWaitingForServer = queue.every((item) =>",
	},
	// --- мои собственные, враждебные ---
	{
		id: "M5(мой) сравнение с ЧУЖИМ полем через новую переменную",
		file: "visit",
		from: "return result.chunk.visitId === activeVisitId;",
		to: "return result.chunk.visitId === (dashboard?.activeVisit?.patientId ?? activeVisitId);",
	},
	{
		id: "M6(мой) не-visit фрагмент теперь ОТБРАСЫВАЕТСЯ (полярность)",
		file: "visit",
		from: 'if (result.chunk.source !== "visit") return true;',
		to: 'if (result.chunk.source !== "visit") return false;',
	},
	{
		id: "M7(мой) снят вызов стража перед добавлением текста",
		file: "visit",
		from: "if (!speechTranscriptionMatchesActiveVisit(result))",
		to: "if (false && !speechTranscriptionMatchesActiveVisit(result))",
	},
	{
		id: "M8(мой) ранний выход recovery потерял patientId",
		file: "visit",
		from: "!dashboard?.activeVisit?.patientId",
		to: "false",
	},
	{
		id: "M9(мой) полярность неизвестного visitId перевёрнута",
		file: "visit",
		from: "if (!result.chunk.visitId || !activeVisitId) return",
		to: "if (!result.chunk.visitId || !activeVisitId) return !!",
	},
	{
		id: "M10(мой) второе безусловное добавление рядом с защищённым",
		file: "visit",
		from: "if (speechTranscriptionMatchesActiveVisit(result))\n\t\t\t\t\tflushedRecordingIds.add(item.recordingId);",
		to: "if (speechTranscriptionMatchesActiveVisit(result))\n\t\t\t\t\tflushedRecordingIds.add(item.recordingId);\n\t\t\t\tflushedRecordingIds.add(item.recordingId);",
	},
	{
		id: "M11(мой) человеческий отказ заменён жаргоном STT",
		file: "visit",
		from: "относится к другому приему и не добавлен",
		to: "STT-фрагмент синхронизирован",
	},
];

restore();
const base = run();
console.log(`BASELINE exit=${base.code} ${base.out.trim().slice(0, 200)}`);
console.log("");
let bit = 0;
let missed = 0;
let noop = 0;
for (const m of MUTATIONS) {
	restore();
	const p = TARGETS[m.file];
	const before = readFileSync(p, "utf8");
	const occurrences = before.split(m.from).length - 1;
	if (occurrences === 0) {
		console.log(`NOOP   ${m.id} :: строки нет в источнике, мутация фиктивная`);
		noop += 1;
		continue;
	}
	writeFileSync(p, before.split(m.from).join(m.to));
	const after = readFileSync(p, "utf8");
	if (after === before) {
		console.log(`NOOP   ${m.id} :: байты не изменились`);
		noop += 1;
		continue;
	}
	const r = run();
	const first = r.out
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("at ") && !l.startsWith("file:") && !/^\^+$/.test(l) && !l.startsWith("Node.js v"))
		.slice(0, 3)
		.join(" / ");
	const syntax = /SyntaxError/.test(r.out);
	if (r.code !== 0 && !syntax) {
		console.log(`BITE   ${m.id} :: exit=${r.code} вхождений=${occurrences} :: ${first.slice(0, 260)}`);
		bit += 1;
	} else if (syntax) {
		console.log(`SYNTAX ${m.id} :: краснеет НЕ поведением, а разбором — доказательством не считается`);
		missed += 1;
	} else {
		console.log(`MISS   ${m.id} :: exit=0 ЗЕЛЁНЫЙ на дефекте :: ${first.slice(0, 200)}`);
		missed += 1;
	}
}
restore();
const post = run();
console.log("");
console.log(`ИТОГ: bite=${bit} miss=${missed} noop=${noop}; восстановление exit=${post.code}`);
