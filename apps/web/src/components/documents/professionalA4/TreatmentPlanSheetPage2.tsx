import React from "react";
import { formatAmountInWordsRu, formatRubles } from "@dental/shared";
import type { A4DocumentTreatmentPlanData } from "@dental/shared";
import { TreatmentPlanSignGrid } from "./TreatmentPlanSignGrid";
import { TreatmentPlanStagesTable } from "./TreatmentPlanStagesTable";

export function TreatmentPlanSheetPage2({
	treatmentPlanData,
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
}: {
	treatmentPlanData: A4DocumentTreatmentPlanData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet">
			<div className="a4-sheet-body">
				<div className="a4-running-header">
					<span>{cl.legalName || cl.name} · План лечения</span>
					<span>
						Пациент: {treatmentPlanData.patient.fullName} · Лист 2 из 2
					</span>
				</div>

				<TreatmentPlanStagesTable stages={treatmentPlanData.stages.slice(2)} />

				<div
					style={{
						border: "0.75pt solid #000000",
						padding: "6px 8px",
						margin: "8px 0",
						background: "#fcfcfc",
						fontSize: "8.5pt",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontWeight: "bold",
							fontSize: "9.5pt",
						}}
					>
						<div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
						<div>
							{formatRubles(treatmentPlanData.totalCostWithDiscountRub)} руб.
						</div>
					</div>
					{treatmentPlanData.discountRub ? (
						<div style={{ fontSize: "8pt", color: "#444444" }}>
							(Сумма без скидки:{" "}
							{formatRubles(treatmentPlanData.totalCostWithoutDiscountRub)}{" "}
							руб., скидка: {formatRubles(treatmentPlanData.discountRub)} руб.)
						</div>
					) : null}
					<div style={{ marginTop: "2px" }}>
						Сумма прописью:{" "}
						<strong>
							{formatAmountInWordsRu(
								treatmentPlanData.totalCostWithDiscountRub,
							)}
						</strong>
					</div>
				</div>

				<h2 className="a4-section-heading">
					Альтернативные варианты лечения и клинические риски
				</h2>
				<p
					className="a4-p-noindent"
					style={{ fontSize: "8pt", lineHeight: 1.3, textAlign: "justify" }}
				>
					Пациенту разъяснены возможные альтернативные планы лечения, включая
					сохранение зубов под коронками vs имплантация, а также риски отказа от
					эндодонтического лечения. При несоблюдении сроков этапов возможно
					смещение зубов.
				</p>

				<h2 className="a4-section-heading">
					Блок информированного согласования плана лечения пациентом
				</h2>
				<p
					className="a4-p-noindent"
					style={{ fontSize: "8pt", lineHeight: 1.3, textAlign: "justify" }}
				>
					Мне понятен план, этапность, ориентировочные сроки и предполагаемый
					результат лечения, возможные риски и порядок оплаты. Мне были
					представлены альтернативные варианты.
				</p>
				{treatmentPlanData.approvedVariantName ? (
					<div
						style={{
							fontWeight: "bold",
							fontSize: "8.5pt",
							marginTop: "4px",
						}}
					>
						Выбранный вариант плана: {treatmentPlanData.approvedVariantName}
					</div>
				) : null}

				<TreatmentPlanSignGrid treatmentPlanData={treatmentPlanData} />
			</div>

			<div className="a4-running-footer">
				<span>
					План комплексного лечения — Пациент:{" "}
					{treatmentPlanData.patient.fullName}
				</span>
				<span>Лист 2 из 2</span>
			</div>
		</section>
	);
}
