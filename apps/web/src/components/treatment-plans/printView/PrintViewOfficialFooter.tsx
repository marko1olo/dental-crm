import React from "react";
import { formatWarrantyYearsText, type TreatmentPlanTier } from "../types";

export interface PrintViewOfficialFooterProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly doctorFullName: string;
	readonly patientName: string;
}

export const PrintViewOfficialFooter: React.FC<PrintViewOfficialFooterProps> = ({
	selectedTier,
	doctorFullName,
	patientName,
}) => (
	<>
		<div style={{ fontSize: "8.5pt", lineHeight: "1.4", marginBottom: "16px" }}>
			<p style={{ margin: "4px 0" }}>
				1. Услуги оказываются в соответствии с клиническими рекомендациями Стоматологической ассоциации России (СтАР) и стандартами медицинской помощи.
			</p>
			<p style={{ margin: "4px 0" }}>
				2. Гарантийный срок на ортопедические конструкции и пломбировочные материалы составляет <strong>{formatWarrantyYearsText(selectedTier.warrantyYears)}</strong> при условии соблюдения пациентом правил гигиены и прохождения контрольных осмотров каждые 6 месяцев.
			</p>
			<p style={{ margin: "4px 0" }}>
				3. Дифференцированные гарантии клиники: Базовый / Эконом — 1 год; Оптимальный — 2 года; Премиум — 5 лет (пожизненная международная гарантия производителя на имплантаты Straumann/Astra Tech).
			</p>
			<p style={{ margin: "4px 0" }}>
				4. Заказчик уведомлен о праве на получение социального налогового вычета по НДФЛ в размере 13% от стоимости лечения (Код {selectedTier.ndflDetails.code}).
			</p>
		</div>

		<div className="treatment-print-signatures">
			<div>
				<div className="font-bold">Исполнитель (Врач):</div>
				<div className="treatment-sig-box">
					<div>_____________________ / {doctorFullName} /</div>
					<div className="text-[8pt] text-slate-500 mt-1">подпись, расшифровка, М.П.</div>
				</div>
			</div>
			<div>
				<div className="font-bold">Заказчик (Пациент):</div>
				<div className="treatment-sig-box">
					<div>_____________________ / {patientName} /</div>
					<div className="text-[8pt] text-slate-500 mt-1">С планом лечения, этапами, сроками и сметой ознакомлен и согласен</div>
				</div>
			</div>
		</div>
	</>
);
