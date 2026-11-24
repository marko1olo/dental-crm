import { AlertOctagon, HeartPulse, ShieldCheck } from "lucide-react";
import React, { useCallback } from "react";
import type { PatientCoreDraft } from "../../../AppConstants";
import { showToast } from "../../GlobalToast";

export interface SomaticRiskFlagItem {
	id: string;
	title?: string | undefined;
	titleRu?: string | undefined;
	desc?: string | undefined;
	description?: string | undefined;
}

export interface MobilePatientSafetyAlertsSectionProps {
	readonly allergyText: string;
	readonly somaticRiskFlags: Array<SomaticRiskFlagItem>;
	readonly updatePatientCoreDraft?: ((field: keyof PatientCoreDraft, value: string) => void) | undefined;
	readonly onOpenCardTab?: (() => void) | undefined;
	readonly onApplyNorm?: (() => void) | undefined;
}

export function MobilePatientSafetyAlertsSection({
	allergyText,
	somaticRiskFlags,
	updatePatientCoreDraft,
	onOpenCardTab,
	onApplyNorm,
}: MobilePatientSafetyAlertsSectionProps) {
	const handleApplySomaticNorm = useCallback(() => {
		if (onApplyNorm) {
			onApplyNorm();
			return;
		}
		showToast("Применена физиологическая норма: соматически здоров", "success");
	}, [onApplyNorm]);

	return (
		<div className="px-3.5 pt-2 flex flex-col gap-2" data-testid="mobile-safety-alerts-section">
			{allergyText ? (
				<div
					className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--ink)] flex items-start gap-2.5 shadow-2xs"
					role="alert"
					data-testid="mobile-allergy-alert"
				>
					<AlertOctagon size={18} className="text-[var(--danger)] shrink-0 mt-0.5" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-semibold text-[var(--danger)]">
							Аллергический статус:
						</div>
						<div className="text-xs font-bold text-[var(--ink)] break-words mt-0.5">
							{allergyText}
						</div>
					</div>
				</div>
			) : null}

			{somaticRiskFlags.length > 0 ? (
				<div
					className="p-3 rounded-xl bg-[var(--warning-soft)] border border-[var(--warning)]/30 text-[var(--ink)] flex items-start gap-2.5 shadow-2xs"
					role="alert"
					data-testid="mobile-somatic-alert"
				>
					<HeartPulse size={18} className="text-[var(--warning)] shrink-0 mt-0.5" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-semibold text-[var(--warning)]">
							Соматический статус:
						</div>
						<div className="flex items-center gap-1.5 flex-wrap mt-1">
							{somaticRiskFlags.map((flag) => (
								<span
									key={flag.id}
									className="px-2 py-0.5 rounded-lg bg-[var(--warning-soft)] text-[var(--ink)] border border-[var(--warning)]/30 text-xs font-medium"
									title={flag.desc || flag.description}
								>
									{flag.title || flag.titleRu}
								</span>
							))}
						</div>
					</div>
				</div>
			) : null}

			{!allergyText && somaticRiskFlags.length === 0 ? (
				<div
					className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink-muted)] flex items-center justify-between gap-2 shadow-2xs"
					data-testid="mobile-healthy-norm-banner"
				>
					<div className="flex items-center gap-2">
						<ShieldCheck size={16} className="text-[var(--success)] shrink-0" />
						<span className="font-semibold text-[var(--ink)]">
							Соматически здоров / физиологическая норма
						</span>
					</div>
					<button
						type="button"
						onClick={onOpenCardTab || handleApplySomaticNorm}
						className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-[var(--primary)] hover:underline inline-flex items-center cursor-pointer"
					>
						Изменить
					</button>
				</div>
			) : null}
		</div>
	);
}
