/**
 * EgiszPreflightTab.tsx
 *
 * Tab 3: Preflight Validation Engine & Rules Inspector.
 * Verifies NSI Ministry of Health OID roots, SNILS checksum, and clinical mandatory fields.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EgiszPreflightReport, FnsTaxPreflightReport } from "../egiszRemdEngine";

export interface EgiszPreflightTabProps {
	readonly preflightReport: EgiszPreflightReport | FnsTaxPreflightReport;
}

export const EgiszPreflightTab: React.FC<EgiszPreflightTabProps> = ({ preflightReport }) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "1rem",
					borderRadius: "8px",
					background: preflightReport.isValid ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
					border: `1px solid ${preflightReport.isValid ? "var(--success)" : "var(--danger)"}`,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
					{preflightReport.isValid ? (
						<CheckCircle2 size={28} color="var(--success)" />
					) : (
						<AlertCircle size={28} color="var(--danger)" />
					)}
					<div>
						<div style={{ fontSize: "1rem", fontWeight: 700 }}>
							{preflightReport.isValid ? "Документ полностью готов к передаче" : "Обнаружены блокирующие ошибки валидации"}
						</div>
						<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
							Успешно проверок: {preflightReport.passedCount} из {preflightReport.totalChecks} &bull; Ошибок: {preflightReport.failedCount} &bull; Предупреждений: {preflightReport.warningCount}
						</div>
					</div>
				</div>
				<div
					style={{
						fontSize: "1.5rem",
						fontWeight: 800,
						color: preflightReport.isValid ? "var(--success)" : "var(--danger)",
					}}
				>
					{preflightReport.scorePercent}%
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
				{preflightReport.checks.map((chk) => (
					<div
						key={chk.id}
						style={{
							display: "flex",
							alignItems: "flex-start",
							gap: "0.75rem",
							padding: "0.75rem 1rem",
							borderRadius: "6px",
							background: "var(--paper)",
							border: "1px solid var(--line)",
						}}
					>
						{chk.status === "passed" && (
							<CheckCircle2 size={18} color="var(--success)" style={{ marginTop: "2px", flexShrink: 0 }} />
						)}
						{chk.status === "failed" && (
							<AlertCircle size={18} color="var(--danger)" style={{ marginTop: "2px", flexShrink: 0 }} />
						)}
						{chk.status === "warning" && (
							<AlertTriangle size={18} color="var(--warning)" style={{ marginTop: "2px", flexShrink: 0 }} />
						)}
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>
								{chk.title}
								{chk.oid && (
									<span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
										OID: {chk.oid}
									</span>
								)}
							</div>
							<div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.15rem" }}>
								{chk.details}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
