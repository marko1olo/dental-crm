import { showToast } from "../../GlobalToast.js";
import { buildSignatureMediaAndVectorData } from "./executor/signatureSvgBuilder";
import { executePackageSigningStep } from "./executor/packageSigningStep";
import { executeSingleSigningStep } from "./executor/singleSigningStep";
import type { ExecuteSigningParams } from "./types.js";

export type { ExecuteSigningParams };

export async function executeSigning(params: ExecuteSigningParams): Promise<boolean> {
	const {
		effectiveMethod,
		strokes,
		currentPoints,
		smsOtpCode,
		paperScanFile,
		substitutionContext,
		effectiveContext,
		patient,
		patientId,
		visitId,
		integrityRecord,
		activeMode,
		currentPackage,
		activeDocKey,
		currentTemplate,
		rendered,
		onConsentSigned,
		onPackageSigned,
		onConsentConfirmed,
		onClose,
	} = params;

	let resolvedMethod = effectiveMethod;
	if (resolvedMethod === "tablet_stylus" && strokes.length === 0 && currentPoints.length === 0) {
		// Мандат 8e (Автономия врача & Paper-First): если росчерк на сенсоре отсутствует,
		// автоматически фиксируем как бумажный оригинал в карте без блокировок и ошибок!
		resolvedMethod = "paper_physical";
		showToast("Подтверждено как бумажный оригинал в медицинской карте пациента (1 клик)", "info");
	}
	if (resolvedMethod === "sms_otp" && (!smsOtpCode || smsOtpCode.trim().length < 4)) {
		showToast("Введите 4-значный код подтверждения из СМС", "error");
		return false;
	}

	const { svg, pngBase64, vectorData } = buildSignatureMediaAndVectorData({
		effectiveMethod: resolvedMethod,
		strokes,
		currentPoints,
		smsOtpCode,
		paperScanFile,
		substitutionContext,
		effectiveContext,
		patient,
		integrityHash: integrityRecord.hash,
	});

	const effectivePatientId = patientId || patient?.id;

	if (activeMode === "packages") {
		await executePackageSigningStep({
			pkg: currentPackage,
			effectiveContext,
			substitutionContext,
			effectiveMethod: resolvedMethod,
			strokes,
			smsOtpCode,
			svg,
			pngBase64,
			vectorData,
			paperScanFile,
			effectivePatientId,
			visitId,
			onConsentSigned,
			onPackageSigned,
			onConsentConfirmed,
		});
	} else {
		await executeSingleSigningStep({
			activeDocKey,
			currentTemplate,
			rendered,
			effectiveContext,
			effectiveMethod: resolvedMethod,
			svg,
			pngBase64,
			vectorData,
			integrityHash: integrityRecord.hash,
			smsOtpCode,
			paperScanFile,
			effectivePatientId,
			visitId,
			onConsentSigned,
			onConsentConfirmed,
		});
	}

	showToast("Согласие успешно подписано и зафиксировано в архиве", "success");
	onClose();
	return true;
}
