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
				<option value="Консультация">Прием / Консультация</option>
				<option value="Кариес">Лечение кариеса</option>
				<option value="Пульпит">Лечение пульпита</option>
				<option value="Анестезия">Местная анестезия</option>
				<option value="Снимок">Рентген / Снимок</option>
				<option value="Имплантация">Дентальная имплантация</option>
				<option value="Коронка">Коронка / Протезирование</option>
				<option value="Удаление">Удаление зуба</option>
				<option value="Гигиена">Профессиональная гигиена</option>
			</select>
		</>
	);
};
