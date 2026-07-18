import { Store } from "lucide-react";
import type { ClinicMode } from "@dental/shared";
import type React from "react";

interface ClinicModeSectionProps {
	dashboard: any;
	clinicModeLabels: Record<string, { title: string; detail: string }>;
	typedClinicModes: ClinicMode[];
	changeClinicMode: (mode: ClinicMode) => void;
}

export const ClinicModeSection: React.FC<ClinicModeSectionProps> = ({
	dashboard,
	clinicModeLabels,
	typedClinicModes,
	changeClinicMode,
}) => {
	const currentMode = dashboard?.clinicSettings?.profile?.mode;

	return (
		<section className="clinic-section-card" aria-label="Режим продукта">
			<div className="clinic-section-header">
				<div className="clinic-section-icon">
					<Store size={24} />
				</div>
				<div className="clinic-section-title">
					<h3>Режим работы продукта</h3>
					<p>Настройте Dental CRM под специфику вашей клиники</p>
				</div>
				<div className="clinic-mode-status">
					<span className="status-pill status-confirmed">
						Готовность: {dashboard?.shiftIntelligence?.modeFit?.fitScore ?? 0}%
					</span>
				</div>
			</div>

			<div className="clinic-mode-selector">
				{typedClinicModes.map((mode) => (
					<button
						className={`clinic-mode-card ${currentMode === mode ? "active" : ""}`}
						key={mode}
						type="button"
						aria-pressed={currentMode === mode}
						onClick={() => changeClinicMode(mode)}
					>
						<h4>{clinicModeLabels[mode]?.title ?? mode}</h4>
						<p>{clinicModeLabels[mode]?.detail ?? ""}</p>
					</button>
				))}
			</div>
		</section>
	);
};
