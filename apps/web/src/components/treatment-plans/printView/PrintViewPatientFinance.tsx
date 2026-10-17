import React from "react";
import { formatWarrantyYearsText, type TreatmentPlanTier } from "../types";

export interface PrintViewPatientFinanceProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly doctorFullName: string;
	readonly patientName: string;
}

export const PrintViewPatientFinance: React.FC<PrintViewPatientFinanceProps> = ({
	selectedTier,
	doctorFullName,
	patientName,
}) => {
	const ndflRefund = selectedTier.ndflRefundRub ?? Math.round((selectedTier.totalRub ?? 0) * 0.13);
	const netPrice = selectedTier.priceWithNdflRefundRub ?? Math.max(0, (selectedTier.totalRub ?? 0) - ndflRefund);
	const monthly12 = selectedTier.installments?.[12]?.monthlyPaymentRub ?? Math.round((selectedTier.totalRub ?? 0) / 12);

	return (
		<>
			<div className="patient-finance-grid">
				<div className="patient-finance-card highlight">
					<div className="patient-finance-card-label">ИТОГО К ОПЛАТЕ ПО СМЕТЕ</div>
					<div className="patient-finance-card-value">{selectedTier.totalRub.toLocaleString("ru-RU")} ₽</div>
					<div className="patient-finance-card-desc">Полная фиксированная стоимость всех этапов и материалов «под ключ»</div>
				</div>

				<div className="patient-finance-card">
					<div className="patient-finance-card-label">ВОЗВРАТ 13% НДФЛ</div>
					<div className="patient-finance-card-value text-emerald-700">+{ndflRefund.toLocaleString("ru-RU")} ₽</div>
					<div className="patient-finance-card-desc">
						Фактическая стоимость: <strong>{netPrice.toLocaleString("ru-RU")} ₽</strong>. Справку для ФНС клиника выдает бесплатно.
					</div>
				</div>

				<div className="patient-finance-card">
					<div className="patient-finance-card-label">РАССРОЧКА 0% БЕЗ ПЕРЕПЛАТ</div>
					<div className="patient-finance-card-value text-indigo-700">от {monthly12.toLocaleString("ru-RU")} ₽/мес.</div>
					<div className="patient-finance-card-desc">На 12 месяцев равными частями без процентов и скрытых комиссий</div>
				</div>
			</div>

			<div className="text-xs text-slate-600 space-y-1 mb-6">
				<p>• План составлен в соответствии с Клиническими рекомендациями Стоматологической Ассоциации России (СтАР).</p>
				<p>• Гарантия на выполненные работы и материалы составляет <strong>{formatWarrantyYearsText(selectedTier.warrantyYears)}</strong> при соблюдении рекомендаций врача и прохождении плановой гигиены каждые 6 месяцев.</p>
				<p>• Информированное согласие (ст. 20 323-ФЗ): Пациент подтверждает ознакомление с планом, этапами, альтернативными сценариями лечения и порядком оплаты.</p>
			</div>

			<div className="treatment-print-signatures">
				<div>
					<div className="font-bold text-xs">Лечащий врач:</div>
					<div className="treatment-sig-box">
						<div>_____________________ / {doctorFullName} /</div>
						<div className="text-[8pt] text-slate-500 mt-1">подпись, печать клиники</div>
					</div>
				</div>
				<div>
					<div className="font-bold text-xs">Пациент:</div>
					<div className="treatment-sig-box">
						<div>_____________________ / {patientName} /</div>
						<div className="text-[8pt] text-slate-500 mt-1">С этапами, сроками и сметой ознакомлен и согласен. Вариант утвержден.</div>
					</div>
				</div>
			</div>
		</>
	);
};
