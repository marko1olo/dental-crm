import { FileText, Plus, Save } from "lucide-react";
import React from "react";

export interface SterilizerModalFooterActionsProps {
	isEditing: boolean;
	submitting: boolean;
	onClose: () => void;
	onQuickCycle?: () => void;
	onExportSanpinJournal?: () => void;
}

export function SterilizerModalFooterActions({
	isEditing,
	submitting,
	onClose,
	onQuickCycle,
	onExportSanpinJournal,
}: SterilizerModalFooterActionsProps) {
	return (
		<div
			style={{
				marginTop: "auto",
				paddingTop: "0.75rem",
				borderTop: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				flexWrap: "wrap",
			}}
		>
			{/* Auxiliary SanPiN Actions */}
			<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
				{onQuickCycle && (
					<button
						type="button"
						onClick={onQuickCycle}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.78rem", fontWeight: 600 }}
						title="Быстрый запуск цикла стерилизации"
					>
						<Plus size={14} color="#0d9488" />
						<span>Запустить цикл</span>
					</button>
				)}

				{onExportSanpinJournal && (
					<button
						type="button"
						onClick={onExportSanpinJournal}
						aria-busy={submitting}
						className="sanpin-btn sanpin-btn-secondary touch-manipulation"
						style={{ minHeight: "36px", padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
						title="Сформировать печатный журнал стерилизации (Форма 257/у)"
					>
						<FileText size={14} />
						<span>Журнал СанПиН</span>
					</button>
				)}
			</div>

			{/* Main Actions */}
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<button
					type="button"
					onClick={onClose}
					aria-busy={submitting}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{ minHeight: "38px", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
				>
					Закрыть
				</button>

				<button
					type="submit"
					aria-busy={submitting}
					className="sanpin-btn sanpin-btn-primary touch-manipulation"
					style={{
						minHeight: "38px",
						padding: "0.4rem 1.25rem",
						fontSize: "0.85rem",
						fontWeight: 700,
						background: "var(--teal-600, #0d9488)",
						color: "#ffffff",
						border: "none",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.35rem",
						cursor: "pointer",
					}}
				>
					<Save size={15} />
					<span>{isEditing ? "Сохранить изменения" : "Поставить аппарат на учет"}</span>
				</button>
			</div>
		</div>
	);
}
