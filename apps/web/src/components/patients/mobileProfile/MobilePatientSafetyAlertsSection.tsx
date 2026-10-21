import { AlertOctagon, HeartPulse, ShieldCheck } from "lucide-react";
import React, { useCallback } from "react";
import { showToast } from "../../GlobalToast";

export interface MobilePatientSafetyAlertsSectionProps {
	readonly allergyText: string;
	readonly somaticRiskFlags: Array<{ id: string; title?: string; titleRu?: string; desc?: string; description?: string }>;
	readonly updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
}

export function MobilePatientSafetyAlertsSection({
	allergyText,
	somaticRiskFlags,
	updatePatientCoreDraft,
}: MobilePatientSafetyAlertsSectionProps) {
	const handleApplySomaticNorm = useCallback(() => {
		if (updatePatientCoreDraft) {
			updatePatientCoreDraft("notes", "Соматически здоров. Физиологическая норма. Аллергоанамнез не отягощен.");
			showToast("Применена физиологическая норма: соматически здоров", "success");
		}
	}, [updatePatientCoreDraft]);

	return (
		<div className="px-3.5 pt-2 flex flex-col gap-2" data-testid="mobile-safety-alerts-section">
			{allergyText ? (
				<div
					className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-950 dark:text-rose-100 flex items-start gap-2.5 shadow-2xs"
					role="alert"
					data-testid="mobile-allergy-alert"
				>
					<AlertOctagon size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
							Аллергический статус:
						</div>
						<div className="text-xs font-bold text-rose-950 dark:text-rose-100 break-words mt-0.5">
							{allergyText}
						</div>
					</div>
				</div>
			) : null}

			{somaticRiskFlags.length > 0 ? (
				<div
					className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-950 dark:text-purple-100 flex items-start gap-2.5 shadow-2xs"
					role="alert"
					data-testid="mobile-somatic-alert"
				>
					<HeartPulse size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
							Соматический статус:
						</div>
						<div className="flex items-center gap-1.5 flex-wrap mt-1">
							{somaticRiskFlags.map((flag: any) => (
								<span
									key={flag.id}
									className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-900 dark:text-purple-200 border border-purple-500/25 text-xs font-medium"
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
					className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-center justify-between gap-2 shadow-2xs"
					data-testid="mobile-healthy-norm-banner"
				>
					<div className="flex items-center gap-2">
						<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="font-semibold text-emerald-800 dark:text-emerald-300">
							Соматически здоров / физиологическая норма
						</span>
					</div>
					<button
						type="button"
						onClick={handleApplySomaticNorm}
						className="text-[11px] font-bold text-[var(--teal)] underline cursor-pointer"
					>
						Изменить
					</button>
				</div>
			) : null}
		</div>
	);
}
