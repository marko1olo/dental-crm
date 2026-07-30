// Scratch: decode cp1252-misread UTF-8 (mojibake) back to original Russian.
// Writes UTF-8 output to a file so terminal codepage cannot mangle it.
import { writeFileSync } from "node:fs";

const samples = {
	"smoke-document-issue-chains.mjs:498":
		"Ð´Ð¾Ð²ÐµÑ€ÐµÐ½Ð½Ð¾Ðµ Ð»Ð¸Ñ†Ð¾ Ð±ÐµÐ· ÑÐ¾Ð²Ð¿Ð°Ð´Ð°ÑŽÑ‰ÐµÐ³Ð¾ Ð·Ð°Ð¿Ñ€Ð¾ÑÐ°",
	"smoke-patient-forms-lifecycle.mjs:335":
		"ÐžÑ‚Ð¼ÐµÑ‚ÐºÐ° Ð¾ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ°Ð½Ð¸Ð¸",
	"smoke-tax-knd-xml.mjs:999": 'ÐšÐ¾Ð´ÐÐž="7777"',
};

const lines = [];
for (const [where, broken] of Object.entries(samples)) {
	// Reverse the corruption: the characters are cp1252 renderings of UTF-8 bytes.
	const bytes = Buffer.from(broken, "latin1");
	const repaired = bytes.toString("utf8");
	const roundTrip = Buffer.from(repaired, "utf8").toString("latin1") === broken;
	lines.push(
		`${where}\n  broken   : ${broken}\n  repaired : ${repaired}\n  lossless : ${roundTrip}\n`,
	);
}

writeFileSync("scratch/decode-mojibake.out.txt", lines.join("\n"), "utf8");
console.log("written");
