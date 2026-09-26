/**
 * PatientToothDetailBox.tsx
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Detailed card showing patient-friendly clinical status, assigned procedures,
 * active warranty certificates, and anti-anxiety reassurance for a selected tooth.
 */

import React, { memo } from "react";
import { Heart, ShieldCheck, X, Zap } from "lucide-react";
import {
	type PatientToothInfo,
	getPatientToothStatusColor,
} from "./patientFriendlyOdontogramEngine.js";

export interface PatientToothDetailBoxProps {
	readonly selectedTooth: PatientToothInfo;
	readonly onClose: () => void;
}

export const PatientToothDetailBox: React.FC<PatientToothDetailBoxProps> = memo(({
	selectedTooth,
	onClose,
}) => {
	const color = getPatientToothStatusColor(selectedTooth.status);

	return (
		<div
			data-testid={`selected-tooth-details-${selectedTooth.fdiCode}`}
			className="pc-card selected-tooth-popup"
			style={{
				padding: "16px",
				borderRadius: "12px",
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: `1.5px solid ${color.border}`,
				boxShadow: `0 8px 24px -4px rgba(0, 0, 0, 0.4), ${color.glow}`,
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						<strong style={{ fontSize: "15px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{selectedTooth.humanNameRu}
						</strong>
						<span
							style={{
								padding: "2px 8px",
								borderRadius: "12px",
								fontSize: "12px",
								fontWeight: 800,
								backgroundColor: color.light,
								color: color.border,
								border: `1px solid ${color.border}`,
							}}
						>
							{color.badgeText}
						</span>
					</div>
					<div style={{ fontSize: "13px", marginTop: "4px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						<strong>Клинический статус:</strong> {selectedTooth.clinicalStateRu}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть информацию о зубе"
					data-testid="close-tooth-details-btn"
					style={{
						background: "rgba(255, 255, 255, 0.05)",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "6px",
						width: "32px",
						height: "32px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "var(--pc-text-muted, #94a3b8)",
						cursor: "pointer",
						flexShrink: 0,
					}}
				>
					<X size={16} />
				</button>
			</div>

			{/* Assigned Procedures & Treatment Plan Details */}
			<div
				style={{
					backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
					border: "1px solid var(--pc-border, var(--glass-border, #e2e8f0))",
					borderRadius: "8px",
					padding: "10px 12px",
					display: "flex",
					flexDirection: "column",
					gap: "4px",
					fontSize: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--pc-primary, #0d9488)", fontWeight: 700 }}>
					<Zap size={14} />
					<span>Назначенные процедуры и план лечения:</span>
				</div>
				<div style={{ color: "var(--pc-text-main, var(--ink, #0f172a))", lineHeight: "1.4" }}>
					{selectedTooth.plannedStageTitleRu ||
						selectedTooth.procedureDescriptionRu ||
						(selectedTooth.status === "healthy"
							? "Контрольный осмотр и поддержание профессиональной гигиены (патологий не выявлено)"
							: "Плановый лечебный этап по согласованному плану")}
				</div>
			</div>

			{selectedTooth.warrantyActive && (
				<div style={{ fontSize: "12px", color: "var(--pc-success, #10b981)", display: "flex", alignItems: "center", gap: "6px" }}>
					<ShieldCheck size={16} />
					<span>Действует официальный гарантийный сертификат качества клиники DENTE</span>
				</div>
			)}

			{/* Anti-anxiety reassurance note */}
			<div
				style={{
					backgroundColor: "rgba(13, 148, 136, 0.08)",
					border: "1px solid rgba(13, 148, 136, 0.2)",
					borderRadius: "6px",
					padding: "8px 10px",
					fontSize: "12px",
					color: "var(--pc-text-muted, #94a3b8)",
					display: "flex",
					alignItems: "center",
					gap: "6px",
				}}
			>
				<Heart size={14} style={{ color: "var(--pc-primary, #0d9488)", flexShrink: 0 }} />
				<span>
					Все манипуляции выполняются под 100% анестезией Septanest с мягкой гелевой премедикацией места укола. <strong>Никакой боли.</strong>
				</span>
			</div>
		</div>
	);
});
PatientToothDetailBox.displayName = "PatientToothDetailBox";
