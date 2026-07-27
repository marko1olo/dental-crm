/*
 * Mojibake detection shared by the encoding smoke check and its own probe.
 *
 * Mojibake comes in two families, and only one of them used to be checked.
 *
 * Family 1: UTF-8 decoded as Latin-1 / CP1252. Bytes surface as the Latin
 * letters A-tilde, A-circumflex, D-stroke, N-tilde, a-circumflex. The old
 * pattern caught exactly this family and nothing else.
 *
 * Family 2: UTF-8 decoded as CP1251. The very same bytes surface as
 * CYRILLIC letters, so the old pattern never saw them:
 *   U+00B7 middle dot  (bytes C2 B7)    -> Ve + middle dot
 *   U+00AB left quote  (bytes C2 AB)    -> Ve + left quote
 *   U+2014 em dash     (bytes E2 80 94) -> ve + Dje + right quote
 *   Russian text       (bytes D0/D1 xx) -> Er/Es + a South Slavic letter
 * The check reported ok while 17 broken user-visible strings sat in the
 * source: the separator in the imaging autosave caption and the quotes in
 * the recording and document messages.
 *
 * Patterns are written with explicit escapes on purpose. A literal
 * no-break space is indistinguishable from a plain space in an editor, and
 * an earlier draft accidentally used a plain one: "Ve + space" matches the
 * very common Russian word opening a sentence, which produced false
 * positives in eight live files.
 *
 * A wide "Cyrillic letter followed by anything from Latin-1" rule is not
 * usable either: a closing guillemet legitimately follows a letter inside
 * Russian quoted words. Only unambiguous pairs are listed below.
 */

// Ã Â Ð Ñ â — the Latin-1 / CP1252 family.
const latin1Family = "[\\u00c3\\u00c2\\u00d0\\u00d1\\u00e2].";
// U+FFFD replacement character.
const replacementChar = "\\ufffd";
// Ve (U+0412) followed by a sign that never follows a letter in Russian:
// nbsp, «, ·, °, ±, ©, ®, ½, ¼, ¾, ¶, §.
const cp1251AfterVe =
	"\\u0412[\\u00a0\\u00ab\\u00b7\\u00b0\\u00b1\\u00a9\\u00ae\\u00bd\\u00bc\\u00be\\u00b6\\u00a7]";
// ve (U+0432) + Dje (U+0402): prefix of every mojibake from the U+2000
// block — dashes, ellipsis, typographic quotes.
const cp1251DashPrefix = "\\u0432\\u0402.";
// Er (U+0420) or Es (U+0421) followed by a South Slavic letter. Those
// letters do not occur in Russian at all, so the pair is always mojibake
// of ordinary Cyrillic text.
const cp1251RussianText = "[\\u0420\\u0421][\\u0402-\\u040f\\u0452-\\u045f]";

export function createMojibakePattern() {
	return new RegExp(
		`(?:${latin1Family}|${replacementChar}|${cp1251AfterVe}|${cp1251DashPrefix}|${cp1251RussianText})`,
		"g",
	);
}

export const garbledQuestionPattern = /\?{4,}/g;
