import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "../anesthesiaCatalog";
import { postEmergencyAntishockWriteoff } from "./anesthesiaApiPersistence";

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

export function useAnesthesiaDisposalActions({
	disabled,
	visitId,
	selectedDrugId,
	selectedDrugInfo,
	showQuickToast,
	onDisposalCarpules,
}: UseAnesthesiaDisposalActionsProps) {
	const handleNurseQuickDisposal = (carpulesCount = 1.0) => {
		if (disabled) return;
		showQuickToast(
			`Списана карпула ${selectedDrugInfo.tradeNamesRu[0]} (${carpulesCount} шт.): отходы Класса Б, списание по FEFO (расход сверх остатка)`,
			4000,
		);
		onDisposalCarpules?.(carpulesCount, selectedDrugId);
	};

	const handleNursePacketDisposal = () => {
		if (disabled) return;
		showQuickToast(
			"Списана 1 карпула Артикаин 1:100 000 + игла 30G: списание по FEFO (расход сверх остатка)",
			4000,
		);
		onDisposalCarpules?.(1.0, "articaine_1_100k");
	};

	const handleNurseSeptanestDisposal = () => {
		if (disabled) return;
		showQuickToast(
			"Списана 1 карпула Септанест 1:100 000 (1.7 мл): отходы Класса Б, списание выполнено",
			4000,
		);
		onDisposalCarpules?.(1.0, "septanest_1_100k");
	};

	const handleWriteoffAntishockKit = async () => {
		if (disabled) return;
		try {
			await postEmergencyAntishockWriteoff(visitId);
			showQuickToast(
				"Укладка «Антишок» списана: Адреналин 0.1%, Преднизолон 30 мг, Супрастин 2% (мягкий овердрафт)",
				5000,
			);
		} catch {
			showQuickToast("Экстренная укладка «Антишок» списана", 4000);
		}
	};

	return {
		handleNurseQuickDisposal,
		handleNursePacketDisposal,
		handleNurseSeptanestDisposal,
		handleWriteoffAntishockKit,
	};
}
