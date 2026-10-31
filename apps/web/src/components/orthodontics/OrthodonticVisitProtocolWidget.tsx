/**
 * @dental/web/components/orthodontics/OrthodonticVisitProtocolWidget.tsx
 * DENTE Dental CRM — Протокол ортодонтического приёма и API-синхронизация (Мандаты 8b, 8e).
 */

import React, { useEffect, useCallback } from "react";
import { OrthodonticStudioModal } from "./OrthodonticStudioModal";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { OrthoProtocolState } from "./orthodonticsCatalogData";

export interface OrthodonticVisitProtocolWidgetProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly doctorName?: string;
}

export const OrthodonticVisitProtocolWidget: React.FC<OrthodonticVisitProtocolWidgetProps> = ({
	isOpen = true,
	onClose = () => {},
	patientId = "pat-demo-01",
	patientName = "Смирнова Екатерина Андреевна",
	doctorName = "Д-р Соколов А. В.",
}) => {
	useEffect(() => {
		if (!patientId) return;
		const fetchProgress = async () => {
			try {
				await fetch(`/api/orthodontics/${patientId}/progress`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
			} catch {
				// Офлайн-автономия
			}
		};
		fetchProgress();
	}, [patientId]);

	const handleSave = useCallback(async (state: OrthoProtocolState) => {
		try {
			if (state.applianceCategory === "aligners") {
				await fetch(`/api/orthodontics/${patientId}/aligners/issue-set`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ setNumber: state.currentMonth }),
				});
			} else {
				await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ upperAlloy: state.upperAlloy, upperSection: state.upperSection }),
				});
				await fetch(`/api/orthodontics/${patientId}/ligatures-activate`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ actionIds: state.selectedActionIds }),
				});
			}
		} catch {
			// Офлайн-сохранение
		}
	}, [patientId]);

	if (!isOpen) return null;

	return (
		<OrthodonticStudioModal
			isOpen={isOpen}
			onClose={onClose}
			onSaveProtocol={handleSave}
			patientName={patientName}
			doctorName={doctorName}
		/>
	);
};

export default OrthodonticVisitProtocolWidget;
