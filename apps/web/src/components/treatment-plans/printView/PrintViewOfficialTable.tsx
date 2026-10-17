import React from "react";
import type { TreatmentPlanTier } from "../types";
import { isMicroConsumable } from "../treatmentPlanConsumables";

export interface PrintViewOfficialTableProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly showMicroConsumables: boolean;
}

export const PrintViewOfficialTable: React.FC<PrintViewOfficialTableProps> = ({
	selectedTier,
	showMicroConsumables,
}) => {
	let globalIndex = 1;

	return (
		<table className="treatment-print-table">
			<thead>
				<tr>
					<th style={{ width: "24px" }}>№</th>
					<th style={{ width: "90px" }}>Код услуги</th>
					<th style={{ width: "45px" }}>Зуб</th>
					<th>Наименование медицинской услуги</th>
					<th style={{ width: "40px" }}>Кол-во</th>
					<th style={{ width: "70px" }}>Цена (руб.)</th>
					<th style={{ width: "70px" }}>Скидка (руб.)</th>
					<th style={{ width: "80px" }}>Стоимость (руб.)</th>
				</tr>
			</thead>
			<tbody>
				{selectedTier.stages.map((stage) => {
					const displayItems = showMicroConsumables
						? stage.items
						: stage.items.filter((it) => !isMicroConsumable(it));
					const microCount = stage.items.length - displayItems.length;

					return (
						<React.Fragment key={stage.stageNumber}>
							<tr className="treatment-print-stage-header">
								<td colSpan={7}>
									{stage.title} (Срок: {stage.estimatedWeeks} нед., {stage.estimatedVisits} визитов)
								</td>
								<td style={{ textAlign: "right" }}>{stage.totalRub.toLocaleString("ru-RU")}</td>
							</tr>
							{displayItems.map((it) => {
								const itemIdx = globalIndex++;
								return (
									<tr key={it.id || itemIdx}>
										<td style={{ textAlign: "center" }}>{itemIdx}</td>
										<td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.code804n}</td>
										<td style={{ textAlign: "center", fontWeight: "bold" }}>{it.toothNumber || "—"}</td>
										<td>
											<div>{it.name}</div>
											{it.materials && (
												<div style={{ fontSize: "8pt", color: "var(--muted)" }}>
													Материал: {it.materials}
												</div>
											)}
										</td>
										<td style={{ textAlign: "center" }}>{it.quantity}</td>
										<td style={{ textAlign: "right" }}>{it.unitPriceRub.toLocaleString("ru-RU")}</td>
										<td style={{ textAlign: "right" }}>{it.discountRub.toLocaleString("ru-RU")}</td>
										<td style={{ textAlign: "right", fontWeight: "bold" }}>
											{it.priceRub.toLocaleString("ru-RU")}
										</td>
									</tr>
								);
							})}
							{!showMicroConsumables && microCount > 0 && (
								<tr className="treatment-print-micro-row" style={{ fontStyle: "italic", fontSize: "8pt", color: "var(--muted)" }}>
									<td style={{ textAlign: "center" }}>•</td>
									<td colSpan={6}>
										Индивидуальный гигиенический и асептический комплект (салфетки, валики, слюноотсос, перчатки — {microCount} поз., включено в стоимость этапа)
									</td>
									<td style={{ textAlign: "right" }}>Включено</td>
								</tr>
							)}
						</React.Fragment>
					);
				})}
			</tbody>
			<tfoot>
				<tr className="treatment-print-total-row" style={{ fontWeight: "bold", fontSize: "10pt" }}>
					<td colSpan={7} style={{ textAlign: "right", paddingRight: "8px" }}>ИТОГО ПО СМЕТЕ:</td>
					<td style={{ textAlign: "right", fontSize: "11pt" }}>{selectedTier.totalRub.toLocaleString("ru-RU")} руб. 00 коп.</td>
				</tr>
			</tfoot>
		</table>
	);
};
