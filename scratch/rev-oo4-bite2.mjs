// Второй заход: враждебные мутации, нацеленные ИМЕННО в ослабленные образцы
// (то, что исполнитель заменил на RegExp), и в храповик долга.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SB = "C:/Users/Admin/AppData/Local/Temp/rev-OO4/sandbox";
const P = `${SB}/apps/web/src/hooks/domains/useVisitLogic.ts`;
const ORIG = readFileSync(P, "utf8");
const restore = () => writeFileSync(P, ORIG);
function run() {
	try {
		const out = execFileSync(process.execPath, ["scripts/smoke-speech-queue-source.mjs"], {
			cwd: SB,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { code: 0, out };
	} catch (e) {
		return { code: e.status ?? -1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
	}
}

const CASES = [
	{
		id: "M12 вердикт сравнивает с ДРУГИМ полем через ГОЛЫЙ идентификатор",
		from: "const activeVisitId = dashboard?.activeVisit?.id;",
		to: "const activeVisitId = dashboard?.activeVisit?.id;\n\t\t\tconst compareId = dashboard?.activeVisit?.patientId;",
		then: {
			from: "return result.chunk.visitId === activeVisitId;",
			to: "return result.chunk.visitId === compareId;",
		},
	},
	{
		id: "M13 защита обёрнута в фигурные скобки (безопасный рефакторинг)",
		from: "if (speechTranscriptionMatchesActiveVisit(result))\n\t\t\t\t\tflushedRecordingIds.add(item.recordingId);",
		to: "if (speechTranscriptionMatchesActiveVisit(result)) {\n\t\t\t\t\tflushedRecordingIds.add(item.recordingId);\n\t\t\t\t}",
	},
	{
		id: "M14 ЗАКРЫТИЕ ДОЛГА: возвращён один маркер из реестра (храповик вниз)",
		from: "const activeVisitId = dashboard?.activeVisit?.id;",
		to: "const activeVisitId = dashboard?.activeVisit?.id;\n\t\t\t// const failureDetail = operatorReadableErrorDetailFromUnknown(speechError);",
	},
	{
		id: "M15 удержание аудио проверяет ДРУГОЕ поле (не audioBase64)",
		from: "Boolean(item.audioBase64?.trim()),",
		to: "Boolean(item.recordingId?.trim()),",
	},
	{
		id: "M16 recovery шлёт visitId из другого источника (голый идентификатор)",
		from: 'params.set("visitId", dashboard?.activeVisit?.id);',
		to: 'params.set("visitId", String(activeVisitIdForRecovery));',
		pre: {
			from: "const params = new URLSearchParams();",
			to: "const params = new URLSearchParams();\n\t\t\tconst activeVisitIdForRecovery = dashboard?.activeVisit?.patientId;",
		},
	},
];

restore();
console.log(`BASELINE exit=${run().code}`);
console.log("");
for (const c of CASES) {
	restore();
	let s = readFileSync(P, "utf8");
	const steps = [c.pre, { from: c.from, to: c.to }, c.then].filter(Boolean);
	let ok = true;
	for (const st of steps) {
		if (!s.includes(st.from)) {
			console.log(`NOOP   ${c.id} :: не найдено: ${st.from.slice(0, 70)}`);
			ok = false;
			break;
		}
		s = s.split(st.from).join(st.to);
	}
	if (!ok) continue;
	writeFileSync(P, s);
	const r = run();
	const msg = (r.out.match(/Error: ([^\n]*)/) ?? [, r.out.trim().slice(0, 160)])[1];
	const syntax = /SyntaxError/.test(r.out);
	const tag = syntax ? "SYNTAX" : r.code !== 0 ? "BITE  " : "MISS  ";
	console.log(`${tag} ${c.id} :: exit=${r.code} :: ${String(msg).slice(0, 210)}`);
}
restore();
console.log("");
console.log(`восстановление exit=${run().code}`);
