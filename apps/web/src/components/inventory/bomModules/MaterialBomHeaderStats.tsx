/**
 * MaterialBomHeaderStats.tsx — Шапка, метрики статистики и фильтрация технологических карт (BOM).
 */

import { Database, Plus, RefreshCw, Search, Sparkles, X } from "lucide-react";
import React from "react";
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

const CATEGORY_TABS = [
	{ id: "all", label: "Все услуги" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "hygiene", label: "Гигиена" },
	{ id: "orthodontics", label: "Ортодонтия" },
] as const;

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

			<div className="material-boms-stats-row">
				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Охвачено услуг</span>
					<span className="material-boms-stat-value">{stats.totalServices}</span>
					<span className="material-boms-stat-desc">с настроенными техкартами</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Всего активных норм</span>
					<span className="material-boms-stat-value">{stats.totalRules}</span>
					<span className="material-boms-stat-desc">привязок материалов</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Средняя себестоимость</span>
					<span className="material-boms-stat-value">{stats.avgCostFormatted}</span>
					<span className="material-boms-stat-desc">расходников на процедуру</span>
				</div>

				<div className="material-boms-stat-card">
					<span className="material-boms-stat-label">Дефицит на складе</span>
					<span
						className="material-boms-stat-value"
						style={{
							color:
								stats.totalDeficitServices > 0
									? "var(--bad-fg, #dc2626)"
									: "var(--ok-fg, #059669)",
						}}
					>
						{stats.totalDeficitServices === 0
							? "В норме"
							: `${stats.totalDeficitServices} услуг`}
					</span>
					<span className="material-boms-stat-desc">
						{stats.totalDeficitServices === 0
							? "Все материалы в наличии"
							: "Требуется пополнение запасов"}
					</span>
				</div>
			</div>

			<div className="material-boms-filter-bar">
				<div className="material-boms-search-wrap">
					<Search size={18} color="var(--muted)" />
					<input
						type="text"
						className="material-boms-search-input"
						placeholder="Поиск по коду услуги (напр. A16.07.002), названию услуги или материалу..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								color: "var(--muted)",
							}}
							onClick={() => onSearchChange("")}
						>
							<X size={16} />
						</button>
					)}
				</div>

				<div className="material-boms-category-tabs">
					{CATEGORY_TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							className={`material-boms-cat-btn ${selectedCategory === tab.id ? "active" : ""}`}
							onClick={() => onCategoryChange(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>
		</>
	);
}
