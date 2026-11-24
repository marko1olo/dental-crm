import React from "react";
import { Zap, Layers, SlidersHorizontal } from "lucide-react";
import type { SurgicalServiceItem } from "../../surgery/surgeryCatalogData";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { triggerHaptic } from "../../../native/mobileBridge";
import { useSinusGbrBarState } from "./barModules/useSinusGbrBarState";
import { SinusGraftSelector } from "./barModules/SinusGraftSelector";
import { SinusMembraneSelector } from "./barModules/SinusMembraneSelector";

export interface VisitSurgerySinusGbrBarProps {
	readonly effectiveTooth: number;
	readonly isClosedSinus?: boolean | undefined;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

export const VisitSurgerySinusGbrBar: React.FC<VisitSurgerySinusGbrBarProps> = ({
	effectiveTooth,
	isClosedSinus = false,
	onApplyProtocolText,
	onAddToInvoice,
}) => {
	const state = useSinusGbrBarState({
		effectiveTooth,
		isClosedSinus,
		onApplyProtocolText,
		onAddToInvoice,
	});

	const renderControls = () => (
		<div className="space-y-3">
			<SinusGraftSelector
				selectedGraft={state.selectedGraft}
				onGraftSelect={state.handleGraftSelect}
				onAddServicesToInvoice={state.handleAddServicesToInvoice}
			/>
			<SinusMembraneSelector
				selectedMembrane={state.selectedMembrane}
				hasPins={state.hasPins}
				onMembraneSelect={state.handleMembraneSelect}
				onTogglePins={state.togglePins}
			/>
		</div>
	);

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 overflow-x-clip max-w-full"
			data-testid="visit-surgery-sinus-gbr-bar"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
					<Layers size={16} />
					<span>Костная пластика и синус-лифтинг:</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{state.isMobile && (
						<button
							type="button"
							onClick={() => {
								triggerHaptic("selection");
								state.setIsMobileSheetOpen(true);
							}}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--primary)] bg-[var(--paper)] text-[var(--primary)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="btn-open-sinus-mobile-sheet"
							title="Открыть параметры костной пластики в Bottom Sheet"
						>
							<SlidersHorizontal size={14} />
							<span>Шторка НКР</span>
						</button>
					)}

					<button
						type="button"
						onClick={state.handleApplyUncomplicatedGbrNorm}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-2 cursor-pointer shadow-xs transition-all touch-manipulation"
						data-testid="btn-uncomplicated-gbr-norm"
						title="Физиологическая норма: остеопластика, мембрана Шнайдера интактна, гемостаз полный"
					>
						<Zap size={14} className="shrink-0" />
						<span>Норма НКР: мембрана Шнайдера интактна, графт внесен, гемостаз устойчивый</span>
					</button>
					<button
						type="button"
						onClick={state.handleAddServicesToInvoice}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-sinus-bar-add-to-invoice"
						title="Добавить хирургические услуги в смету визита"
					>
						<span>В смету</span>
					</button>
				</div>
			</div>

			{renderControls()}

			<MobileBottomSheet
				isOpen={state.isMobileSheetOpen}
				onClose={() => state.setIsMobileSheetOpen(false)}
				title={`Костная пластика FDI #${effectiveTooth}`}
				subtitle="Выбор графтов, мембран и пинов (Apple iOS HIG)"
				testId="sinus-gbr-bottom-sheet"
				footer={
					<div className="flex items-center gap-2 w-full">
						<button
							type="button"
							onClick={() => {
								state.handleAddServicesToInvoice();
								state.setIsMobileSheetOpen(false);
							}}
							className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs touch-manipulation"
							data-testid="btn-mobile-apply-sinus-sheet"
						>
							Применить в протокол и смету
						</button>
					</div>
				}
			>
				<div className="p-1 space-y-4">
					{renderControls()}
				</div>
			</MobileBottomSheet>
		</div>
	);
};

export default VisitSurgerySinusGbrBar;
