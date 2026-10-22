import React from "react";
import { Plus } from "lucide-react";
import { Autoclave } from "../../../icons/DentalIcons";

export interface JournalTabEmptyStateProps {
	readonly isFiltered: boolean;
	readonly onOpenNewCycle?: () => void;
}

export const JournalTabEmptyState: React.FC<JournalTabEmptyStateProps> = ({ isFiltered, onOpenNewCycle }) => {
	if (isFiltered) {
		return (
			<div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
				<Autoclave size={40} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
				<div style={{ fontWeight: 600, fontSize: "1rem" }}>Записи не найдены</div>
				<div style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
					Попробуйте изменить параметры фильтрации или зарегистрируйте новый цикл.
				</div>
			</div>
		);
	}

	return (
		<div
			className="autoclave-empty-state"
			data-testid="autoclave-journal-empty-state"
			style={{
				padding: "3.5rem 1.5rem", textAlign: "center", color: "var(--muted, #64748b)",
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
			}}
		>
			<Autoclave size={48} style={{ opacity: 0.4, marginBottom: "0.75rem", color: "var(--teal, #0d9488)" }} />
			<div style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--ink, #0f172a)" }}>
				Журнал стерилизации пуст
			</div>
			<div style={{ fontSize: "0.875rem", marginTop: "0.375rem", maxWidth: "420px", lineHeight: 1.4 }}>
				В клинике пока не зарегистрировано ни одного цикла работы стерилизаторов.
			</div>
			{onOpenNewCycle && (
				<button
					type="button"
					onClick={onOpenNewCycle}
					className="autoclave-btn autoclave-btn-primary"
					style={{ marginTop: "1.25rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
					data-testid="btn-register-first-cycle"
				>
					<Plus size={16} />
					<span>Зарегистрировать первый цикл</span>
				</button>
			)}
		</div>
	);
};
