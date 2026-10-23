/**
 * packages/shared/src/pricelist/order804n/order804nStemmer.ts
 * Layer 2: Lightweight Russian Stemmer & Tokenizer for Clinical Service Nomenclature.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 2 domain logic without DOM or network dependencies.
 */

/**
 * Lightweight Russian stemmer heuristic for clinical service names.
 */
export function stemCyrillicWord(word: string): string {
	const w = word.toLowerCase().trim();
	if (w.length < 4) return w;
	return w
		.replace(/(?:ого|его|ому|ему|ыми|ими|ых|их|ую|юю|ая|яя|ое|ее|ый|ий|ой|ей)$/, "")
		.replace(/(?:овать|евать|ивать|ывать)$/, "")
		.replace(/(?:ование|евание|ация|яция|ение|яние|ость|есть)$/, "")
		.replace(/(?:ическ|еск|ческ|ск)$/, "")
		.replace(/(?:ов|ев|ам|ям|ах|ях|ом|ем|ами|ями)$/, "")
		.replace(/(?:а|я|о|е|ы|и|у|ю|ь|ъ)$/, "");
}

/**
 * Tokenizes text and stems words for clinical lexical matching.
 */
export function tokenizeAndStem(text: string): readonly string[] {
	return (text || "")
		.toLowerCase()
		.split(/[\s,.;:!?()«»""'’\/\-\+\[\]]+/)
		.filter((w) => w.length >= 3)
		.map(stemCyrillicWord);
}
