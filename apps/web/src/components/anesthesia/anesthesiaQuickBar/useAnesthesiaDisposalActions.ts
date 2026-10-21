/**
 * useAnesthesiaDisposalActions.ts
 *
 * Ликвидировано микро-списание карпул и отходов Класса Б из тулбара врача (Мандаты 8e, 8k, 8y).
 * Врач у кресла лечит зубы, а не заведует складом или утилизацией отходов.
 * Списание расходных материалов выполняется фоновым складским пакетом за смену.
 */

import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "../anesthesiaCatalog";

export interface UseAnesthesiaDisposalActionsProps {
	disabled: boolean;
	visitId?: string | undefined;
	selectedDrugId: AnestheticDrugId;
	selectedDrugInfo: AnestheticDrugInfo;
	showQuickToast: (msg: string, durationMs?: number) => void;
	onDisposalCarpules?:
		| ((count: number, drugId?: AnestheticDrugId) => void)
		| undefined;
}

export function useAnesthesiaDisposalActions(_props: UseAnesthesiaDisposalActionsProps) {
	// Чистые no-op методы без микро-дроча и симуляции отходов
	const handleNurseQuickDisposal = () => {};
	const handleNursePacketDisposal = () => {};
	const handleNurseSeptanestDisposal = () => {};
	const handleWriteoffAntishockKit = async () => {};

	return {
		handleNurseQuickDisposal,
		handleNursePacketDisposal,
		handleNurseSeptanestDisposal,
		handleWriteoffAntishockKit,
	};
}
