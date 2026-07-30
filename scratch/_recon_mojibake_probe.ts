// Read-only probe: does repairMojibakeText() actually repair the strings that
// routes/documents/pdf.ts hands to apiError()? Those strings are the DOUBLE
// cp1252-encoded variant (leading byte renders as Cyrillic "Р"), not the single
// round variant (leading byte renders as Latin "Ð").
import { repairMojibakeText } from "../apps/api/src/text/repairMojibake.js";

const cases: Array<[string, string]> = [
	// Exact literals copied from apps/api/src/routes/documents/pdf.ts
	["pdf.ts:74 / :120", "Р”РѕРєСѓРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"],
	["pdf.ts:77", "PDF РЅРµРґРѕСЃС‚СѓРїРµРЅ: РґРѕРєСѓРјРµРЅС‚ РЅРµ С‚СЂРµР±СѓРµС‚ Р°СЂС…РёРІР° РІС‹РґР°РЅРЅРѕРіРѕ HTML."],
	["pdf.ts:80", "PDF РЅРµРґРѕСЃС‚СѓРїРµРЅ: С‚СЂРµР±СѓРµС‚СЃСЏ РѕС‚РјРµС‚РєР° Рѕ РїРѕРґРїРёСЃР°РЅРёРё РїСЂРё РІС‹РґР°С‡Рµ РґРѕРєСѓРјРµРЅС‚Р°."],
	["pdf.ts:89", "РђСЂС…РёРІ РІС‹РґР°РЅРЅРѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р° РЅРµ РїСЂРѕС€С‘Р» РїСЂРѕРІРµСЂРєСѓ С†РµР»РѕСЃС‚РЅРѕСЃС‚Рё."],
	["pdf.ts:161", "РџР°С†РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"],
	// Control: the SINGLE round variant, which the repair function is built for.
	["control single-round", "Ð”Ð¾ÐºÑÐ¼ÐµÐ½Ñ"],
];

let broken = 0;
for (const [where, raw] of cases) {
	const repaired = repairMojibakeText(raw);
	const changed = repaired !== raw;
	// Is the OUTPUT still garbage? A clean Russian sentence has no cp1252
	// artefacts and no bare-Cyrillic-letter-followed-by-punctuation runs.
	const stillGarbled = /[Ѐ-ӿ][-ÿ–—‘-„†-•…‰‹›ŒœŠšŸŽžƒˆ˜€™]/.test(
		repaired,
	);
	if (stillGarbled) broken++;
	console.log(
		[
			`WHERE      : ${where}`,
			`INPUT      : ${raw}`,
			`AFTER FIX  : ${repaired}`,
			`CHANGED    : ${changed}`,
			`STILL GARB : ${stillGarbled}`,
			"",
		].join("\n"),
	);
}
console.log(`SUMMARY: ${broken} of ${cases.length} cases remain garbled after repairMojibakeText().`);
