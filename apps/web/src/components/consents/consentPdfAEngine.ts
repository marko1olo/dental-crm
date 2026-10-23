/**
 * ISO 19005-1 (PDF/A-1b) ARCHIVAL DOCUMENT GENERATION & EXPORT ENGINE
 */

import type { ConsentPdfAOptions } from "./pdfa/types";
import { generateXmpMetadataPacket } from "./pdfa/xmpMeta";
import { buildPdfAStreamContent } from "./pdfa/streamBuilder";
import { assemblePdfABytes } from "./pdfa/binaryAssembly";

export type { ConsentPdfAOptions } from "./pdfa/types";
export { escapeXml, escapePdfString, transliterateRussianToAscii } from "./pdfa/types";
export { downloadConsentPdfA } from "./pdfa/download";

export function generatePdfA1bDocument(options: ConsentPdfAOptions): Uint8Array {
	const now = options.signedAtIso ? new Date(options.signedAtIso) : new Date();
	const streamContent = buildPdfAStreamContent(options, now);
	const xmpContent = generateXmpMetadataPacket(options);
	return assemblePdfABytes(streamContent, xmpContent, options, now);
}
