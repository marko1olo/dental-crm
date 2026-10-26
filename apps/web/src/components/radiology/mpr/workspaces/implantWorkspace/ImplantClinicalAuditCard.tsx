/**
 * ImplantClinicalAuditCard.tsx — Карточка клинического аудита плотности кости и безопасности (Мандат 8b).
 */

import React from "react";
import { AlertTriangle, Check, ShieldAlert, ShieldCheck } from "lucide-react";

export interface ImplantClinicalAuditCardProps {
	readonly displayBoneClass: string;
	readonly displayMeanHU: number;
	readonly displayTorque: string;
	readonly displayNerveClearanceMm: number;
	readonly nerveSafetyStatus?: "safe" | "warning" | "danger" | undefined;
	readonly displayDrillingProtocol: string;
}

export const ImplantClinicalAuditCard: React.FC<ImplantClinicalAuditCardProps> = ({
	displayBoneClass,
	displayMeanHU,
	displayTorque,
	displayNerveClearanceMm,
	nerveSafetyStatus = "safe",
	displayDrillingProtocol,
}) => {
	const isDanger = nerveSafetyStatus === "danger";
	const isWarning = nerveSafetyStatus === "warning";

	return (
		<div className="flex items-center gap-3 p-2 bg-[var(--paper-strong)] border border-[var(--line)] rounded-lg text-xs flex-wrap sm:flex-nowrap">
			<div className="flex items-center gap-1.5">
				{isDanger ? (
					<ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
				) : (
					<ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
				)}
				<div>
					<span className="text-[10px] text-[var(--text-muted)] block">Зазор до нерва</span>
					<span className={`font-bold ${isDanger ? "text-[var(--danger)]" : isWarning ? "text-[var(--warning,orange)]" : "text-[var(--primary)]"}`}>
						{displayNerveClearanceMm.toFixed(1)} мм
					</span>
				</div>
			</div>

			<div className="w-px h-6 bg-[var(--line)] hidden sm:block" />

			<div>
				<span className="text-[10px] text-[var(--text-muted)] block">Кость Misch</span>
				<span className="font-semibold text-[var(--text)]">{displayBoneClass} ({displayMeanHU} HU)</span>
			</div>

			<div className="w-px h-6 bg-[var(--line)] hidden sm:block" />

			<div>
				<span className="text-[10px] text-[var(--text-muted)] block">Торк</span>
				<span className="font-semibold text-[var(--text)]">{displayTorque}</span>
			</div>

			<div className="w-px h-6 bg-[var(--line)] hidden sm:block" />

			<div className="text-[11px] text-[var(--text-muted)] truncate max-w-[260px]">
				{displayDrillingProtocol}
			</div>
		</div>
	);
};
