/**
 * Production-Grade XML Builder Facade for FNS Form KND 1151156 / Format 1184043 (`UT_SVOPLMEDUSL`).
 * Delegates canonical generation to @dental/shared (Mandate 8s: Best-of-Breed SSOT).
 * Conforms strictly to FNS Order dated 08.11.2023 No. EA-7-11/824@ Version 5.01.
 */

import {
	buildFnsKnd1151156Xml as sharedBuildFnsKnd1151156Xml,
	cleanDigits,
	formatFnsDate,
	generateFnsFileNameAndId as sharedGenerateFnsFileNameAndId,
	type FnsClinicInfo,
	type FnsPersonInfo,
	type FnsPatientInfo,
	type FnsTaxPayload,
} from "@dental/shared";

export {
	cleanDigits,
	formatFnsDate,
	type FnsClinicInfo,
	type FnsPersonInfo,
	type FnsPatientInfo,
	type FnsTaxPayload,
};

export function generateFnsFileNameAndId(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined,
	dateStr: string,
	customUuid?: string,
): { fileName: string; fileId: string; uuid: string } {
	return sharedGenerateFnsFileNameAndId(
		taxOfficeCode,
		senderInn,
		senderKpp,
		dateStr,
		customUuid,
		"UT_SVOPLMEDUSL",
	);
}

export function buildFnsKnd1151156Xml(
	payload: FnsTaxPayload,
	customUuid?: string,
): {
	xmlContent: string;
	fileName: string;
	fileId: string;
} {
	const res = sharedBuildFnsKnd1151156Xml(
		{
			...payload,
			filePrefix: payload.filePrefix || "UT_SVOPLMEDUSL",
		},
		customUuid,
	);
	return {
		xmlContent: res.xmlContent,
		fileName: res.fileName,
		fileId: res.fileId,
	};
}
