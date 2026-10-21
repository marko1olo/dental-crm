import { AnesthesiaAllergyAlertBanners } from "./AnesthesiaAllergyAlertBanners";
import { AnesthesiaSafetyHeader } from "./AnesthesiaSafetyHeader";
import type { AnesthesiaSafetyAllergyHudProps } from "./types";

export function AnesthesiaSafetyAllergyHud({
	patientWeightKg,
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	selectedDrugId,
	selectedDrugInfo,
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
	onOpenEmergencyProtocol,
	disabled = false,
}: AnesthesiaSafetyAllergyHudProps) {
	return (
		<>
			{/* Top Bar: Title & Somatic Tags & Weight & Configure */}
			<AnesthesiaSafetyHeader
				patientWeightKg={patientWeightKg}
				isCardioRisk={isCardioRisk}
				takesBetaBlockers={takesBetaBlockers}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				onOpenEmergencyProtocol={onOpenEmergencyProtocol}
			/>

			{/* Dedicated Allergy and Somatic Alert Banners */}
			<AnesthesiaAllergyAlertBanners
				isCardioRisk={isCardioRisk}
				takesBetaBlockers={takesBetaBlockers}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				selectedDrugId={selectedDrugId}
				selectedDrugInfo={selectedDrugInfo}
				onSelectDrug={onSelectDrug}
			/>

			{/* Passive Clinical Advisory Banner (Non-blocking, Mandates 8e & 8y) */}
			{safetyWarning && (
				<div
					className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shadow-2xs"
					role="status"
					data-testid="anesthesia-passive-safety-advisory"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-bold">{`${String.fromCodePoint(0x26a0, 0xfe0f)} ${safetyWarning.title}: `}</span>
						<span className="text-[var(--ink-muted)] truncate">
							{safetyWarning.text}
						</span>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							disabled={disabled}
							data-testid="btn-anesthesia-confirm-override"
							className="px-3 py-1.5 min-h-[44px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer transition-colors inline-flex items-center disabled:opacity-50"
							onClick={() => {
								const count = safetyWarning.carpulesCount ?? 1.0;
								onDismissWarning();
								onConfirmWarningOverride(count);
							}}
							title="Подтвердить клиническое назначение врача"
						>
							Всё равно внести (врачебное решение)
						</button>
						<button
							type="button"
							disabled={disabled}
							className="px-2 py-1 min-h-[44px] text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-50 font-bold"
							onClick={onDismissWarning}
							aria-label="Закрыть"
						>
							×
						</button>
					</div>
				</div>
			)}
		</>
	);
}
