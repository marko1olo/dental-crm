/**
 * apps/api/src/documents/moneyWordsRu.ts
 *
 * Facade re-exporting canonical money words utilities from @dental/shared per Mandate 8s.
 */

export {
	moneyToWordsRu,
	kopecksToWordsRu,
	rublesToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	integerToWordsRu,
	getDeclension,
	RUBLE_FORMS,
	KOPECK_FORMS,
	THOUSAND_FORMS,
	MILLION_FORMS,
	BILLION_FORMS,
	type WordDeclension,
} from "@dental/shared";
