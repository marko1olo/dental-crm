import type { Readable } from "node:stream";
import { StringDecoder } from "node:string_decoder";

const MAX_SINGLE_ELEMENT_XML_CHARS = 2 * 1024 * 1024;
const EVENT_LOOP_YIELD_EVERY = 250;

export interface XmlElementChunk {
	readonly attrs: string;
	readonly innerXml: string;
}

function isTagNameBoundaryChar(code: number): boolean {
	return (
		code === 62 /* '>' */ ||
		code === 32 /* ' ' */ ||
		code === 47 /* '/' */ ||
		code === 9 /* '\t' */ ||
		code === 10 /* '\n' */ ||
		code === 13 /* '\r' */
	);
}

/**
 * Находит закрывающий '>' открывающего тега, игнорируя '>' внутри кавычек атрибутов.
 */
function findTagOpenEnd(text: string, fromIdx: number): number {
	let quote: number | null = null;
	for (let i = fromIdx; i < text.length; i += 1) {
		const ch = text.charCodeAt(i);
		if (quote !== null) {
			if (ch === quote) quote = null;
		} else if (ch === 34 /* '"' */ || ch === 39 /* "'" */) {
			quote = ch;
		} else if (ch === 62 /* '>' */) {
			return i;
		}
	}
	return -1;
}

/**
 * Потоковый конечно-автоматный сканер XML-элементов `<tagName ...>...</tagName>`
 * поверх Node.js Readable-потока без буферизации всего XML-файла в памяти и без RegExp.
 * Уступает управление Event Loop (`setImmediate`) каждые 250 элементов, чтобы
 * тяжёлый импорт 150+ МБ таблиц не замораживал HTTP-запросы клиники.
 */
export async function* streamXmlTagElements(
	xmlStream: Readable,
	tagName: string,
): AsyncGenerator<XmlElementChunk, void, undefined> {
	const decoder = new StringDecoder("utf8");
	const openToken = `<${tagName}`;
	const closeToken = `</${tagName}>`;
	const keepTailChars = Math.max(8, openToken.length + 2);

	let carry = "";
	let yieldedSinceYield = 0;

	async function* drainBuffer(isEof: boolean): AsyncGenerator<XmlElementChunk, void, undefined> {
		let searchFrom = 0;
		while (true) {
			const openIdx = carry.indexOf(openToken, searchFrom);
			if (openIdx === -1) {
				if (!isEof) {
					carry = carry.length > keepTailChars ? carry.slice(-keepTailChars) : carry;
				} else {
					carry = "";
				}
				break;
			}

			const afterNameIdx = openIdx + openToken.length;
			if (afterNameIdx >= carry.length) {
				carry = isEof ? "" : carry.slice(openIdx);
				break;
			}

			const nextCh = carry.charCodeAt(afterNameIdx);
			if (!isTagNameBoundaryChar(nextCh)) {
				searchFrom = afterNameIdx;
				continue;
			}

			const tagCloseIdx = findTagOpenEnd(carry, afterNameIdx);
			if (tagCloseIdx === -1) {
				carry = carry.slice(openIdx);
				if (carry.length > MAX_SINGLE_ELEMENT_XML_CHARS) {
					throw new Error(
						`Malformed XML: single <${tagName}> open tag exceeds 2 MB safety ceiling`,
					);
				}
				if (isEof) carry = "";
				break;
			}

			const attrs = carry.slice(afterNameIdx, tagCloseIdx);
			// Самозакрывающийся пустой элемент `<row r="5"/>` или `<si/>`
			if (carry.charCodeAt(tagCloseIdx - 1) === 47 /* '/' */) {
				const trimmedAttrs = attrs.slice(0, -1);
				searchFrom = tagCloseIdx + 1;
				yield { attrs: trimmedAttrs, innerXml: "" };
				yieldedSinceYield += 1;
				if (yieldedSinceYield >= EVENT_LOOP_YIELD_EVERY) {
					yieldedSinceYield = 0;
					await new Promise<void>((resolve) => setImmediate(resolve));
				}
				continue;
			}

			const closeIdx = carry.indexOf(closeToken, tagCloseIdx + 1);
			if (closeIdx === -1) {
				carry = carry.slice(openIdx);
				if (carry.length > MAX_SINGLE_ELEMENT_XML_CHARS) {
					throw new Error(
						`Malformed XML: single <${tagName}> element exceeds 2 MB safety ceiling`,
					);
				}
				if (isEof) carry = "";
				break;
			}

			const innerXml = carry.slice(tagCloseIdx + 1, closeIdx);
			searchFrom = closeIdx + closeToken.length;
			yield { attrs, innerXml };

			yieldedSinceYield += 1;
			if (yieldedSinceYield >= EVENT_LOOP_YIELD_EVERY) {
				yieldedSinceYield = 0;
				await new Promise<void>((resolve) => setImmediate(resolve));
			}
		}
	}

	for await (const rawChunk of xmlStream) {
		carry +=
			typeof rawChunk === "string"
				? rawChunk
				: decoder.write(Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk));
		yield* drainBuffer(false);
	}

	const tail = decoder.end();
	if (tail) {
		carry += tail;
	}
	if (carry.length > 0) {
		yield* drainBuffer(true);
	}
}

/**
 * Асинхронный генератор, вычитывающий содержимое `<row ...>...</row>` из потока yauzl
 * чанками по 64 КБ с уступкой Event Loop (`setImmediate` каждые 250 строк).
 */
export async function* streamWorksheetRowXml(
	xmlStream: Readable,
): AsyncGenerator<string, void, undefined> {
	for await (const el of streamXmlTagElements(xmlStream, "row")) {
		if (el.innerXml.length > 0) {
			yield el.innerXml;
		}
	}
}
