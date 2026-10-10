/**
 * DmsCoverageSummaryBanner.tsx — Наглядный индикатор страхового покрытия ДМС:
 * профиль застрахованного пациента, лимит письма, израсходованная сумма,
 * доступный остаток, доля сооплаты пациента (франшиза) и визуальный прогресс-бар.
 */

import { CheckCircle2, Percent, ShieldCheck } from "lucide-react";
import React from "react";
import { formatRubKopecks } from "../insuranceMath";
import type {
	DmsFranchiseKind,
	DmsLetterLifecycleStatus,
	PatientDmsProfile,
} from "./types";

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
		status === "active"
			? "Активно"
			: status === "expired"
			? "Истекло"
			: status === "exhausted"
			? "Исчерпано"
			: "Отозвано";

	const coPayLabel =
		franchiseType === "percent"
			? franchisePct > 0
				? `${franchisePct}% доплата пациента`
				: "0% (100% покрытие ДМС)"
			: franchiseFixedRub > 0
			? `${formatRubKopecks(franchiseFixedRub)} за визит`
			: "0 ₽ (100% покрытие ДМС)";

	const barColor =
		usagePercent >= 100
			? "var(--bad-fg, #dc2626)"
			: usagePercent >= 80
			? "var(--warn-fg, #d97706)"
			: "var(--teal, #0d9488)";

	return (
		<div
			className="dms-card"
			data-testid="dms-coverage-summary-banner"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted, #64748b)",
						}}
					>
						<ShieldCheck size={14} style={{ color: "var(--teal, #0d9488)" }} />
						<span>
							Застрахованное лицо (Пациент) &bull; {insurerDisplayName} &bull; №{" "}
							{letterNumber || "Без номера"}
						</span>
					</div>
					{patient && (
						<div
							style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "2px" }}
							className="truncate"
							title={patient.fullName}
						>
							{patient.fullName || "Пациент клиники"}
						</div>
					)}
					{patient?.birthDate && (
						<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
							Дата рождения: {patient.birthDate}
						</div>
					)}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
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

			{/* Сводная полоса: Лимит письма / Использовано / Остаток */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
					gap: "12px",
					paddingTop: "10px",
					borderTop: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Лимит гарантийного письма
					</div>
					<div
						className="font-mono"
						style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}
					>
						{formatRubKopecks(maxCoverageRub)}
					</div>
				</div>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Использовано ({usagePercent}%)
					</div>
					<div
						className="font-mono"
						style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}
					>
						{formatRubKopecks(usedAmountRub)}
					</div>
				</div>
				<div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Доступный остаток лимита
					</div>
					<div
						className="font-mono"
						style={{
							fontSize: "0.95rem",
							fontWeight: 700,
							color: "var(--teal, #0d9488)",
						}}
					>
						{formatRubKopecks(remainingLimitRub)}
					</div>
				</div>
			</div>

			{/* Тонкий прогресс-бар использования лимита ГП */}
			<div
				style={{
					height: "6px",
					width: "100%",
					background: "var(--line, #e2e8f0)",
					borderRadius: "999px",
					overflow: "hidden",
				}}
				aria-label={`Использовано ${usagePercent}% лимита гарантийного письма`}
			>
				<div
					style={{
						height: "100%",
						width: `${usagePercent}%`,
						background: barColor,
						transition: "width 0.2s ease",
					}}
				/>
			</div>
		</div>
	);
}
