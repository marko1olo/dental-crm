import type React from "react";

export const WarehouseAuditTableHeader: React.FC = () => {
	return (
		<thead>
			<tr>
				<th style={{ width: 36, textAlign: "center" }}>№</th>
				<th>Наименование ТМЦ / Артикул</th>
				<th>Категория</th>
				<th style={{ textAlign: "center" }}>Серия (LOT)</th>
				<th style={{ textAlign: "center" }}>Срок годности</th>
				<th style={{ textAlign: "center" }}>Ед.</th>
				<th style={{ textAlign: "right" }}>Учет (книжн.)</th>
				<th style={{ textAlign: "center", width: 140 }}>Факт (наличие)</th>
				<th style={{ textAlign: "center" }}>Разница</th>
				<th style={{ textAlign: "right" }}>Цена (руб.)</th>
				<th style={{ textAlign: "right" }}>Сумма учета</th>
				<th style={{ textAlign: "right" }}>Сумма факта</th>
				<th style={{ textAlign: "right" }}>Расхождение (руб.)</th>
			</tr>
		</thead>
	);
};

export default WarehouseAuditTableHeader;
