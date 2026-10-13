/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalToolbar.tsx
 *
 * Layer 4: Presentation subcomponent - Top toolbar for SanPin Sterilization Journal.
 * - Device selection, text search, 1-second chairside barcode scanner input.
 * - Norms autofill trigger, scanner modal trigger, Form 257/u print and CSV export.
 * - 0 emojis, strict clinical typography (32-36px density).
 */

import React from "react";
import {
	Printer,
	QrCode,
	Search,
	Sparkles,
	Download,
	Plus,
	Settings,
} from "lucide-react";

export interface SanPinJournalToolbarProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly directScanCode: string;
	readonly onDirectScanChange: (code: string) => void;
	readonly onDirectScanSubmit: (code: string) => void;
	readonly isAutofilling: boolean;
	readonly onAutofillNorms: () => void;
	readonly onOpenScannerModal: () => void;
	readonly onPrintForm257: () => void;
	readonly onExportCsv: () => void;
	readonly onOpenEquipmentModal?: () => void;
	readonly onOpenNewCycleModal?: () => void;
}

export const SanPinJournalToolbar: React.FC<SanPinJournalToolbarProps> = ({
	selectedAutoclave,
	onSelectAutoclave,
	searchQuery,
	onSearchChange,
	directScanCode,
	onDirectScanChange,
	onDirectScanSubmit,
	isAutofilling,
	onAutofillNorms,
	onOpenScannerModal,
	onPrintForm257,
	onExportCsv,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
}) => {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 8,
				padding: "8px 12px",
				borderRadius: 8,
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				<span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink, #1e293b)" }}>
					Журнал стерилизации (СанПиН 3.3686-21, Форма 257/у)
				</span>

				{/* Autoclave filter */}
				<select
					value={selectedAutoclave}
					onChange={(e) => onSelectAutoclave(e.target.value)}
					style={{
						height: 32,
						padding: "0 8px",
						borderRadius: 6,
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #fff)",
						fontSize: "0.8125rem",
						color: "var(--ink, #1e293b)",
					}}
				>
					<option value="all">Все автоклавы</option>
					<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
					<option value="АК-02">АК-02 (W&H Lina 17)</option>
				</select>

				{/* Search */}
				<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
					<Search size={14} style={{ position: "absolute", left: 8, color: "var(--muted, #64748b)" }} />
					<input
						type="text"
						placeholder="Поиск по крафт-пакету..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						style={{
							height: 32,
							paddingLeft: 28,
							paddingRight: 8,
							borderRadius: 6,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							fontSize: "0.8125rem",
							color: "var(--ink, #1e293b)",
							width: 200,
						}}
					/>
				</div>

				{/* 1-second chairside barcode scanner input without popups */}
				<div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
					<QrCode size={14} style={{ position: "absolute", left: 8, color: "var(--teal, #0d9488)" }} />
					<input
						type="text"
						placeholder="Сканировать крафт-пакет..."
						value={directScanCode}
						onChange={(e) => onDirectScanChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && directScanCode.trim()) {
								e.preventDefault();
								onDirectScanSubmit(directScanCode.trim());
							}
						}}
						style={{
							height: 32,
							paddingLeft: 28,
							paddingRight: 8,
							borderRadius: 6,
							border: "1px solid var(--teal, #0d9488)",
							background: "var(--paper, #fff)",
							fontSize: "0.8125rem",
							color: "var(--ink, #1e293b)",
							width: 190,
						}}
						title="Сканирование крафт-пакета или штрихкода набора у кресла в 1 секунду без всплывающих окон (нажмите Enter)"
					/>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
				{/* 1) Кнопка «Заполнить на месяц / смену по нормам» */}
				<button
					type="button"
					onClick={onAutofillNorms}
					disabled={isAutofilling}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						height: 32,
						padding: "0 12px",
						borderRadius: 6,
						border: "1px solid var(--teal, #0d9488)",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						fontSize: "0.8125rem",
						fontWeight: 600,
						cursor: isAutofilling ? "wait" : "pointer",
						boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
					}}
					data-testid="autofill-norms-btn"
					title="Автоматическое заполнение журнала работы автоклавов (Форма 257/у СанПиН) по нажатию кнопки (134°C, 2.1 бар, 5 кл., норма)"
				>
					<Sparkles size={14} />
					<span>{isAutofilling ? "Заполнение..." : "Заполнить по нормам"}</span>
				</button>

				{/* Chairside scanner modal trigger */}
				<button
					type="button"
					onClick={onOpenScannerModal}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						height: 32,
						padding: "0 12px",
						borderRadius: 6,
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #fff)",
						color: "var(--ink, #1e293b)",
						fontSize: "0.8125rem",
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					<QrCode size={14} />
					<span>Сканер крафт-пакетов</span>
				</button>

				{onOpenNewCycleModal && (
					<button
						type="button"
						onClick={onOpenNewCycleModal}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							height: 32,
							padding: "0 12px",
							borderRadius: 6,
							border: "1px solid var(--primary, #0284c7)",
							background: "var(--primary, #0284c7)",
							color: "#ffffff",
							fontSize: "0.8125rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
						data-testid="start-cycle-btn"
					>
						<Plus size={14} />
						<span>Запустить цикл</span>
					</button>
				)}

				{onOpenEquipmentModal && (
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							height: 32,
							padding: "0 12px",
							borderRadius: 6,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							color: "var(--ink, #1e293b)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
						data-testid="equipment-modal-btn"
					>
						<Settings size={14} />
						<span>Оборудование ЦСО</span>
					</button>
				)}

				{/* 2) Кнопка «Печать журнала стерилизации Форма 257/у» */}
				<button
					type="button"
					onClick={onPrintForm257}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						height: 32,
						padding: "0 12px",
						borderRadius: 6,
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #fff)",
						color: "var(--ink, #1e293b)",
						fontSize: "0.8125rem",
						fontWeight: 600,
						cursor: "pointer",
					}}
					data-testid="print-form-257-btn"
				>
					<Printer size={14} />
					<span>Печать Формы 257/у</span>
				</button>

				{/* Export CSV */}
				<button
					type="button"
					onClick={onExportCsv}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						height: 32,
						padding: "0 10px",
						borderRadius: 6,
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #fff)",
						color: "var(--muted, #64748b)",
						fontSize: "0.8125rem",
						cursor: "pointer",
					}}
					title="Экспорт в CSV"
				>
					<Download size={14} />
					<span>Экспорт</span>
				</button>
			</div>
		</div>
	);
};
