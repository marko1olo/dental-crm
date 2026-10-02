/**
 * DENTE CRM — DICOM AI Findings Drawer
 * Side-sheet displaying detected pathologies (caries, periodontitis, fillings)
 * with explicit practitioner confirmation before updating the dental chart.
 *
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { AlertTriangle, Check, Info, Loader2, Sparkles, X } from "lucide-react";
import { TOOTH_STATE_LABELS } from "../odontogram/ToothChart.js";
import type { planVisiographFindings } from "./visiographFindings.js";

export interface DicomAiFindingsDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly plan: ReturnType<typeof planVisiographFindings> | null;
	readonly selectedFindingCodes: Set<string>;
	readonly setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	readonly appliedToothCodes: readonly string[];
	readonly formulaFailure: string | null;
	readonly aiReport: string | null;
	readonly isApplyingToChart: boolean;
	readonly onApplyFindingsToChart: () => void;
}

export const DicomAiFindingsDrawer: React.FC<DicomAiFindingsDrawerProps> = ({
	isOpen,
	onClose,
	plan,
	selectedFindingCodes,
	setSelectedFindingCodes,
	appliedToothCodes,
	formulaFailure,
	aiReport,
	isApplyingToChart,
	onApplyFindingsToChart,
}) => {
	if (!isOpen) return null;

	return (
		<div
			data-testid="dicom-ai-findings-drawer"
			style={{
				width: "360px",
				backgroundColor: "#0f172a",
				borderLeft: "1px solid #1e293b",
				display: "flex",
				flexDirection: "column",
				zIndex: 10,
				boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.4)",
			}}
		>
			{/* Drawer Header */}
			<div
				style={{
					padding: "12px 16px",
					borderBottom: "1px solid #1e293b",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					backgroundColor: "#1e293b",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Sparkles size={16} color="#2dd4bf" />
					<span style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>
						Находки ИИ (Предварительный разбор)
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: "transparent",
						border: "none",
						color: "#94a3b8",
						cursor: "pointer",
						padding: "4px",
					}}
					title="Скрыть панель"
				>
					<X size={16} />
				</button>
			</div>

			{/* Drawer Body */}
			<div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
				<div
					style={{
						fontSize: "12px",
						color: "#cbd5e1",
						backgroundColor: "rgba(15, 23, 42, 0.6)",
						border: "1px solid #334155",
						borderRadius: "8px",
						padding: "10px",
						lineHeight: "1.4",
						display: "flex",
						alignItems: "flex-start",
						gap: "8px",
					}}
				>
					<Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
					<span>
						Предварительный анализ. Данные <strong>не перезаписывают</strong> зубную формулу автоматически. Врач проверяет снимок и подтверждает внесение.
					</span>
				</div>

				{plan && plan.groups.length > 0 ? (
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						<div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
							Предлагаемые изменения в формулу:
						</div>
						{plan.groups.map((group) => {
							const stateLabel = TOOTH_STATE_LABELS[group.state] || group.state;
							return (
								<div
									key={group.state}
									style={{
										backgroundColor: "#1e293b",
										borderRadius: "8px",
										padding: "10px",
										border: "1px solid #334155",
									}}
								>
									<div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
										{stateLabel}:
									</div>
									<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
										{group.teeth.map((t) => {
											const isChecked = selectedFindingCodes.has(t.code);
											const isApplied = appliedToothCodes.includes(t.code);
											return (
												<label
													key={t.code}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "10px",
														cursor: isApplied ? "default" : "pointer",
														fontSize: "13px",
														color: isApplied ? "#4ade80" : "#e2e8f0",
														userSelect: "none",
													}}
												>
													<input
														type="checkbox"
														checked={isChecked}
														disabled={isApplied}
														onChange={(e) => {
															const next = new Set(selectedFindingCodes);
															if (e.target.checked) next.add(t.code);
															else next.delete(t.code);
															setSelectedFindingCodes(next);
														}}
														style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0d9488" }}
													/>
													<span className="flex items-center gap-1">
														<span>Зуб #{t.code} — {stateLabel}</span>
														{isApplied && (
															<span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold ml-1">
																<Check size={12} /> внесено
															</span>
														)}
													</span>
												</label>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
						Патологических изменений, требующих изменения формулы, не обнаружено.
					</div>
				)}

				{plan && plan.noFormulaStateCodes.length > 0 && (
					<div
						style={{
							fontSize: "12px",
							color: "#fbbf24",
							backgroundColor: "rgba(245, 158, 11, 0.1)",
							border: "1px solid rgba(245, 158, 11, 0.3)",
							borderRadius: "8px",
							padding: "10px",
							lineHeight: "1.4",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<AlertTriangle size={14} style={{ flexShrink: 0 }} />
						<span>Зубы {plan.noFormulaStateCodes.join(", ")} требуют внимания/наблюдения. Отметьте их на одонтограмме вручную.</span>
					</div>
				)}

				{formulaFailure && (
					<div
						style={{
							fontSize: "12px",
							color: "#f87171",
							backgroundColor: "rgba(239, 68, 68, 0.1)",
							border: "1px solid rgba(239, 68, 68, 0.3)",
							borderRadius: "8px",
							padding: "10px",
							lineHeight: "1.4",
						}}
					>
						{formulaFailure}
					</div>
				)}

				{aiReport && (
					<details style={{ marginTop: "auto", fontSize: "12px", color: "#94a3b8" }}>
						<summary style={{ cursor: "pointer", padding: "6px 0", color: "#cbd5e1", fontWeight: 600 }}>
							Полный отчёт модели
						</summary>
						<div
							style={{
								whiteSpace: "pre-wrap",
								backgroundColor: "#020617",
								padding: "10px",
								borderRadius: "6px",
								border: "1px solid #1e293b",
								marginTop: "6px",
								maxHeight: "160px",
								overflowY: "auto",
								fontFamily: "monospace",
								fontSize: "11px",
							}}
						>
							{aiReport}
						</div>
					</details>
				)}
			</div>

			{/* Drawer Footer with Confirmation Gate */}
			{plan && plan.groups.length > 0 && (
				<div
					style={{
						padding: "14px 16px",
						borderTop: "1px solid #1e293b",
						backgroundColor: "#0f172a",
					}}
				>
					<button
						type="button"
						data-testid="btn-dicom-apply-findings"
						onClick={onApplyFindingsToChart}
						disabled={isApplyingToChart}
						style={{
							width: "100%",
							minHeight: "44px",
							padding: "10px 16px",
							borderRadius: "8px",
							border: "none",
							backgroundColor: isApplyingToChart ? "#334155" : "#0d9488",
							color: "#ffffff",
							fontSize: "13px",
							fontWeight: 700,
							cursor: isApplyingToChart ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							transition: "all 0.2s ease",
						}}
					>
						{isApplyingToChart ? (
							<>
								<Loader2 size={16} className="animate-spin" /> Внесение в формулу...
							</>
						) : (
							<>
								<Check size={16} /> Применить к зубной формуле
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};
