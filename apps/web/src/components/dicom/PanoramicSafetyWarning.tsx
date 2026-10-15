import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle, Info } from "lucide-react";
import type { AnatomicalProximityAudit } from "./PanoramicSafetyEngine";

export interface PanoramicSafetyWarningProps {
	readonly audit: AnatomicalProximityAudit;
	readonly className?: string | undefined;
}

/**
 * Soft Non-Blocking Safety Warning Banner (Mandate 8e: Doctor Autonomy).
 * Informs the surgeon of proximity to critical anatomical structures (Mandibular canal,
 * mental foramen, maxillary sinus floor) without blocking clinical workflow or disabling actions.
 */
export const PanoramicSafetyWarning: React.FC<PanoramicSafetyWarningProps> = ({
	audit,
	className = "",
}) => {
	if (!audit.isWarning && !audit.isCritical) {
		return (
			<div
				className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${className}`}
				style={{
					background: "var(--paper-soft, rgba(255, 255, 255, 0.04))",
					borderColor: "var(--line, rgba(255, 255, 255, 0.1))",
					color: "var(--ink, #ffffff)",
				}}
				data-testid="panoramic-safety-safe"
			>
				<div className="flex items-center gap-1.5">
					<CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
					<span className="text-[11px] font-semibold text-emerald-300">
						Анатомический зазор безопасен (≥ 2.0 мм)
					</span>
				</div>
				<div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
					{audit.distanceToMandibularCanalMm !== null && (
						<span>Канал IAN: {audit.distanceToMandibularCanalMm.toFixed(1)} мм</span>
					)}
					{audit.distanceToMentalForamenMm !== null && (
						<span>Мент. отв.: {audit.distanceToMentalForamenMm.toFixed(1)} мм</span>
					)}
					{audit.distanceToSinusFloorMm !== null && (
						<span>Пазуха: {audit.distanceToSinusFloorMm.toFixed(1)} мм</span>
					)}
				</div>
			</div>
		);
	}

	const isCrit = audit.isCritical;

	return (
		<div
			className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs shadow-md transition-all ${className}`}
			style={{
				background: isCrit
					? "var(--danger-soft, rgba(239, 68, 68, 0.15))"
					: "var(--warning-soft, rgba(245, 158, 11, 0.15))",
				borderColor: isCrit
					? "var(--danger-border, rgba(239, 68, 68, 0.4))"
					: "var(--warning-border, rgba(245, 158, 11, 0.4))",
				color: "var(--ink, #ffffff)",
			}}
			data-testid="panoramic-safety-warning-banner"
		>
			<div className="flex items-center gap-2 min-w-0">
				{isCrit ? (
					<ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
				) : (
					<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
				)}
				<span
					className={`text-[11px] font-bold leading-tight ${
						isCrit ? "text-red-300" : "text-amber-200"
					}`}
				>
					{audit.warningMessageRu ?? "Внимание: сближение с критической анатомической зоной!"}
				</span>
			</div>

			<div className="flex items-center gap-2 shrink-0 text-[11px]">
				<span
					className="px-2 py-0.5 rounded font-mono font-bold text-white shadow-xs"
					style={{
						background: isCrit ? "var(--red, #ef4444)" : "var(--amber, #f59e0b)",
					}}
				>
					Зазор: {audit.minClearanceMm?.toFixed(1) ?? "--"} мм
				</span>
				<span className="text-[10px] text-neutral-300 italic hidden md:inline">
					(Мандат 8e: действие не заблокировано)
				</span>
			</div>
		</div>
	);
};
