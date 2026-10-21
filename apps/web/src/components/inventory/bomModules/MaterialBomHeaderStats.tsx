import { Database, Plus, RefreshCw, Sparkles } from "lucide-react";
import React from "react";
import { MaterialBomFilterBar } from "./MaterialBomFilterBar.js";
import { MaterialBomStatsCards } from "./MaterialBomStatsCards.js";
import type { MaterialBomStats } from "./materialBomTypes.js";

export interface MaterialBomHeaderStatsProps {
	readonly isLoading: boolean;
	readonly isSeeding: boolean;
	readonly stats: MaterialBomStats;
	readonly searchQuery: string;
	readonly selectedCategory: string;
	readonly onRefresh: () => void;
	readonly onSeedDefaults: () => void;
	readonly onOpenAddModal: () => void;
	readonly onSearchChange: (query: string) => void;
	readonly onCategoryChange: (category: string) => void;
}

export function MaterialBomHeaderStats({
	isLoading,
	isSeeding,
	stats,
	searchQuery,
	selectedCategory,
	onRefresh,
	onSeedDefaults,
	onOpenAddModal,
	onSearchChange,
	onCategoryChange,
}: MaterialBomHeaderStatsProps) {
	return (
		<>
			<div className="material-boms-header">
				<div className="material-boms-header-info">
					<div className="material-boms-header-icon">
						<Database size={24} />
					</div>
					<div>
						<h2 className="material-boms-title">
							Технологические карты расхода материалов
						</h2>
						<p className="material-boms-subtitle">
							Нормы автоматического списания расходников со склада при завершении приёма
						</p>
					</div>
				</div>

				<div className="material-boms-header-actions">
					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={onRefresh}
						disabled={isLoading}
						title="Обновить данные"
					>
						<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
						Обновить
					</button>

					<button
						type="button"
						className="material-boms-btn material-boms-btn-secondary"
						onClick={onSeedDefaults}
						disabled={isSeeding}
						title="Загрузить типовые клинические нормы расхода"
					>
						<Sparkles size={16} />
						{isSeeding ? "Загружаем..." : "Загрузить типовые нормы"}
					</button>

					<button
						type="button"
						className="material-boms-btn material-boms-btn-primary"
						onClick={onOpenAddModal}
					>
						<Plus size={16} />
						Добавить норму
					</button>
				</div>
			</div>

			<MaterialBomStatsCards stats={stats} />

			<MaterialBomFilterBar
				searchQuery={searchQuery}
				selectedCategory={selectedCategory}
				onSearchChange={onSearchChange}
				onCategoryChange={onCategoryChange}
			/>
		</>
	);
}
