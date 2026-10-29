import { Plus, Search, Truck, X, Zap } from "lucide-react";
import React from "react";

export interface WaybillsToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly onOpenExpress: () => void;
	readonly onStartCreateNew: () => void;
}

export const WaybillsToolbar: React.FC<WaybillsToolbarProps> = ({
	searchQuery,
	onSearchChange,
	onOpenExpress,
	onStartCreateNew,
}) => {
	return (
		<div className="min-h-[36px] h-auto py-1 px-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
			<div className="flex items-center gap-2 min-w-0">
				<div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
					<Truck size={14} />
				</div>
				<h3 className="text-xs font-bold text-[var(--ink)] leading-tight truncate">
					Поступление партий и поставщики
				</h3>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="dente-search-wrap relative min-w-[180px] max-w-xs">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input"
						placeholder="Поиск накладной или поставщика..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						data-testid="waybill-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => onSearchChange("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={onOpenExpress}
					className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold gap-1.5 shrink-0"
					data-testid="btn-express-waybill"
					title="Быстрое оприходование накладной по 4 параметрам: Поставщик, Номер, Дата, Сумма"
				>
					<Zap size={13} className="text-teal-600 dark:text-teal-400" />
					<span>Экспресс-приход</span>
				</button>

				<button
					type="button"
					onClick={onStartCreateNew}
					className="primary-button h-8 min-h-[32px] px-3 text-xs font-semibold gap-1.5 shrink-0 shadow-xs"
					data-testid="btn-create-waybill"
				>
					<Plus size={14} />
					<span>Оприходовать накладную</span>
				</button>
			</div>
		</div>
	);
};

export default WaybillsToolbar;
