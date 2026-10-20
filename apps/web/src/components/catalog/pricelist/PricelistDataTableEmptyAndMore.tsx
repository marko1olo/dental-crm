import { AlertCircle } from "lucide-react";
import type React from "react";

export interface PricelistDataTableEmptyAndMoreProps {
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly filteredCount: number;
	readonly onShowMore: () => void;
}

export const PricelistDataTableEmptyAndMore: React.FC<
	PricelistDataTableEmptyAndMoreProps
> = ({ hasMore, remainingCount, filteredCount, onShowMore }) => {
	return (
		<>
			{hasMore && (
				<tr>
					<td colSpan={8} style={{ textAlign: "center", padding: "0.75rem" }}>
						<button
							type="button"
							className="pricelist-btn btn-pricelist-show-more"
							onClick={onShowMore}
							style={{
								margin: "0 auto",
								fontSize: "0.8125rem",
								height: "36px",
								minHeight: "36px",
								minWidth: "220px",
							}}
							title="Подгрузить следующие позиции прейскуранта"
						>
							<span>Показать ещё 40 услуг (осталось {remainingCount})</span>
						</button>
					</td>
				</tr>
			)}

			{filteredCount === 0 && (
				<tr>
					<td
						colSpan={8}
						style={{
							textAlign: "center",
							padding: "3rem",
							color: "var(--muted)",
						}}
					>
						<AlertCircle
							size={32}
							style={{ margin: "0 auto 0.5rem", opacity: 0.5 }}
						/>
						<div style={{ fontWeight: 500 }}>Позиции по запросу не найдены</div>
					</td>
				</tr>
			)}
		</>
	);
};
