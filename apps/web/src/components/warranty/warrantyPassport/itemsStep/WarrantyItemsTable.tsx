import { FileText, Trash2 } from "lucide-react";
import type React from "react";
import type { WarrantyCalculationResult, WarrantyItem } from "../../warrantyEngine.js";

export interface WarrantyItemsTableProps {
	items: WarrantyItem[];
	calculation: WarrantyCalculationResult;
	onRemoveItem: (id: string) => void;
}

export const WarrantyItemsTable: React.FC<WarrantyItemsTableProps> = ({
	items,
	calculation,
	onRemoveItem,
}) => {
	return (
		<div className="warranty-card-section">
			<div className="warranty-section-header">
				<h4>
					<FileText size={16} />
					Позиции гарантийного сертификата ({items.length}):
				</h4>
			</div>

			{items.length === 0 ? (
				<div style={{ color: "var(--ink-2)", fontSize: "13px", padding: "10px 0" }}>
					Позиции не добавлены. Выберите зубы и нажмите «Добавить в гарантийный паспорт».
				</div>
			) : (
				<table className="warranty-items-table">
					<thead>
						<tr>
							<th>Зуб</th>
							<th>Вид работы & код</th>
							<th>Материал & ЗТЛ</th>
							<th>Оттенок & LOT (МДЛП)</th>
							<th>Гарантия</th>
							<th>Действия</th>
						</tr>
					</thead>
					<tbody>
						{items.map((it) => (
							<tr key={it.id}>
								<td><strong>{it.toothNumber}</strong></td>
								<td style={{ maxWidth: "200px" }}>
									<div className="truncate min-w-0" title={it.clinicalWorkTitle}>{it.clinicalWorkTitle}</div>
									{it.serviceCode804n && (
										<div className="warranty-804n-badge" title="Код услуги">
											Код: {it.serviceCode804n}
										</div>
									)}
								</td>
								<td style={{ maxWidth: "220px" }}>
									<div className="truncate min-w-0" title={it.materialName}>{it.materialName}</div>
									{it.labOrderNumber && (
										<div className="warranty-ztl-badge" title="Номер наряда зуботехнической лаборатории">
											ЗТЛ: {it.labOrderNumber}
										</div>
									)}
								</td>
								<td>
									{it.vitaShade ? <span>Шейд: <strong>{it.vitaShade}</strong></span> : "—"}
									{it.lotNumber && (
										<div style={{ fontSize: "11px", color: "var(--ink-2)", marginTop: "2px" }}>
											Партия/МДЛП: {it.lotNumber}
										</div>
									)}
								</td>
								<td>{it.customWarrantyMonths ?? calculation.adjustedWarrantyMonths} мес.</td>
								<td>
									<button
										type="button"
										className="warranty-btn-icon"
										onClick={() => onRemoveItem(it.id)}
										title="Удалить позицию"
									>
										<Trash2 size={14} />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};
