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
		<div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-[var(--ink)] space-y-1.5">
			<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--danger)]">
				<AlertTriangle size={14} className="text-[var(--danger)]" />
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
					const rawAlert = alert as { label?: string; text?: string; id?: string };
					const alertText = rawAlert.label || rawAlert.text || "Предупреждение";
					const key = rawAlert.id || `${alertText}-${idx}`;

					return (
						<div key={key} className="flex items-start gap-1.5 text-xs">
							<span className="text-[var(--danger)] font-bold">•</span>
							<span>
								<strong>{alertText}</strong>
								<span className="text-[var(--ink-muted)] ml-1">
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
