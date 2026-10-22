import { ShieldAlert, Syringe } from "lucide-react";
import type { AnestheticDrugId, AnestheticDrugInfo } from "../anesthesiaCatalog";

export interface SafetyWarningState {
	readonly title: string;
	readonly text: string;
	readonly carpulesCount?: number | undefined;
	readonly suggestedDrugId?: AnestheticDrugId | undefined;
}

export interface AnesthesiaSafetyAllergyHudProps {
	readonly patientWeightKg: number;
	readonly isCardioRisk: boolean;
	readonly takesBetaBlockers: boolean;
	readonly hasSulfiteAllergy: boolean;
	readonly hasBronchialAsthma: boolean;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly selectedDrugId: AnestheticDrugId;
	readonly selectedDrugInfo: AnestheticDrugInfo;
	readonly safetyWarning: SafetyWarningState | null;
	readonly onSelectDrug: (drugId: AnestheticDrugId) => void;
	readonly onDismissWarning: () => void;
	readonly onConfirmWarningOverride: (carpulesCount: number) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

const PASSIVE_WARN_ICON = String.fromCodePoint(0x26a0, 0xfe0f);

export function AnesthesiaSafetyAllergyHud({
	patientWeightKg,
	isCardioRisk,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	selectedDrugId,
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
	onOpenEmergencyProtocol,
	disabled = false,
}: AnesthesiaSafetyAllergyHudProps) {
	const isLidocaineAllergic =
		hasLidocaineAllergy && selectedDrugId?.startsWith("lidocaine");

	return (
		<div className="flex flex-col gap-2">
			{/* Top Bar: Title & Somatic Tags & Weight & Configure */}
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 flex-wrap min-w-0">
					<span className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)] shrink-0">
						<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
						<span>Местная анестезия</span>
					</span>

					<span
						className="text-[11px] font-medium text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0"
						title="Стандартный взрослый вес для расчёта безопасной дозировки"
					>
						{`МДД по массе тела ${patientWeightKg} кг`}
					</span>

					{hasLidocaineAllergy && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="allergy-passive-badge"
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия: Лидокаин`}</span>
						</span>
					)}

					{hasArticaineAllergy && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="allergy-passive-badge-articaine"
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия: Артикаин`}</span>
						</span>
					)}

					{(hasSulfiteAllergy || hasBronchialAsthma) && (
						<span
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0"
							data-testid="anesthesia-passive-allergy-alert"
						>
							<span>{`${PASSIVE_WARN_ICON} Аллергия на сульфиты/бронхиальная астма`}</span>
						</span>
					)}

					{isCardioRisk && (
						<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 shrink-0">
							<span>{`${PASSIVE_WARN_ICON} Кардио-контроль`}</span>
						</span>
					)}
				</div>

				{onOpenEmergencyProtocol && (
					<button
						type="button"
						disabled={disabled}
						onClick={onOpenEmergencyProtocol}
						className="px-2.5 py-1 min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
						data-testid="btn-anesthesia-quick-emergency"
					>
						<ShieldAlert size={13} className="shrink-0" />
						<span>Аптечка</span>
					</button>
				)}
			</div>

			{/* Выделенный алерт при выборе Лидокаина пациенту с аллергией */}
			{isLidocaineAllergic && (
				<div
					data-testid="anesthesia-lidocaine-allergy-warning-badge"
					className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100 text-xs shadow-2xs"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-bold">{`${PASSIVE_WARN_ICON} Аллергия на Лидокаин!`}</span>
						<span className="text-[var(--ink-muted)] truncate">
							У пациента зафиксирована гиперчувствительность к Лидокаину.
						</span>
					</div>
					<button
						type="button"
						disabled={disabled}
						data-testid="btn-switch-to-scandonest-safe"
						className="px-3 py-1.5 min-h-[44px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center shrink-0"
						onClick={() => onSelectDrug("mepivacaine_plain")}
					>
						Выбрать Скандонест 3%
					</button>
				</div>
			)}

			{/* Passive Clinical Advisory Banner (Non-blocking, Mandates 8e & 8y) */}
			{safetyWarning && (
				<div
					className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shadow-2xs"
					role="status"
					data-testid="anesthesia-passive-safety-advisory"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="font-bold">{`${PASSIVE_WARN_ICON} ${safetyWarning.title}: `}</span>
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
		</div>
	);
}
