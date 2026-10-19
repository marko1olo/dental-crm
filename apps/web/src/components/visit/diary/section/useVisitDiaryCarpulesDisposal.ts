import type { AnestheticDrugId } from "../../../anesthesia/anesthesiaCatalog";

export function useVisitDiaryCarpulesDisposal(
	ensureRevisingIfLocked: () => void,
	_applyAnesthesiaPreset: (note: string) => void,
	_activePatient: any,
	_clinicSettings: any,
	_visitId: string,
) {
	return (_count: number, _drugId: AnestheticDrugId | string) => {
		ensureRevisingIfLocked();
		// МАНДАТЫ 8e, 8n, 8y и ВЫСШИЙ ЗАКОН RED TEAM:
		// Ликвидирована навязчивая инъекция текста в клинический дневник («Утилизация: списана пустая карпула...»)
		// и убран спам сетевых запросов quick-writeoff-carpules на каждый чих у кресла врача.
		// Списание расходников выполняется пакетом в бэкенде (Soft Negative Stock).
	};
}
