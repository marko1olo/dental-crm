import React from "react";
import { Download, Printer, Save, Search } from "lucide-react";

export interface RetroactiveBatchControlBarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly filterOnlyWorkdays: boolean;
	readonly setFilterOnlyWorkdays: (f: boolean) => void;
	readonly isLoggingDayCycle: boolean;
	readonly onRecordDayAutoclaveCycle: () => void;
	readonly isSaving: boolean;
	readonly onSaveToRegisters: () => void;
	readonly onPrintDossier: () => void;
	readonly onExportCsv: () => void;
	readonly onExportScheduleSyncCsv: () => void;
	readonly isModal: boolean;
}

export function RetroactiveBatchControlBar({
	searchQuery, setSearchQuery, filterOnlyWorkdays, setFilterOnlyWorkdays,
	isLoggingDayCycle, onRecordDayAutoclaveCycle, isSaving, onSaveToRegisters,
	onPrintDossier, onExportCsv, onExportScheduleSyncCsv, isModal,
}: RetroactiveBatchControlBarProps) {
	return (
		<div className="sanpin-control-bar">
			<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
				<div style={{ position: "relative", minWidth: "220px" }}>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по дате, кабинету..."
						className="sanpin-input"
						style={{ width: "100%", paddingLeft: "2.2rem" }}
					/>
					<Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
				</div>

				<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none", fontWeight: 600 }}>
					<input
						type="checkbox"
						checked={filterOnlyWorkdays}
						onChange={(e) => setFilterOnlyWorkdays(e.target.checked)}
						style={{ width: "16px", height: "16px", cursor: "pointer" }}
					/>
					Только рабочие смены
				</label>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onRecordDayAutoclaveCycle}
					aria-busy={isLoggingDayCycle}
					className="sanpin-btn sanpin-btn-primary"
					style={{ minHeight: "46px", padding: "0.6rem 1.25rem", fontSize: "0.9rem", fontWeight: 800, background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", cursor: "pointer" }}
					data-testid={isModal ? "modal-record-day-autoclave-cycle-btn" : "record-day-autoclave-cycle-btn"}
					title="1-клик фиксация дневного цикла: Автоклав B-класс, 134°C, 2.1 бар, 5 мин, индикаторы 5 класса норма, списание крафт-пакетов со склада"
				>
					<Save size={18} />
					<span>{isLoggingDayCycle ? "Фиксация..." : "Зафиксировать дневной цикл автоклавирования"}</span>
				</button>

				<button
					type="button"
					onClick={onSaveToRegisters}
					aria-busy={isSaving}
					className="sanpin-btn sanpin-btn-primary"
					style={{ minHeight: "46px", padding: "0.6rem 1.25rem", fontSize: "0.9rem", fontWeight: 800, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", cursor: "pointer" }}
					data-testid={isModal ? "modal-save-batch-to-registers-btn" : "save-batch-to-registers-btn"}
				>
					<Save size={18} />
					<span>{isSaving ? "Сохранение..." : "Сохранить в реестры клиники"}</span>
				</button>

				<button
					type="button"
					onClick={onPrintDossier}
					className="sanpin-btn sanpin-btn-secondary"
					style={{ minHeight: "46px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", fontWeight: 700, borderColor: "var(--brand-primary, #2563eb)", color: "var(--brand-primary, #2563eb)", cursor: "pointer" }}
					data-testid={isModal ? "modal-print-batch-dossier-btn" : "print-batch-dossier-btn"}
				>
					<Printer size={18} /> <span>Распечатать готовые сшивы</span>
				</button>

				<button
					type="button"
					onClick={onExportCsv}
					className="sanpin-btn sanpin-btn-secondary"
					style={{ minHeight: "46px", padding: "0.6rem 0.9rem", fontSize: "0.85rem", cursor: "pointer" }}
					title="Экспорт в CSV"
				>
					<Download size={16} /> CSV
				</button>

				<button
					type="button"
					onClick={onExportScheduleSyncCsv}
					className="sanpin-btn sanpin-btn-secondary"
					style={{ minHeight: "46px", padding: "0.6rem 0.9rem", fontSize: "0.85rem", cursor: "pointer" }}
					title="Сводная ведомость стерилизационной нагрузки расписания (CSV)"
					data-testid="export-schedule-sanpin-sync-csv-btn"
				>
					<Download size={16} /> Ведомость расписания (CSV)
				</button>
			</div>
		</div>
	);
}
