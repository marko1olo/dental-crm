import { CheckCircle2, Download, Printer, ShieldCheck, Zap } from "lucide-react";
import React from "react";
import { CabinetReadinessKpiStrip } from "./CabinetReadinessKpiStrip.js";
import type { CabinetReadinessStatusHeaderProps } from "./types.js";

export function CabinetReadinessStatusHeader(props: CabinetReadinessStatusHeaderProps) {
	return (
		<div className="cabinet-readiness-status-header-wrap" style={{ marginBottom: "0.75rem" }}>
			<div className="sanpin-pane-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
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
						onClick={props.onStartAppointmentPaperLogNorm}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1.1rem", fontSize: "0.9rem", background: "var(--teal, #0d9488)", color: "#fff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "0.5rem" }}
						title="Начать приём пациента (журнал заполняется параллельно)"
						data-testid="cabinet-readiness-start-appointment-btn"
					>
						<CheckCircle2 size={17} /> <span>Начать приём (норма)</span>
					</button>

					<button
						type="button"
						onClick={props.onOneClickConfirmCabinetReady}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "0.5rem" }}
						title="Отметить все пункты текущего профиля как готовые"
						data-testid="cabinet-readiness-autofill-btn"
					>
						<Zap size={17} /> <span>Кабинет готов к смене</span>
					</button>

					<button
						type="button"
						onClick={props.onExportCsv}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.85rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "0.5rem" }}
						title="Экспорт истории проверок в CSV"
					>
						<Download size={15} /> <span>CSV</span>
					</button>

					<button
						type="button"
						onClick={props.onPrint}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.85rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem", borderRadius: "0.5rem" }}
						title="Печать официального листа передачи смены"
					>
						<Printer size={15} /> <span>Печать / PDF</span>
					</button>
				</div>
			</div>

			<CabinetReadinessKpiStrip
				selectedCabinet={props.selectedCabinet}
				currentPreset={props.currentPreset}
				isFullyReady={props.isFullyReady}
				disinfectionCompleted={props.disinfectionCompleted}
				turbineSterile={props.turbineSterile}
				contraAngleSterile={props.contraAngleSterile}
				bactericidalActive={props.bactericidalActive}
			/>
		</div>
	);
}
