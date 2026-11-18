import { AlertTriangle, Zap } from "lucide-react";
import React from "react";
import type { SomaticAlertItem } from "../../../../store/telephonyStore";

export interface TelephonyDrawerSomaticAlertsProps {
	somaticAlerts: SomaticAlertItem[];
	onQuickBookUrgent: () => void;
}

export function TelephonyDrawerSomaticAlerts({
	somaticAlerts,
	onQuickBookUrgent,
}: TelephonyDrawerSomaticAlertsProps): React.JSX.Element | null {
	if (somaticAlerts.length === 0) return null;

	const hasPain = somaticAlerts.some((a) => a.category === "pain");

	return (
		<div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-[var(--ink)] space-y-1.5">
			<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)]">
				<AlertTriangle size={14} className="text-[var(--danger)]" />
				<span>Медицинские предупреждения:</span>
			</div>
			<div className="space-y-1">
				{somaticAlerts.map((alert, idx) => (
					<div key={idx} className="flex items-start gap-1.5 text-xs">
						<span className="text-[var(--danger)] font-bold">•</span>
						<span>
							<strong>{alert.label}</strong>
							<span className="text-[var(--ink-muted)] ml-1">
								({alert.category === "allergy" ? "Аллергия" : alert.category === "pain" ? "Острая боль" : "Внимание"})
							</span>
						</span>
					</div>
				))}
			</div>
			{hasPain && (
				<button
					type="button"
					onClick={onQuickBookUrgent}
					className="w-full mt-2 min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--danger)] hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
					data-testid="drawer-action-cito"
					title="Внеочередная экстренная запись пациента с острой болью"
				>
					<Zap size={14} />
					<span>Записать вне очереди (Острая боль / Cito)</span>
				</button>
			)}
		</div>
	);
}
