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
		<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
			<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
				<AlertTriangle size={14} className="text-rose-600" />
				<span>Медицинские предупреждения:</span>
			</div>
			<div className="space-y-1">
				{somaticAlerts.map((alert, idx) => (
					<div key={idx} className="flex items-start gap-1.5 text-xs">
						<span className="text-rose-500 font-bold">•</span>
						<span>
							<strong>{alert.label}</strong>
							<span className="text-rose-600/80 dark:text-rose-400/80 ml-1">
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
					className="w-full mt-2 min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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
