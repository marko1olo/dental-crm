// Ищем ТИХО СНЯТЫЕ требования: строковые литералы стража ДО, которых нет ПОСЛЕ.
import { execFileSync } from "node:child_process";

const GUARDS = [
	["smoke-speech-queue-source", "fec195234"],
	["smoke-speech-recorder-resilience-source", "6f157084c"],
	["smoke-speech-final-ready-status-source", "6f157084c"],
	["smoke-visit-dictation-simplified-actions-source", "6f157084c"],
];
const show = (rev, p) =>
	execFileSync("git", ["show", `${rev}:${p}`], {
		encoding: "utf8",
		maxBuffer: 1 << 26,
	});

// Литералы: "..." и '...' и `...`, без комментариев.
function literals(src) {
	const noComments = src
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");
	const out = new Set();
	const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
	let m;
	while ((m = re.exec(noComments))) {
		const v = m[1] ?? m[2] ?? m[3];
		if (v && v.length >= 20) out.add(v);
	}
	return out;
}

for (const [g, rev] of GUARDS) {
	const p = `scripts/${g}.mjs`;
	const before = literals(show(`${rev}^`, p));
	const after = literals(show("HEAD", p));
	const lost = [...before].filter((l) => !after.has(l));
	console.log(`=== ${g} :: литералов ДО ${before.size}, ПОСЛЕ ${after.size}, ПРОПАЛО ${lost.length}`);
	for (const l of lost) console.log(`   LOST: ${JSON.stringify(l).slice(0, 190)}`);
	console.log("");
}
