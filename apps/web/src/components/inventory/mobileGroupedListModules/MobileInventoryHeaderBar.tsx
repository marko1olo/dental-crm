import { Camera, Package, Search, X } from "lucide-react";
import React from "react";

export interface MobileInventoryHeaderBarProps {
	readonly totalCount: number;
	readonly lowStockCount: number;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly onClearSearch: () => void;
	readonly onOpenMdlpScanning?: (() => void) | undefined;
}

/**
 * Шапка мобильного склада (Мандаты 8b, 8am, 8ze <= 120 строк).
 * Аккуратные компактные бейджи «МДЛП» и «Поз: X» рядом с заголовком.
 */
export const MobileInventoryHeaderBar: React.FC<MobileInventoryHeaderBarProps> = ({
	totalCount,
	lowStockCount,
	searchQuery,
	onSearchChange,
	onClearSearch,
	onOpenMdlpScanning,
}) => {
	return (
		<div className="mobile-inventory-header-bar">
			<div className="mobile-inventory-title-row">
				<div className="mobile-inventory-title-wrap">
					<Package size={20} className="mobile-inventory-title-icon" aria-hidden="true" />
					<h1 className="mobile-inventory-title-text">Склад материалов</h1>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{onOpenMdlpScanning && (
						<button
							type="button"
							onClick={onOpenMdlpScanning}
							className="mobile-inventory-kpi-badge cursor-pointer hover:border-[var(--teal)] transition-colors active:scale-95"
							data-testid="mobile-header-btn-mdlp"
							title="Маркированные медикаменты и Честный Знак"
						>
							Маркировка
						</button>
					)}
					<span
						className="mobile-inventory-kpi-badge"
						data-testid="mobile-inventory-total-badge"
						title="Всего номенклатурных позиций на складе"
					>
						Поз: {totalCount}
					</span>
					{lowStockCount > 0 && (
						<span
							className="mobile-inventory-kpi-badge has-shortage"
							title="Критический дефицит материалов"
							data-testid="mobile-inventory-deficit-badge"
						>
							Дефицит: {lowStockCount}
						</span>
					)}
				</div>
			</div>

			<div className="mobile-inventory-search-row">
				<div className="mobile-inventory-search-wrap">
					<Search className="mobile-inventory-search-icon" size={16} aria-hidden="true" />
					<input
						type="search"
						className="mobile-inventory-search-input"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по названию или коду"
						aria-label="Поиск по складу"
						data-testid="mobile-inventory-search-input"
					/>
					{searchQuery ? (
						<button
							type="button"
							className="mobile-inventory-search-clear"
							onClick={onClearSearch}
							aria-label="Очистить поиск"
							data-testid="mobile-inventory-search-clear"
						>
							<X size={16} aria-hidden="true" />
						</button>
					) : null}
				</div>
				<button
					type="button"
					className="mobile-inventory-scanner-btn"
					onClick={onOpenMdlpScanning}
					aria-label="Сканировать штрихкод камерой"
					title="Сканер штрихкодов и DataMatrix"
					data-testid="mobile-inventory-camera-scanner-btn"
				>
					<Camera size={18} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
};
