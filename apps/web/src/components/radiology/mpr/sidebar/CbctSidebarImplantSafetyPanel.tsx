/**
 * CbctSidebarImplantSafetyPanel.tsx — Панель безопасности имплантации и клиренса нерва (Мандат 8b).
 */

import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

export interface CbctSidebarImplantSafetyPanelProps {
	readonly nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayTorque: string;
	readonly displayDrillingProtocol: string;
}

export const CbctSidebarImplantSafetyPanel: React.FC<CbctSidebarImplantSafetyPanelProps> = ({
	nerveAuditResult,
	displayBoneClass,
	displayMeanHU,
	displayTorque,
	displayDrillingProtocol,
}) => {
	const { isDangerous, isWarning, netClearanceToCanalWallMm, clinicalMessageRu } = nerveAuditResult;

	return (
		<div className="flex flex-col gap-2 p-2.5 bg-[var(--paper)] rounded-lg border border-[var(--line)] text-xs">
			<div className="flex justify-between items-center">
				<span className="font-semibold text-[var(--text)]">Безопасность имплантации</span>
				<div className="flex items-center gap-1">
					{isDangerous ? (
						<span className="flex items-center gap-1 text-[10px] text-[var(--danger)] font-bold">
							<ShieldAlert className="w-3.5 h-3.5" /> Риск
						</span>
					) : (
						<span className="flex items-center gap-1 text-[10px] text-[var(--primary)] font-bold">
							<ShieldCheck className="w-3.5 h-3.5" /> Безопасно
						</span>
					)}
				</div>
			</div>

			<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)] flex items-center justify-between">
				<div>
					<div className="text-[10px] text-[var(--text-muted)]">Зазор до канала нерва</div>
					<div className={`text-sm font-bold ${isDangerous ? "text-[var(--danger)]" : isWarning ? "text-[var(--warning,orange)]" : "text-[var(--primary)]"}`}>
						{netClearanceToCanalWallMm.toFixed(1)} мм (буфер 2.0 мм)
					</div>
				</div>
				<div className="text-right">
					<div className="text-[10px] text-[var(--text-muted)]">Кость / Торк</div>
					<div className="text-xs font-semibold text-[var(--text)]">
						{displayBoneClass} ({displayMeanHU ?? 480} HU) · {displayTorque}
					</div>
				</div>
			</div>

			<div className="text-[10px] text-[var(--text-muted)] leading-tight">
				{displayDrillingProtocol}
			</div>

			{clinicalMessageRu && (
				<div className="text-[10px] text-[var(--text-muted)] italic">
					{clinicalMessageRu}
				</div>
			)}
		</div>
	);
};
