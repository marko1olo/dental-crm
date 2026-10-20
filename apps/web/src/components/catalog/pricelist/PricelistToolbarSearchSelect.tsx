import { Search, X } from "lucide-react";
import type React from "react";
import { useId } from "react";

export interface PricelistToolbarSearchSelectProps {
	readonly searchTerm: string;
	readonly onSearchChange: (value: string) => void;
	readonly onSelectPopularService: (value: string) => void;
}

export const PricelistToolbarSearchSelect: React.FC<
	PricelistToolbarSearchSelectProps
> = ({ searchTerm, onSearchChange, onSelectPopularService }) => {
	const searchInputId = useId();

	return (
		<>
			<div
				className="dente-search-wrap pricelist-search-box"
				style={{ maxWidth: "300px", minWidth: "200px" }}
			>
				<Search size={14} className="dente-search-icon pricelist-search-icon" />
				<input
					id={searchInputId}
					type="text"
					className="dente-search-input pricelist-search-input"
					placeholder="Поиск по коду, названию..."
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				{searchTerm && (
					<button
						type="button"
						className="dente-search-clear pricelist-search-clear"
						onClick={() => onSearchChange("")}
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>

			<select
				className="pricelist-search-input"
				style={{
					height: "36px",
					padding: "0 0.5rem",
					width: "auto",
					fontSize: "0.8125rem",
				}}
				value={searchTerm}
				onChange={(e) => onSelectPopularService(e.target.value)}
				title="Мгновенный выбор популярной услуги"
			>
				<option value="">Быстрый выбор услуги...</option>
				<option value="B01.065.001">Б01.065.001 Прием / Консультация</option>
				<option value="A16.07.002">A16.07.002 Кариес</option>
				<option value="A16.07.008">A16.07.008 Пульпит</option>
				<option value="A11.07.012">A11.07.012 Анестезия</option>
				<option value="A06.07.003">A06.07.003 Снимок / ОПТГ</option>
				<option value="A16.07.054">A16.07.054 Имплантация</option>
				<option value="A16.07.004">A16.07.004 Коронка</option>
				<option value="A16.07.001">A16.07.001 Удаление</option>
				<option value="A16.07.051">A16.07.051 Профессиональная гигиена</option>
			</select>
		</>
	);
};
