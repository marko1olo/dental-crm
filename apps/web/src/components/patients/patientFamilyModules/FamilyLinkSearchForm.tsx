import React from "react";
import { Search } from "lucide-react";

interface FamilyLinkSearchFormProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly searchResults: any[];
	readonly searchLoading: boolean;
	readonly searchFailed: boolean;
	readonly loading: boolean;
	readonly onSelectFamily: (id: string) => void;
	readonly onCancel: () => void;
}

export const FamilyLinkSearchForm: React.FC<FamilyLinkSearchFormProps> = ({
	searchQuery,
	setSearchQuery,
	searchResults,
	searchLoading,
	searchFailed,
	loading,
	onSelectFamily,
	onCancel,
}) => (
	<div className="flex flex-col gap-3">
		<div className="dente-search-wrap">
			<Search size={14} className="dente-search-icon" aria-hidden="true" />
			<input
				type="text"
				className="dente-search-input"
				placeholder="Поиск семьи по названию..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
		</div>

		<div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
			{searchLoading && <div className="text-xs text-slate-400 text-center py-2">Поиск...</div>}
			{!searchLoading && searchFailed && (
				<div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5 leading-relaxed">
					Поиск семей не выполнен: не получилось связаться с сервером. Повторите поиск позже.
				</div>
			)}
			{!searchLoading && !searchFailed && searchQuery.length >= 2 && searchResults.length === 0 && (
				<div className="text-xs text-slate-400 text-center py-2">
					Семьи с таким названием не найдены. Проверьте написание или создайте новую семью.
				</div>
			)}
			{searchResults.map((f) => (
				<button
					type="button"
					key={f.id}
					className="w-full text-left flex justify-between items-center p-2 min-h-[44px] sm:min-h-[32px] bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl cursor-pointer hover:bg-[var(--paper-hover,var(--paper-soft))] text-[var(--ink)] transition-colors"
					onClick={() => onSelectFamily(f.id)}
				>
					<div className="text-xs font-semibold text-[var(--ink)]">{f.name}</div>
					<span className="px-2.5 py-1 text-xs bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] rounded-lg font-semibold">
						Выбрать
					</span>
				</button>
			))}
		</div>

		<div className="flex gap-2 mt-1">
			<button
				type="button"
				className="w-full p-2 min-h-[44px] sm:min-h-[32px] text-xs bg-[var(--paper-soft)] text-[var(--ink)] rounded-xl font-semibold cursor-pointer border border-[var(--line)] inline-flex items-center justify-center"
				onClick={onCancel}
				disabled={loading}
			>
				Отмена
			</button>
		</div>
	</div>
);
