import { Plus, Printer, Search, Sparkles, Tag, X } from "lucide-react";
import React from "react";

interface MedicalWasteControlBarProps {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	classFilter: string;
	setClassFilter: (c: string) => void;
	handleQuickShiftWaste: () => void;
	isQuickShiftLoading: boolean;
	onOpenWasteJournalModal: () => void;
	onOpenAddEntryModal: () => void;
}

export function MedicalWasteControlBar({
	searchQuery,
	setSearchQuery,
	classFilter,
	setClassFilter,
	handleQuickShiftWaste,
	isQuickShiftLoading,
	onOpenWasteJournalModal,
	onOpenAddEntryModal,
}: MedicalWasteControlBarProps) {
	return (
		<div className="sanpin-control-bar">
			<div className="sanpin-filter-group">
				<div className="dente-search-wrap" style={{ minWidth: "260px" }}>
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по описанию, компании утилизатору..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>
				<select
					value={classFilter}
					onChange={(e) => setClassFilter(e.target.value)}
					className="sanpin-select"
				>
					<option value="all">Все классы отходов</option>
					<option value="class_B">Класс Б (Эпидемически опасные)</option>
					<option value="class_A">Класс А (Эпидемически безопасные)</option>
					<option value="class_G">Класс Г (Токсикологически опасные)</option>
					<option value="class_V">Класс В (Чрезвычайно опасные)</option>
				</select>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
				<button
					type="button"
					onClick={handleQuickShiftWaste}
					aria-busy={isQuickShiftLoading}
					className="sanpin-btn touch-manipulation"
					style={{
						minHeight: "34px",
						height: "34px",
						padding: "0 1.15rem",
						fontSize: "0.875rem",
						fontWeight: 800,
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						cursor: "pointer",
						borderRadius: "8px",
						boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.45rem",
						whiteSpace: "nowrap",
					}}
					title="Сдать отходы смены (пакет 2.5 кг + контейнер игл 0.8 кг)"
					data-testid="nurse-waste-quick-shift-tab-btn"
				>
					<Sparkles size={16} />
					<span>{isQuickShiftLoading ? "Списание отходов..." : "Сдать отходы смены"}</span>
				</button>

				<button
					type="button"
					onClick={onOpenWasteJournalModal}
					className="sanpin-btn sanpin-btn-secondary"
					style={{ minHeight: "34px", height: "34px", padding: "0 1.1rem", fontSize: "0.875rem", fontWeight: 700 }}
					title="Интерактивный технологический журнал учета отходов и печать термоэтикеток"
					data-testid="open-waste-journal-modal-btn"
				>
					<Tag size={16} /> <span>Наклейки на пакеты / Журнал отходов</span>
				</button>
				<button type="button" onClick={() => window.print()} className="sanpin-btn sanpin-btn-secondary">
					<Printer size={15} /> Печать журнала отходов
				</button>
				<button
					type="button"
					onClick={onOpenAddEntryModal}
					className="sanpin-btn sanpin-btn-secondary"
					style={{ fontWeight: 700 }}
				>
					<Plus size={15} /> Зафиксировать отходы
				</button>
			</div>
		</div>
	);
}
