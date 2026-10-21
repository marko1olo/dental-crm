import { SlidersHorizontal } from "lucide-react";
import type { AnestheticDrugId } from "../anesthesiaCatalog";
import { AnesthesiaPresetsRow } from "./AnesthesiaPresetsRow";

export interface AnesthesiaPresetsActionBarProps {
	disabled?: boolean | undefined;
	selectedDrugId: AnestheticDrugId;
	onApplyUltracain200k: () => void;
	onApplyUltracainForte: () => void;
	onApplySeptanest100k?: (() => void) | undefined;
	onApplyScandonestCardio: () => void;
	onApplyNoAnesthesia: () => void;
	onOpenMobileDrawer: () => void;
}

export function AnesthesiaPresetsActionBar({
	disabled,
	selectedDrugId,
	onApplyUltracain200k,
	onApplyUltracainForte,
	onApplySeptanest100k,
	onApplyScandonestCardio,
	onApplyNoAnesthesia,
	onOpenMobileDrawer,
}: AnesthesiaPresetsActionBarProps) {
	return (
		<div className="flex items-center justify-between gap-1 flex-wrap">
			<AnesthesiaPresetsRow
				disabled={disabled}
				selectedDrugId={selectedDrugId}
				onApplyUltracain200k={onApplyUltracain200k}
				onApplyUltracainForte={onApplyUltracainForte}
				onApplySeptanest100k={onApplySeptanest100k}
				onApplyScandonestCardio={onApplyScandonestCardio}
				onApplyNoAnesthesia={onApplyNoAnesthesia}
			/>
			<button
				type="button"
				onClick={onOpenMobileDrawer}
				className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)]"
				title="Открыть полноэкранную мобильную шторку анестезии"
				data-testid="btn-open-anesthesia-mobile-sheet"
			>
				<SlidersHorizontal size={14} />
				<span>Шторка</span>
			</button>
		</div>
	);
}
