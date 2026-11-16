import type {
	PersistShiftSanpinOptions,
	PersistShiftSanpinResult,
	ShiftSanpinAutoCloseResult,
} from "./types.js";

/**
 * Асинхронно персистит результаты закрытия смены в PostgreSQL 18 через API /api/registers/sanpin.
 * При отсутствии сети безопасно сохраняет локально в кэш.
 */
export async function persistShiftSanpinAutoClose(
	shiftResult: ShiftSanpinAutoCloseResult,
	options: PersistShiftSanpinOptions = {},
): Promise<PersistShiftSanpinResult> {
	const fetchImpl = options.fetchFn || (typeof window !== "undefined" ? window.fetch.bind(window) : undefined);
	const date = shiftResult.date;
	const digitalStampHash = shiftResult.digitalStampHash;

	try {
		if (typeof window !== "undefined" && window.localStorage) {
			window.localStorage.setItem(`dente_sanpin_shift_${date}`, JSON.stringify(shiftResult));
		}
	} catch {
		// quota limit ignore
	}

	if (fetchImpl) {
		try {
			const res = await fetchImpl("/api/registers/sanpin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(options.organizationId ? { "x-organization-id": options.organizationId } : {}),
				},
				body: JSON.stringify({
					date,
					visitsCount: shiftResult.visitsCount,
					traysCount: shiftResult.traysCount,
					operatorStaffFullName: shiftResult.operatorStaffFullName,
					operatorStaffPosition: shiftResult.operatorStaffPosition,
					headNurseSignatureFullName: shiftResult.headNurseSignatureFullName,
					psoBatches: shiftResult.psoBatches,
					form257Records: shiftResult.form257Records,
					waste: shiftResult.waste,
					microclimate: shiftResult.microclimate,
					bactericidal: shiftResult.bactericidal,
					digitalStampHash,
				}),
			});

			if (res.ok) {
				const json = await res.json().catch(() => ({}));
				const msg = (json as any)?.messageRu || `Смена ${date} зафиксирована в журналах СанПиН.`;
				options.onToast?.(msg, "success");
				return {
					success: true,
					persistedOnline: true,
					date,
					digitalStampHash,
					messageRu: msg,
				};
			}
		} catch (err) {
			console.warn("[shiftAutoCloserEngine] Фоновая фиксация смены в API отложена (офлайн-режим):", err);
		}
	}

	const offlineMsg = `Смена ${date} сохранена локально. Документы СанПиН оформлены.`;
	options.onToast?.(offlineMsg, "info");
	return {
		success: true,
		persistedOnline: false,
		date,
		digitalStampHash,
		messageRu: offlineMsg,
	};
}
