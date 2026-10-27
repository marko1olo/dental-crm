import React from "react";
import { Zap, MessageSquare, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { SurgicalServiceItem } from "../../surgery/surgeryProtocols";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { triggerHaptic } from "../../../native/mobileBridge";
import { useExtractionBarState } from "./barModules/useExtractionBarState";
import { ExtractionComplexitySelector } from "./barModules/ExtractionComplexitySelector";
import { ExtractionHemostasisSelector } from "./barModules/ExtractionHemostasisSelector";

export interface VisitSurgeryExtractionBarProps {
	readonly effectiveTooth: number;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

export const VisitSurgeryExtractionBar: React.FC<VisitSurgeryExtractionBarProps> = ({
	effectiveTooth,
	patientName = "Пациент",
	doctorName = "Хирург-стоматолог",
	onApplyProtocolText,
	onAddToInvoice,
}) => {
	const state = useExtractionBarState({
		effectiveTooth, patientName, doctorName, onApplyProtocolText, onAddToInvoice,
	});

	const renderControls = () => (
		<div className="space-y-3">
			<ExtractionComplexitySelector
				complexity={state.complexity}
				onComplexityChange={state.handleComplexityChange}
				onAddServicesToInvoice={state.handleAddServicesToInvoice}
			/>
			<ExtractionHemostasisSelector
				selectedHemostasis={state.selectedHemostasis}
				sutureMaterial={state.sutureMaterial}
				onToggleHemostasis={state.toggleHemostasis}
				onSelectSutureMaterial={state.handleSelectSuture}
			/>
		</div>
	);

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 overflow-x-clip max-w-full" data-testid="visit-surgery-extraction-bar">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					<ShieldCheck size={16} />
					<span>Протокол удаления зуба:</span>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					{state.isMobile && (
						<button
							type="button"
							onClick={() => { triggerHaptic("selection"); state.setIsMobileSheetOpen(true); }}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="btn-open-extraction-mobile-sheet"
							title="Открыть параметры сложности и гемостаза в Bottom Sheet"
						>
							<SlidersHorizontal size={14} />
							<span>Шторка параметров</span>
						</button>
					)}
					<button
						type="button"
						onClick={state.handleApplyUncomplicatedNorm}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-2 cursor-pointer shadow-xs hover:opacity-95 transition-all touch-manipulation"
						data-testid="btn-uncomplicated-extraction-norm"
						title="Физиологическая норма: лунка ушита, Альвожил, гемостаз полный"
					>
						<Zap size={14} className="text-amber-300" />
						<span>Протокол без осложнений: лунка ушита, гемостаз полный</span>
					</button>
					<button
						type="button"
						onClick={state.handleCopyPatientMemo}
						className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-copy-post-op-memo"
						title="Скопировать памятку пациенту для мессенджера"
					>
						<MessageSquare size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Памятка пациенту (WhatsApp)</span>
					</button>
				</div>
			</div>
			{renderControls()}
			<MobileBottomSheet
				isOpen={state.isMobileSheetOpen}
				onClose={() => state.setIsMobileSheetOpen(false)}
				title={`Удаление зуба FDI #${effectiveTooth}`}
				subtitle="Параметры сложности, гемостаз и швы (Apple iOS HIG)"
				testId="extraction-bottom-sheet"
				footer={
					<div className="flex items-center gap-2 w-full">
						<button
							type="button"
							onClick={() => { state.handleAddServicesToInvoice(); state.setIsMobileSheetOpen(false); }}
							className="flex-1 min-h-[48px] py-3 rounded-xl font-black text-sm bg-[var(--teal,#0d9488)] text-white shadow-xs touch-manipulation"
							data-testid="btn-mobile-apply-extraction-sheet"
						>
							Применить в протокол и смету
						</button>
					</div>
				}
			>
				<div className="p-1 space-y-4">{renderControls()}</div>
			</MobileBottomSheet>
		</div>
	);
};

export default VisitSurgeryExtractionBar;
