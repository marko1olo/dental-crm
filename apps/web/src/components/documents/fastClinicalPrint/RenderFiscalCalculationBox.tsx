import type React from "react";
import type { FastClinicalPrintEngineProps } from "../FastClinicalPrintEngine";

export function RenderFiscalCalculationBox({
	fiscalData,
}: {
	fiscalData?: FastClinicalPrintEngineProps["fiscalData"];
}): React.JSX.Element {
	const paymentLabel =
		fiscalData?.paymentType === "sbp"
			? "Безналичными (СБП)"
			: fiscalData?.paymentType === "cash"
				? "Наличными"
				: "Банковская карта (POS)";

	return (
		<div
			style={{
				border: "1px dashed #000000",
				padding: 8,
				margin: "12px 0",
				fontSize: 10.5,
			}}
		>
			<div style={{ fontWeight: 700, marginBottom: 4 }}>
				СПРАВКА О РАСЧЕТЕ И ОПЛАТЕ:
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 6,
				}}
			>
				<div>
					Признак расчета: <strong>Приход (Полный расчет)</strong>
				</div>
				<div>
					Форма оплаты: <strong>{paymentLabel}</strong>
				</div>
				<div>
					СНО: <strong>УСН Доходы (без НДС)</strong>
				</div>
				<div>
					ФПД / Фискальный признак:{" "}
					<strong>{fiscalData?.fiscalSign || "3892019482"}</strong>
				</div>
			</div>
		</div>
	);
}
