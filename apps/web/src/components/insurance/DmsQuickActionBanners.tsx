/**
 * DmsQuickActionBanners.tsx — 1-клик панели экстренной помощи и экспресс-шаблонов ДМС.
 */

import { CheckCircle2, Zap } from "lucide-react";
import React from "react";
import { type ExpressDmsGuaranteePreset } from "./dmsInsurancePresets";

export interface DmsQuickActionBannersProps {
	readonly isEmergencyCare: boolean;
	readonly onActivateEmergency: () => void;
	readonly onApplyExpressPreset: (preset: ExpressDmsGuaranteePreset) => void;
	readonly presets: readonly ExpressDmsGuaranteePreset[];
}

export function DmsQuickActionBanners({
	isEmergencyCare,
	onActivateEmergency,
	onApplyExpressPreset,
	presets,
}: DmsQuickActionBannersProps) {
	return (
		<>
			{/* 1-Клик Режим: Экстренная помощь по острой боли (письмо будет дослано страховой) */}
			<div
				style={{
					padding: "12px 16px",
					borderRadius: "14px",
					background: isEmergencyCare
						? "linear-gradient(135deg, var(--warn-bg, rgba(245, 158, 11, 0.18)), var(--ok-bg, rgba(16, 185, 129, 0.12)))"
						: "var(--warn-bg, rgba(245, 158, 11, 0.08))",
					border: isEmergencyCare ? "2px solid var(--warn-fg, #f59e0b)" : "1px solid var(--line, rgba(245, 158, 11, 0.35))",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
					marginBottom: "14px",
					boxShadow: isEmergencyCare ? "0 4px 16px rgba(245, 158, 11, 0.15)" : "none",
				}}
			>
				<div style={{ flex: 1, minWidth: "260px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
						<Zap size={18} className="text-amber-600" />
						<strong style={{ fontSize: "0.875rem", color: "var(--ink, #0f172a)" }}>
							Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора)
						</strong>
						{isEmergencyCare && (
							<span
								style={{
									fontSize: "0.6875rem",
									fontWeight: 800,
									padding: "2px 8px",
									borderRadius: "6px",
									background: "var(--ok-fg, #10b981)",
									color: "#ffffff",
								}}
							>
								АКТИВНО
							</span>
						)}
					</div>
					<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
						Если пациент пришел с острой болью, а письмо еще не пришло на почту — программа не блокирует врача и не требует номер письма! Временное согласование на неотложные манипуляции (депульпирование, анестезия, вскрытие абсцесса).
					</p>
				</div>

				<button
					type="button"
					onClick={onActivateEmergency}
					style={{
						minHeight: "44px",
						padding: "8px 16px",
						borderRadius: "10px",
						border: "none",
						background: isEmergencyCare ? "var(--ok-fg, #10b981)" : "var(--warn-fg, #f59e0b)",
						color: "#ffffff",
						fontWeight: 700,
						fontSize: "0.8125rem",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
					}}
					title="1-клик: Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора)"
				>
					<Zap size={16} />
					<span>
						{isEmergencyCare
							? "Экстренный приём активен"
							: "1-клик: Экстренный приём / Гарантия в пути"}
					</span>
				</button>
			</div>

			{/* 1-Клик Экспресс-прикрепление гарантийного письма */}
			<div
				style={{
					padding: "10px 14px",
					borderRadius: "12px",
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					marginBottom: "14px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
					<Zap size={16} className="text-sky-600" />
					<span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Экспресс-прикрепление гарантийного письма в 1 клик:
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						(моментальное заполнение страховой компании, лимитов и согласованных услуг)
					</span>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
					{presets.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => onApplyExpressPreset(preset)}
							className="dms-btn dms-btn-secondary"
							style={{
								fontSize: "0.75rem",
								padding: "6px 12px",
								borderRadius: "8px",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								background: "var(--paper, #f8fafc)",
								border: "1px solid var(--line, #cbd5e1)",
								cursor: "pointer",
							}}
							title={preset.noteRu}
						>
							<CheckCircle2 size={13} className="text-sky-600" />
							<span style={{ fontWeight: 600 }}>{preset.labelRu}</span>
						</button>
					))}
				</div>
			</div>
		</>
	);
}
