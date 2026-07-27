/**
 * Показывает, во что превращается диктовка на каждом шаге разбора:
 * после textToNumbers, после normalizeDentalSlang, и как режется на
 * фразы. Нужно, чтобы понять, почему «пульпит» не даёт состояние
 * лечения.
 */
import { textToNumbers, normalizeDentalSlang } from "../apps/web/src/lib/stringUtils.ts";
import { parseVisitDictationLocal } from "../apps/web/src/lib/smartVisitParser.ts";

const CASES = [
	"36 зуб пульпит",
	"11 зуб кариес",
	"45 зуб периодонтит",
	"жалобы на боли при накусывании. 45 зуб периодонтит, сделали рентген.",
	"36 зуб кариес, лечим 36 зуб",
	"36 зуб кариес, удалили 36 зуб",
];

for (const c of CASES) {
	const afterNumbers = textToNumbers(c);
	const afterSlang = normalizeDentalSlang(afterNumbers);
	console.log(`\nвход:            «${c}»`);
	console.log(`  после чисел:   «${afterNumbers}»`);
	console.log(`  после сленга:  «${afterSlang}»`);
	console.log(`  фразы:         ${JSON.stringify(afterSlang.split(/[.,;!?]/).map((x) => x.trim()).filter(Boolean))}`);
	console.log(`  результат:     ${JSON.stringify(parseVisitDictationLocal(c))}`);
}
