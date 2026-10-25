/**
 * implantDiaryGenerator.ts — Генерация текста протокола имплантации в дневник приёма (SOAP).
 */

export function generateImplantDiaryText(logic: any): string {
	const tooth = logic.toothFdi;
	const brand = logic.assembledData.brand;
	const model = logic.assembledData.model;
	const dia = logic.assembledData.diameterMm;
	const len = logic.assembledData.lengthMm;
	const torque = logic.assembledData.torqueNcm;
	const density = logic.assembledData.boneDensity || "D2";
	const capStr = logic.assembledData.capType === "plug" ? "винт-заглушка (ушивание наглухо)" : "формирователь десны (ФДМ)";
	const lot = logic.assembledData.lotNumber;
	const sn = logic.assembledData.serialNumber;
	const ref = logic.assembledData.catalogArticle;
	const gbrStr = logic.isGbrPerformed
		? ` Костная пластика (НКР): графт ${logic.activeGraft?.name || "Geistlich Bio-Oss"}, мембрана ${logic.activeMembrane?.name || "Geistlich Bio-Gide"}.`
		: "";

	return (
		`ПРОТОКОЛ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (Зуб FDI #${tooth})\n` +
		`Диагноз: K08.1 Потеря зубов вследствие удаления.\n\n` +
		`ХОД ОПЕРАЦИИ (SOAP):\n` +
		`Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области зуба #${tooth}, отслоен слизисто-надкостничный лоскут. ` +
		`Препарирование костного ложа фрезами с обильным охлаждением стерильным раствором NaCl 0.9% (800 об/мин). ` +
		`Плотность костной ткани по Misch: ${density}. ` +
		`Установлен дентальный имплантат ${brand} ${model} Ø ${dia} × ${len} мм. ` +
		`Первичная торк-стабильность: ${torque} Н·см (оптимум фиксации). Установлен ${capStr}.${gbrStr} ` +
		`Мобилизация слизисто-надкостничного лоскута, наложены узловые швы (Викрил 4-0) без натяжения. ` +
		`Гемостаз полный. Паспорт дентального имплантата оформлен и выдан пациенту.\n\n` +
		`ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ:\n` +
		`REF: ${ref} · LOT: ${lot} · SN: ${sn} · Стерилен до: ${logic.assembledData.expirationDate || "2028-11-30"}\n\n` +
		`НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n` +
		`Холод на щеку 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином со 2-х суток. Исключить горячее, баню и физические нагрузки на 7 дней. Осмотр через 7 дней.`
	);
}
