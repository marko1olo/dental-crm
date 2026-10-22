import React from "react";
import { Calendar, FileBadge, FileSpreadsheet, Printer } from "lucide-react";

export interface JournalTabActionButtonsProps {
	readonly onRegulatoryExport: () => void;
	readonly onMonthlyExport: () => void;
	readonly onCsvExport: () => void;
	readonly onPrintJournal: () => void;
}

export const JournalTabActionButtons: React.FC<JournalTabActionButtonsProps> = ({
	onRegulatoryExport,
	onMonthlyExport,
	onCsvExport,
	onPrintJournal,
}) => (
	<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
		<button
			type="button"
			onClick={onRegulatoryExport}
			className="autoclave-btn"
			style={{
				minHeight: "36px", padding: "0.45rem 0.875rem", fontWeight: 700, fontSize: "0.8125rem",
				background: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)", color: "#fff",
				border: "none", boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
			}}
			title="Формирование журналов стерилизации и контроля качества для инспекций"
			data-testid="journal-tab-regulatory-export-btn"
		>
			<FileBadge size={15} />
			<span>Выгрузка для проверки</span>
		</button>
		<button
			type="button"
			onClick={onMonthlyExport}
			className="autoclave-btn autoclave-btn-secondary"
			style={{ minHeight: "36px", padding: "0.45rem 0.75rem", fontWeight: 600, fontSize: "0.8125rem" }}
			title="Автоматическое формирование и печать журнала стерилизаторов за текущий месяц"
			data-testid="journal-tab-generate-monthly-form257-btn"
		>
			<Calendar size={15} color="var(--teal, #0d9488)" />
			<span>За месяц</span>
		</button>
		<button
			type="button"
			onClick={onCsvExport}
			className="autoclave-btn autoclave-btn-secondary"
			style={{ minHeight: "36px", padding: "0.45rem 0.75rem", fontSize: "0.8125rem" }}
			title="Экспорт в CSV с UTF-8 BOM"
		>
			<FileSpreadsheet size={15} color="var(--teal, #0d9488)" />
			<span>CSV</span>
		</button>
		<button
			type="button"
			onClick={onPrintJournal}
			className="autoclave-btn autoclave-btn-primary"
			style={{ minHeight: "36px", padding: "0.45rem 0.875rem", fontSize: "0.8125rem" }}
		>
			<Printer size={15} />
			<span>Печать журнала</span>
		</button>
	</div>
);
