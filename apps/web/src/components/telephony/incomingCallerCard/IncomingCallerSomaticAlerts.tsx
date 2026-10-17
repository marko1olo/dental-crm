import React from "react";
import { AlertTriangle } from "lucide-react";
import type { PatientSomaticAlert } from "../../../store/telephonyTypes";

interface IncomingCallerSomaticAlertsProps {
	somaticAlerts: PatientSomaticAlert[];
}

export const IncomingCallerSomaticAlerts: React.FC<IncomingCallerSomaticAlertsProps> = ({
	somaticAlerts,
}) => {
	if (somaticAlerts.length === 0) return null;

	return (
		<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-1.5">
			<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
				<AlertTriangle size={14} className="text-rose-600" />
				<span>Медицинские предупреждения:</span>
			</div>
			<div className="space-y-1">
				{somaticAlerts.map((alert, idx) => {
					const categoryLabel =
						alert.category === "allergy"
							? "Аллергия"
							: alert.category === "pain"
								? "Острая боль"
								: alert.category === "chronic"
									? "Хроническое"
									: alert.category === "risk"
										? "Фактор риска"
										: alert.severity === "high"
											? "Высокий риск"
											: alert.severity === "medium"
												? "Умеренный риск"
												: alert.severity === "info"
													? "Информация"
													: "Внимание";
					const alertText = alert.label || (alert as any).text || "Предупреждение";

					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: simple alert items
						<div key={idx} className="flex items-start gap-1.5 text-xs">
							<span className="text-rose-500 font-bold">•</span>
							<span>
								<strong>{alertText}</strong>
								<span className="text-rose-600/80 dark:text-rose-400/80 ml-1">
									({categoryLabel})
								</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
