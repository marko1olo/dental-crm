/**
 * DmsCoverageSummaryBanner.tsx — Наглядный индикатор страхового покрытия ДМС
 * (Мандат 8b: <= 120 строк)
 */

import { formatDateRu } from "@dental/shared";
import { CheckCircle2, Percent, ShieldCheck } from "lucide-react";
import React from "react";
import { formatRubKopecks } from "../insuranceMath.js";
import { DmsCoverageStatsRow } from "./DmsCoverageStatsRow.js";
import type { DmsFranchiseKind, DmsLetterLifecycleStatus, PatientDmsProfile } from "./types.js";

export { DmsCoverageStatsRow } from "./DmsCoverageStatsRow.js";

export interface DmsCoverageSummaryBannerProps {
	readonly patient?: PatientDmsProfile | undefined;
	readonly insurerDisplayName: string;
	readonly letterNumber: string;
	readonly maxCoverageRub: number;
	readonly usedAmountRub: number;
	readonly remainingLimitRub: number;
	readonly usagePercent: number;
	readonly franchiseType: DmsFranchiseKind;
	readonly franchisePct: number;
	readonly franchiseFixedRub: number;
	readonly status: DmsLetterLifecycleStatus;
}

export function DmsCoverageSummaryBanner({
	patient,
	insurerDisplayName,
	letterNumber,
	maxCoverageRub,
	usedAmountRub,
	remainingLimitRub,
	usagePercent,
	franchiseType,
	franchisePct,
	franchiseFixedRub,
	status,
}: DmsCoverageSummaryBannerProps) {
	const statusLabel =
		status === "active" ? "Активно" : status === "expired" ? "Истекло" : status === "exhausted" ? "Исчерпано" : "Отозвано";

	const coPayLabel =
		franchiseType === "percent"
			? franchisePct > 0 ? `${franchisePct}% доплата пациента` : "0% (100% покрытие ДМС)"
			: franchiseFixedRub > 0 ? `${formatRubKopecks(franchiseFixedRub)} за визит` : "0 ₽ (100% покрытие ДМС)";

	return (
		<div className="dms-card" data-testid="dms-coverage-summary-banner" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>
						<ShieldCheck size={14} style={{ color: "var(--teal, #0d9488)" }} />
						<span>Застрахованное лицо &bull; {insurerDisplayName} &bull; № {letterNumber || "Без номера"}</span>
					</div>
					{patient && (
						<div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }} className="truncate" title={patient.fullName}>
							{patient.fullName || "Пациент клиники"}
						</div>
					)}
					{patient?.birthDate && (
						<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>Дата рождения: {formatDateRu(patient.birthDate)}</div>
					)}
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span className="dms-badge dms-badge-active" style={{ textTransform: "none" }}>
						<Percent size={12} />
						<span>Франшиза: {coPayLabel}</span>
					</span>
					<span className={`dms-badge dms-badge-${status}`}>
						<CheckCircle2 size={12} />
						<span>{statusLabel}</span>
					</span>
				</div>
			</div>
			<DmsCoverageStatsRow
				maxCoverageRub={maxCoverageRub}
				usedAmountRub={usedAmountRub}
				remainingLimitRub={remainingLimitRub}
				usagePercent={usagePercent}
			/>
		</div>
	);
}
