/**
 * @file CabinetReadinessStatusHeader.tsx
 * @description Layer 4: Prominent status banner, top action toolbar, and sub-indicators for Cabinet Readiness.
 */

import {
	CheckCircle2,
	Download,
	Info,
	Printer,
	Save,
	ShieldCheck,
	Sparkles,
	Wind,
	Zap,
} from "lucide-react";
import React from "react";
import type { CabinetReadinessStatusHeaderProps } from "./types";

export function CabinetReadinessStatusHeader({
	selectedCabinet,
	currentPreset,
	isFullyReady,
	statusMessageRu,
	disinfectionCompleted,
	turbineSterile,
	contraAngleSterile,
	bactericidalActive,
	onStartAppointmentPaperLogNorm,
	onOneClickConfirmCabinetReady,
	onExportCsv,
	onPrint,
}: CabinetReadinessStatusHeaderProps) {
	return (
		<div className="cabinet-readiness-status-header-wrap" style={{ marginBottom: "0.75rem" }}>
			{/* Top headline + Primary Action Toolbar */}
			<div
				className="sanpin-pane-header"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1rem",
					flexWrap: "wrap",
					marginBottom: "0.65rem",
				}}
			>
				<div style={{ flex: "1 1 340px", minWidth: 0 }}>
					<h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
						<ShieldCheck size={20} color="var(--brand-primary, #2563eb)" style={{ flexShrink: 0 }} />
						<span>Готовность кабинета и стоматологической установки</span>
					</h2>
					<p className="sanpin-pane-desc" style={{ margin: "0.15rem 0 0", color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
						Протокол подготовки к смене. При ведении бумажных журналов приём пациентов ведётся в обычном порядке.
					</p>
				</div>

				<div className="sanpin-pane-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
					<button
						type="button"
						onClick={onStartAppointmentPaperLogNorm}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.1rem",
							fontSize: "0.9rem",
							background: "var(--teal, #0d9488)",
							color: "var(--on-teal, #ffffff)",
							fontWeight: 800,
							cursor: "pointer",
							boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							borderRadius: "0.5rem",
						}}
						title="Начать приём пациента (журнал заполняется параллельно)"
						data-testid="cabinet-readiness-start-appointment-btn"
					>
						<CheckCircle2 size={17} /> <span>Начать приём (норма)</span>
					</button>

					<button
						type="button"
						onClick={onOneClickConfirmCabinetReady}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1rem",
							fontSize: "0.88rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "0.5rem",
						}}
						title="Отметить все пункты текущего профиля как готовые"
						data-testid="cabinet-readiness-autofill-btn"
					>
						<Zap size={17} /> <span>Кабинет готов к смене</span>
					</button>

					<button
						type="button"
						onClick={onExportCsv}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 0.85rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "0.5rem",
						}}
						title="Экспорт истории проверок в CSV"
					>
						<Download size={15} /> <span>CSV</span>
					</button>

					<button
						type="button"
						onClick={onPrint}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 0.85rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.35rem",
							borderRadius: "0.5rem",
						}}
						title="Печать официального листа передачи смены"
					>
						<Printer size={15} /> <span>Печать / PDF</span>
					</button>
				</div>
			</div>

			{/* Prominent Cabinet Readiness Badge & KPI Strip */}
			<div
				className="cabinet-readiness-kpi-strip"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.75rem",
					padding: "0.5rem 0.85rem",
					borderRadius: "0.5rem",
					border: isFullyReady ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(245, 158, 11, 0.4)",
					background: isFullyReady ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", minWidth: 0 }}>
					{/* Status Badge */}
					<span
						style={{
							padding: "0.2rem 0.6rem",
							borderRadius: "0.375rem",
							background: isFullyReady ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
							color: "#ffffff",
							fontSize: "0.72rem",
							fontWeight: 800,
							letterSpacing: "0.03em",
							textTransform: "uppercase",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.3rem",
							flexShrink: 0,
						}}
					>
						{isFullyReady ? <CheckCircle2 size={13} /> : <Info size={13} />}
						{isFullyReady ? "Готов к приёму" : "Требуется обработка"}
					</span>

					{/* Cabinet title and current profile */}
					<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink, #1e293b)" }}>
						{selectedCabinet} • {currentPreset.shortLabelRu}
					</span>

					<div style={{ width: "1px", height: "14px", background: "var(--line, rgba(148, 163, 184, 0.3))" }} />

					{/* Micro status chips */}
					<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								color: disinfectionCompleted ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
								fontWeight: 600,
							}}
						>
							<Sparkles size={13} />
							{disinfectionCompleted ? "Дезинфекция выполнена" : "Поверхности не обработаны"}
						</span>

						<span style={{ color: "var(--muted, #94a3b8)" }}>•</span>

						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "0.25rem",
								color: turbineSterile && contraAngleSterile ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
								fontWeight: 600,
							}}
						>
							<ShieldCheck size={13} />
							{turbineSterile && contraAngleSterile ? "Наконечники 5 кл. ОК" : "Требуются наконечники"}
						</span>

						{bactericidalActive && (
							<>
								<span style={{ color: "var(--muted, #94a3b8)" }}>•</span>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.25rem",
										color: "var(--brand-primary, #2563eb)",
										fontWeight: 600,
									}}
								>
									<Wind size={13} />
									Дезар активен
								</span>
							</>
						)}
					</div>
				</div>

				{/* Autosave Pill */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.35rem",
						fontSize: "0.75rem",
						color: "var(--muted, #64748b)",
						marginLeft: "auto",
					}}
				>
					<Save size={13} color="var(--ok-fg, #059669)" />
					<span>Кабинет проверен (автосохранение)</span>
				</div>
			</div>
		</div>
	);
}
