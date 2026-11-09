/**
 * Номер медицинской карты пациента (форма 043/у).
 */
export function extractMedicalCardNumber(
	patientId: string,
	adminProfile: unknown,
): string {
	if (adminProfile && typeof adminProfile === "object") {
		const prof = adminProfile as Record<string, unknown>;
		if (typeof prof.cardNumber === "string" && prof.cardNumber.trim()) {
			return prof.cardNumber.trim();
		}
		if (typeof prof.medicalCardNumber === "string" && prof.medicalCardNumber.trim()) {
			return prof.medicalCardNumber.trim();
		}
		if (typeof prof.insurancePolicyNumber === "string" && prof.insurancePolicyNumber.trim()) {
			return `ОМС ${prof.insurancePolicyNumber.trim()}`;
		}
	}
	const shortId = patientId.replace(/-/g, "").slice(0, 6).toUpperCase();
	return `043/у-${shortId}`;
}

/**
 * Читаемое наименование зуботехнической конструкции.
 */
export function humanizeRestorationType(
	restorationType?: string | null,
	material?: string | null,
): string {
	const map: Record<string, string> = {
		crown_monolithic: "Коронка монолитная (CAD/CAM)",
		crown_zirconia: "Коронка из диоксида циркония",
		crown_emax: "Безметалловая коронка E.max",
		crown_metal_ceramic: "Металлокерамическая коронка",
		crown_temporary: "Временная фрезерованная коронка (PMMA)",
		veneer: "Керамический винир",
		inlay_onlay: "Вкладка / Накладка (Inlay/Onlay)",
		bridge_pontic: "Мостовидный протез",
		implant_abutment: "Индивидуальный циркониевый абатмент",
		aligners_setup: "Сетап элайнеров",
		clasp_denture: "Бюгельный протез на замках",
		full_denture: "Полный съемный пластиночный протез",
	};
	if (restorationType && map[restorationType]) {
		return map[restorationType];
	}
	return restorationType || material || "Зуботехническая конструкция";
}
