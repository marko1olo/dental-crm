import type { ToothData } from "../../odontogram/ToothChart";

export interface ToothEndoCanalsSectionProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	showEndoTable: boolean;
	onToggleShowEndoTable: () => void;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}
