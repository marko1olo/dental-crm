import type React from "react";
import { formatAmountInWordsRu, formatRubles } from "@dental/shared";
import type { A4DocumentActData } from "@dental/shared";

export function ActWarrantyBox({
	actData,
}: {
	actData: A4DocumentActData;
}): React.JSX.Element {
	return (
		<div
			style={{
				border: "0.75pt solid #000000",
				padding: "6px 8px",
				margin: "8px 0",
				fontSize: "8.5pt",
				lineHeight: 1.35,
				background: "#fafafa",
			}}
		>
			<div>
				<strong>Всего оказано услуг на сумму:</strong>{" "}
				<strong>{formatRubles(actData.totalAmountRub)} руб.</strong> (
				{formatAmountInWordsRu(actData.totalAmountRub)})
			</div>
			{actData.fiscalReceiptNumber ? (
				<div>
					<strong>Фискальный чек онлайн-кассы:</strong> №{" "}
					{actData.fiscalReceiptNumber}
				</div>
			) : null}
			<div style={{ marginTop: "3px" }}>
				<strong>Гарантийные обязательства:</strong>{" "}
				{actData.warrantyTermsText ||
					"12 месяцев на терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении рекомендаций врача и графика осмотров."}
			</div>
			<div style={{ marginTop: "4px", fontWeight: "bold" }}>
				Юридическая формула сдачи-приемки:
			</div>
			<div style={{ textAlign: "justify", marginTop: "2px" }}>
				«Услуги оказаны в полном объеме, в установленные сроки, с надлежащим
				качеством в соответствии со стандартами и клиническими рекомендациями
				Минздрава РФ. Претензий по объему, качеству и стоимости оказанных
				медицинских услуг не имею.»
			</div>
		</div>
	);
}
