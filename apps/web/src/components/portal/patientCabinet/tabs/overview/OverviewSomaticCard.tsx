import React from "react";
import { AlertTriangle, Heart, Smartphone } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine";

export interface OverviewSomaticCardProps {
	readonly data: PatientPersonalCabinetData;
	readonly onOpenSelfCheckin: () => void;
}

export const OverviewSomaticCard: React.FC<OverviewSomaticCardProps> = ({
	data,
	onOpenSelfCheckin,
}) => {
	const hasAlerts = data.somaticAlerts && data.somaticAlerts.length > 0;

	return (
		<div className="pc-card" data-testid="pc-somatic-card">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<Heart size={18} className="pc-icon-primary" />
					<span>Анкета соматического здоровья и факторов риска</span>
				</div>
				<button
					type="button"
					className="pc-btn-primary pc-btn-compact"
					onClick={onOpenSelfCheckin}
					data-testid="open-self-checkin-btn"
				>
					<Smartphone size={14} />
					<span>Мобильный самочекин</span>
				</button>
			</div>

			{hasAlerts ? (
				<div className="pc-somatic-alerts-list">
					{data.somaticAlerts.map((alert) => (
						<div key={alert.id} className={`pc-somatic-alert-item ${alert.severity}`}>
							<strong className="pc-somatic-alert-title">
								<AlertTriangle size={14} />
								<span>{alert.title}</span>
							</strong>
							<p className="pc-somatic-alert-msg">{alert.message}</p>
							<div className="pc-somatic-action">
								<strong>Рекомендация врача:</strong> {alert.recommendedAction}
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="pc-somatic-clean-note">
					Анкета здоровья заполнена. Выраженных противопоказаний к анестетикам и амбулаторным вмешательствам не выявлено.
				</p>
			)}
		</div>
	);
};
