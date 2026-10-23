import type { ConsentPdfAOptions } from "./types";
import { escapePdfString, transliterateRussianToAscii } from "./types";

export function assemblePdfABytes(
	streamContent: string,
	xmpContent: string,
	options: ConsentPdfAOptions,
	now: Date,
): Uint8Array {
	const encoder = new TextEncoder();
	const pdfDate =
		now.getUTCFullYear().toString() +
		(now.getUTCMonth() + 1).toString().padStart(2, "0") +
		now.getUTCDate().toString().padStart(2, "0") +
		now.getUTCHours().toString().padStart(2, "0") +
		now.getUTCMinutes().toString().padStart(2, "0") +
		now.getUTCSeconds().toString().padStart(2, "0") +
		"Z";

	const docTitleAscii = transliterateRussianToAscii(options.documentTitle);
	const clinicNameAscii = transliterateRussianToAscii(options.clinicName);
	const streamBytes = encoder.encode(streamContent);
	const xmpBytes = encoder.encode(xmpContent);

	const objects: string[] = [
		"<< /Type /Catalog /Pages 2 0 R /Metadata 5 0 R /OutputIntents [ 6 0 R ] >>",
		"<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595.28 841.89 ] /Contents 4 0 R /Resources << /ProcSet [ /PDF /Text /ImageB /ImageC ] /Font << /F1 8 0 R >> >> >>",
		`<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`,
		`<< /Type /Metadata /Subtype /XML /Length ${xmpBytes.length} >>\nstream\n${xmpContent}\nendstream`,
		"<< /Type /OutputIntent /S /GTS_PDFA1 /OutputConditionIdentifier (sRGB IEC61966-2.1) /Info (sRGB IEC61966-2.1) >>",
		`<< /Title (${escapePdfString(docTitleAscii)}) /Author (${escapePdfString(clinicNameAscii)}) /Creator (DENTE Dental CRM) /CreationDate (D:${pdfDate}) /ModDate (D:${pdfDate}) >>`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
	];

	const headerStr = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
	const chunks: Uint8Array[] = [encoder.encode(headerStr)];
	let currentOffset = chunks[0]!.length;
	const offsets: number[] = [0];

	for (let i = 0; i < objects.length; i++) {
		offsets.push(currentOffset);
		const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
		const objBytes = encoder.encode(objStr);
		chunks.push(objBytes);
		currentOffset += objBytes.length;
	}

	const xrefStart = currentOffset;
	let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (let i = 1; i <= objects.length; i++) {
		const off = (offsets[i] ?? 0).toString().padStart(10, "0");
		xrefStr += `${off} 00000 n \n`;
	}

	const trailerStr = `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root 1 0 R\n  /Info 7 0 R\n>>\nstartxref\n${xrefStart}\n%%EOF\n`;
	chunks.push(encoder.encode(xrefStr + trailerStr));

	const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
	const pdfData = new Uint8Array(totalLen);
	let writePos = 0;
	for (const chunk of chunks) {
		pdfData.set(chunk, writePos);
		writePos += chunk.length;
	}

	return pdfData;
}
