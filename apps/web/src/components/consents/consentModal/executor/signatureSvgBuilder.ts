import {
	generatePaperSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type SignatureVectorData,
	calculateBoundingBox,
	exportSignatureToSvg,
} from "../../signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "../../consentIntegrityHash.js";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import type {
	VerificationMethod,
	SignatureStroke,
	SignaturePoint,
	ConsentSubstitutionContext,
	InformedConsentPatientInfo,
} from "../types.js";

export interface SignatureBuildResult {
	svg: string;
	pngBase64: string;
	vectorData: SignatureVectorData;
}

export function buildSignatureMediaAndVectorData(params: {
	effectiveMethod: VerificationMethod;
	strokes: SignatureStroke[];
	currentPoints: SignaturePoint[];
	smsOtpCode: string;
	paperScanFile: File | null;
	substitutionContext: ConsentSubstitutionContext;
	effectiveContext: ConsentSubstitutionContext;
	patient?: InformedConsentPatientInfo | null | undefined;
	integrityHash: string;
}): SignatureBuildResult {
	const {
		effectiveMethod,
		strokes,
		smsOtpCode: _smsOtpCode,
		paperScanFile,
		substitutionContext,
		effectiveContext,
		patient,
		integrityHash,
	} = params;

	let svg = "";
	if (effectiveMethod === "tablet_stylus") {
		svg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
	} else if (effectiveMethod === "sms_otp") {
		svg = generateSmsPepSignatureSvg({
			patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
			phoneMasked: (substitutionContext.phone || patient?.phone)
				? String(substitutionContext.phone || patient?.phone)
				: undefined,
			timestampIso: new Date().toISOString(),
			integrityHash,
			clinicName:
				effectiveContext.clinicName ||
				(isDemoShowcaseMode()
					? "ООО «Стоматологическая клиника ДЕНТЕ»"
					: "«________________________________________»"),
		});
	} else {
		svg = generatePaperSignatureSvg({
			date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
			clinicName:
				effectiveContext.clinicName ||
				(isDemoShowcaseMode()
					? "ООО «Стоматологическая клиника ДЕНТЕ»"
					: "«________________________________________»"),
			patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
			scanFileName: paperScanFile?.name || null,
			scanFileSizeBytes: paperScanFile?.size || null,
		});
	}

	const vectorData: SignatureVectorData = {
		strokes: effectiveMethod === "tablet_stylus" ? strokes : [],
		bounds:
			effectiveMethod === "tablet_stylus" && strokes.length > 0
				? calculateBoundingBox(strokes)
				: { minX: 0, minY: 0, maxX: 400, maxY: 120, width: 400, height: 120 },
		timestamp: Date.now(),
		pointCount:
			effectiveMethod === "tablet_stylus"
				? strokes.reduce((acc, s) => acc + s.points.length, 0)
				: 0,
		integrityHash,
	};

	return {
		svg,
		pngBase64: PAPER_SIGNATURE_FALLBACK_PNG,
		vectorData,
	};
}
