/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Fast Print Engine (Compact Facade)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Мгновенная печать клинических документов из приёма у кресла:
 * - Форма 043/у (карта стоматологического больного)
 * - Вкладыш в медкарту (официальный лист дневника приёма)
 * - Информированное добровольное согласие (ИДС, 323-ФЗ)
 * - Памятка пациенту после вмешательства (терапия, удаление, имплантация, гигиена)
 * - Акт оказанных стоматологических услуг
 * - Предварительная смета комплексного плана лечения
 * 
 * Строго 0 мультяшных эмодзи (Мандат 8d, Грех №7) — только официальная медицинская типографика.
 */

export * from "./fastPrintModules/fastPrintDiaryBuilder";
export * from "./fastPrintModules/fastPrintConsentAndMemoBuilder";
export * from "./fastPrintModules";

import { executeFastPrint043u } from "./fastPrintModules/fastPrintDiaryBuilder";

/**
 * Канонический хендлер быстрой печати медицинской карты приёма со штампом (ЧЕРНОВИК / ПОДПИСАНО ВРАЧОМ).
 * Мандат 8e / 8x: Чистый клинический язык без советского канцелярита.
 */
export const handlePrintMedicalCardFast = (params?: any) => {
	if (params) {
		return executeFastPrint043u(params);
	}
};

/**
 * Канонический алиас печати дневника приёма (Мандат 8x)
 */
export const handlePrintClinicalDiaryFast = handlePrintMedicalCardFast;

/**
 * Алиас обратной совместимости
 */
export const handlePrintForm043uFast = handlePrintMedicalCardFast;

