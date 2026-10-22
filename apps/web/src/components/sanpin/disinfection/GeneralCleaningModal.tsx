import { CheckCircle2 } from "lucide-react";
import React from "react";
import type { DisinfectionJournalRecord } from "./disinfectionTypes.js";
import { GeneralCleaningExposureFields } from "./GeneralCleaningExposureFields.js";
import { GeneralCleaningHeader } from "./GeneralCleaningHeader.js";
import { GeneralCleaningRoomFields } from "./GeneralCleaningRoomFields.js";
import { GeneralCleaningSolutionFields } from "./GeneralCleaningSolutionFields.js";
import { useGeneralCleaningForm } from "./useGeneralCleaningForm.js";

export interface GeneralCleaningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: ((record: DisinfectionJournalRecord) => void) | undefined;
}

export const GeneralCleaningModal: React.FC<GeneralCleaningModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
}) => {
	const form = useGeneralCleaningForm(onClose, onSuccess);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
			<div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl p-6 flex flex-col gap-5">
				<GeneralCleaningHeader onClose={onClose} onApplyNormPreset={form.handleApplyNormPreset} />

				<form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
					<GeneralCleaningRoomFields
						roomType={form.roomType}
						onRoomChange={form.handleRoomChange}
						roomName={form.roomName}
						setRoomName={form.setRoomName}
						logDate={form.logDate}
						setLogDate={form.setLogDate}
						treatedAreaM2={form.treatedAreaM2}
						setTreatedAreaM2={form.setTreatedAreaM2}
						applicationMethod={form.applicationMethod}
						setApplicationMethod={form.setApplicationMethod}
					/>

					<GeneralCleaningSolutionFields
						selectedBrandId={form.selectedBrandId}
						onBrandChange={form.handleBrandChange}
						selectedBrand={form.selectedBrand}
						concentrationPercent={form.concentrationPercent}
						setConcentrationPercent={form.setConcentrationPercent}
						calculation={form.calculation}
					/>

					<GeneralCleaningExposureFields
						exposureMinutes={form.exposureMinutes}
						setExposureMinutes={form.setExposureMinutes}
						uvMinutes={form.uvMinutes}
						setUvMinutes={form.setUvMinutes}
						ventilationMinutes={form.ventilationMinutes}
						setVentilationMinutes={form.setVentilationMinutes}
						operatorStaffName={form.operatorStaffName}
						setOperatorStaffName={form.setOperatorStaffName}
						nextPlannedDate={form.nextPlannedDate}
					/>

					<div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#e2e8f0)] text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={form.isSubmitting}
							disabled={form.isSubmitting}
							className="min-h-[44px] px-6 py-2 rounded-xl bg-[var(--teal,#0d9488)] text-white text-sm font-extrabold hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2 cursor-pointer"
						>
							<CheckCircle2 size={18} />
							<span>{form.isSubmitting ? "Сохранение..." : "Зафиксировать генеральную уборку"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
