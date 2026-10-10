/**
 * @file DemoCaseHeaderBar.tsx
 * @description Шапка модалки клинического кейса: название кейса, категория, возраст пациента, диагноз по МКБ-10.
 * Layer 4: Презентационный компонент шапки (МАНДАТ 8y, МАНДАТ 8n).
 */

import React from "react";
import {
	Activity,
	Award,
	Crown,
	FileText,
	Sparkles,
	Stethoscope,
	X,
} from "lucide-react";
import type { DemoClinicalCase } from "./types.js";
import { DEMO_CLINICAL_CASES } from "./types.js";

export interface DemoCaseHeaderBarProps {
	readonly activeRoleKey: string;
	readonly selectedCaseId: string;
	readonly currentCase: DemoClinicalCase;
	readonly onSelectCase: (caseId: string) => void;
	readonly onSelectRole?: ((roleKey: string) => void) | undefined;
	readonly onClose: () => void;
	readonly profileBadge?: string | undefined;
	readonly profileDescription?: string | undefined;
}

export const DemoCaseHeaderBar: React.FC<DemoCaseHeaderBarProps> = ({
	activeRoleKey,
	selectedCaseId,
	currentCase,
	onSelectCase,
	onSelectRole,
	onClose,
	profileBadge,
	profileDescription,
}) => {
	const getRoleIcon = (roleKey: string) => {
		switch (roleKey) {
			case "therapist":
				return <Stethoscope size={20} />;
			case "orthopedist":
				return <Crown size={20} />;
			case "orthodontist":
				return <Sparkles size={20} />;
			case "surgeon":
				return <Activity size={20} />;
			case "owner":
				return <Award size={20} />;
			case "admin":
			default:
				return <FileText size={20} />;
		}
	};

	return (
		<div
			style={{
				padding: "16px 20px",
				borderBottom: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				background: "var(--paper, #f8fafc)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "10px",
							background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))",
							color: "var(--brand-accent, #6366f1)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							marginTop: "2px",
						}}
					>
						{getRoleIcon(activeRoleKey)}
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
							<span
								style={{
									fontSize: "11px",
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.5px",
									color: "var(--brand-accent, #6366f1)",
									background: "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))",
									padding: "2px 8px",
									borderRadius: "4px",
								}}
							>
								{profileBadge || currentCase.categoryLabel}
							</span>
							<h3
								id="demo-case-title"
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: 700,
									color: "var(--ink, #0f172a)",
								}}
							>
								{currentCase.title} — {currentCase.doctorName}
							</h3>
						</div>

						<p
							style={{
								margin: "4px 0 0",
								fontSize: "12px",
								color: "var(--muted, #64748b)",
								lineHeight: "1.4",
							}}
						>
							{profileDescription || currentCase.summary}
						</p>

						{/* Клинические метаданные пациента */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "12px",
								marginTop: "6px",
								fontSize: "12px",
								flexWrap: "wrap",
							}}
						>
							<span>
								<strong>Пациент:</strong> {currentCase.patientName} ({currentCase.patientAge} лет)
							</span>
							<span style={{ color: "var(--line, #cbd5e1)" }}>•</span>
							<span>
								<strong>Диагноз:</strong> {currentCase.diagnosisText}{" "}
								<span
									style={{
										color: "var(--danger, #ef4444)",
										fontWeight: 700,
										marginLeft: "4px",
									}}
								>
									[{currentCase.diagnosisIcd10}]
								</span>
							</span>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					style={{
						background: "transparent",
						border: "none",
						cursor: "pointer",
						color: "var(--muted, #64748b)",
						padding: "6px",
						borderRadius: "6px",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "background 0.15s ease",
					}}
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>

			{/* Быстрые фильтры выбора демонстрационного кейса */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					overflowX: "auto",
					paddingTop: "2px",
				}}
			>
				<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)" }}>
					Кейсы:
				</span>
				{Object.values(DEMO_CLINICAL_CASES).map((c) => {
					const isActive = c.id === selectedCaseId;
					return (
						<button
							key={c.id}
							type="button"
							onClick={() => {
								onSelectCase(c.id);
								if (onSelectRole && c.roleKey) {
									onSelectRole(c.roleKey);
								}
							}}
							style={{
								padding: "4px 10px",
								borderRadius: "6px",
								fontSize: "11px",
								fontWeight: 600,
								border: isActive ? "1px solid var(--brand-accent, #6366f1)" : "1px solid var(--line, #e2e8f0)",
								background: isActive ? "var(--brand-accent-bg, rgba(99, 102, 241, 0.1))" : "var(--paper-strong, #ffffff)",
								color: isActive ? "var(--brand-accent, #6366f1)" : "var(--ink, #0f172a)",
								cursor: "pointer",
								whiteSpace: "nowrap",
								transition: "all 0.15s ease",
							}}
						>
							{c.title.split("(")[0]?.trim() || c.title}
						</button>
					);
				})}
			</div>
		</div>
	);
};
