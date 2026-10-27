import React from "react";

const TH_STYLE: React.CSSProperties = {
	fontSize: 11,
	color: "var(--muted)",
	fontWeight: 600,
	borderBottom: "1px solid var(--line)",
	textTransform: "uppercase",
	letterSpacing: 0.5,
	whiteSpace: "nowrap",
	padding: "8px 8px",
};

export const StockTableHeader: React.FC = () => {
	return (
		<thead style={{ position: "sticky", top: 0, background: "var(--paper-soft)", zIndex: 10 }}>
			<tr>
				<th className="inventory-col-name" style={{ ...TH_STYLE, padding: "8px 10px" }}>
					Наименование
				</th>
				<th className="inventory-col-category" style={{ ...TH_STYLE, width: 100 }}>
					Категория
				</th>
				<th className="inventory-col-fefo" style={{ ...TH_STYLE, width: 165 }}>
					<div className="leading-tight">
						<div>Срок годности</div>
						<div className="text-[10px] opacity-75 font-normal tracking-normal">Партия / FEFO</div>
					</div>
				</th>
				<th className="inventory-col-stock" style={{ ...TH_STYLE, width: 95, textAlign: "right" }}>
					Остаток
				</th>
				<th className="inventory-col-threshold" style={{ ...TH_STYLE, width: 80, textAlign: "right" }}>
					Мин. запас
				</th>
				<th className="inventory-col-cost" style={{ ...TH_STYLE, width: 130, minWidth: 130, textAlign: "right" }}>
					<div className="leading-tight inline-block text-right w-full">
						<div>Себестоимость</div>
						<div className="text-[10px] opacity-75 font-normal tracking-normal">за единицу</div>
					</div>
				</th>
				<th className="inventory-col-actions" style={{ ...TH_STYLE, textAlign: "right", width: 200, minWidth: 195 }}>
					Действия
				</th>
			</tr>
		</thead>
	);
};

export default StockTableHeader;
