import type { ConsentPdfAOptions } from "./types";
import { escapePdfString, transliterateRussianToAscii } from "./types";
import { calculateBoundingBox } from "../signature/geometry";

export function buildPdfAStreamContent(options: ConsentPdfAOptions, now: Date): string {
	const docTitleAscii = transliterateRussianToAscii(options.documentTitle);
	const clinicNameAscii = transliterateRussianToAscii(options.clinicName);
	const patientNameAscii = transliterateRussianToAscii(options.patientName);
	const doctorNameAscii = transliterateRussianToAscii(options.doctorName);
	const method = options.verificationMethod || "tablet_stylus";

	let stream = "";
	stream += "q 0.05 0.58 0.53 rg 36 780 523.28 36 re f Q\n";
	stream += "q 0.8 0.85 0.9 RG 1 w 36 36 523.28 780 re S Q\n";
	stream += "BT /F1 12 Tf 1 1 1 rg 48 793 Td (DENTE CLINICAL INFORMED CONSENT // ISO 19005-1 PDF/A-1b) Tj ET\n";
	stream += `BT /F1 13 Tf 0.06 0.09 0.16 rg 48 755 Td (${escapePdfString(docTitleAscii.slice(0, 75))}) Tj ET\n`;
	stream += "BT /F1 9 Tf 0.4 0.45 0.5 rg 48 740 Td (Statutory base: Federal Law No. 323-FZ Art. 20, Order of Ministry of Health No. 1051n) Tj ET\n";
	stream += "q 0.88 0.9 0.92 RG 1 w 48 730 500 0 re S Q\n";

	stream += `BT /F1 9 Tf 0.2 0.25 0.3 rg 48 710 Td (Clinic: ${escapePdfString(clinicNameAscii.slice(0, 60))}) Tj ET\n`;
	stream += `BT /F1 9 Tf 0.2 0.25 0.3 rg 48 695 Td (Patient: ${escapePdfString(patientNameAscii)} [Card: ${escapePdfString(options.medicalCardNumber || "043/u")}]) Tj ET\n`;
	stream += `BT /F1 9 Tf 0.2 0.25 0.3 rg 48 680 Td (Attending Doctor: ${escapePdfString(doctorNameAscii)}) Tj ET\n`;
	stream += `BT /F1 9 Tf 0.2 0.25 0.3 rg 48 665 Td (Timestamp: ${now.toISOString()} | Verification: ${method}) Tj ET\n`;
	stream += "q 0.88 0.9 0.92 RG 1 w 48 650 500 0 re S Q\n";

	const rawSnippet = transliterateRussianToAscii(options.documentText.slice(0, 800));
	const snippetLines = rawSnippet.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 16);
	let curY = 635;
	for (const line of snippetLines) {
		stream += `BT /F1 8 Tf 0.25 0.3 0.35 rg 48 ${curY} Td (${escapePdfString(line.slice(0, 95))}) Tj ET\n`;
		curY -= 14;
	}

	stream += "q 0.95 0.97 0.98 rg 48 200 500 50 re f 0.8 0.85 0.9 RG 1 w 48 200 500 50 re S Q\n";
	stream += "BT /F1 8 Tf 0.05 0.58 0.53 rg 58 234 Td (CRYPTOGRAPHIC SHA-256 INTEGRITY FINGERPRINT [FIPS 180-4]:) Tj ET\n";
	stream += `BT /F1 8 Tf 0.1 0.15 0.2 rg 58 216 Td (${options.integrityHash}) Tj ET\n`;

	stream += "q 0.96 0.98 0.98 rg 48 60 240 120 re f 0.8 0.85 0.9 RG 1 w 48 60 240 120 re S Q\n";
	stream += "BT /F1 9 Tf 0.1 0.15 0.2 rg 58 165 Td (Patient Signature / Vector Verification:) Tj ET\n";

	if (options.strokes && options.strokes.length > 0) {
		const bb = calculateBoundingBox(options.strokes);
		const targetW = 200;
		const targetH = 80;
		const scaleX = bb.width > 0 ? targetW / bb.width : 1;
		const scaleY = bb.height > 0 ? targetH / bb.height : 1;
		const scale = Math.min(scaleX, scaleY, 1.5);
		const originX = 58;
		const originY = 75;

		stream += "q 0.05 0.45 0.42 RG 1.5 w\n";
		for (const stroke of options.strokes) {
			const pts = stroke.points;
			if (!pts || pts.length === 0) continue;
			const p0 = pts[0]!;
			const x0 = (originX + (p0.x - bb.minX) * scale).toFixed(2);
			const y0 = (originY + targetH - (p0.y - bb.minY) * scale).toFixed(2);
			stream += `${x0} ${y0} m\n`;
			for (let i = 1; i < pts.length; i++) {
				const pi = pts[i]!;
				const xi = (originX + (pi.x - bb.minX) * scale).toFixed(2);
				const yi = (originY + targetH - (pi.y - bb.minY) * scale).toFixed(2);
				stream += `${xi} ${yi} l\n`;
			}
			stream += "S\n";
		}
		stream += "Q\n";
	} else {
		stream += "BT /F1 8 Tf 0.05 0.58 0.53 rg 58 135 Td (SIGNED ON PAPER (FORM 043/u ARCHIVE)) Tj ET\n";
		stream += `BT /F1 8 Tf 0.4 0.45 0.5 rg 58 115 Td (Physical original archived in medical card) Tj ET\n`;
		stream += `BT /F1 8 Tf 0.4 0.45 0.5 rg 58 95 Td (Date: ${now.toLocaleDateString("ru-RU")}) Tj ET\n`;
	}

	stream += "q 0.96 0.98 0.98 rg 308 60 240 120 re f 0.8 0.85 0.9 RG 1 w 308 60 240 120 re S Q\n";
	stream += "BT /F1 9 Tf 0.1 0.15 0.2 rg 318 165 Td (Attending Doctor Verification:) Tj ET\n";
	stream += `BT /F1 8 Tf 0.2 0.25 0.3 rg 318 135 Td (Doctor: ${escapePdfString(doctorNameAscii.slice(0, 35))}) Tj ET\n`;
	stream += `BT /F1 8 Tf 0.4 0.45 0.5 rg 318 115 Td (Status: Statutory Medical Record Approved) Tj ET\n`;
	stream += `BT /F1 8 Tf 0.05 0.58 0.53 rg 318 95 Td (Signed via DENTE Dental CRM v3.4) Tj ET\n`;

	return stream;
}
