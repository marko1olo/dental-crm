import React from "react";

export interface AddendumSignaturesBlockProps {
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly doctorFullName: string;
	readonly patientName: string;
	readonly patientId: string;
}

export const AddendumSignaturesBlock: React.FC<AddendumSignaturesBlockProps> = ({
	clinicName,
	clinicInn,
	doctorFullName,
	patientName,
	patientId,
}) => {
	return (
		<div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-[var(--line)] text-xs">
			<div>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				{clinicName}<br />
				ИНН: {clinicInn}<br />
				Врач: ___________________ / {doctorFullName} /<br />
				М.П.
			</div>
			<div>
				<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br />
				{patientName}<br />
				Паспорт / ИД: {patientId}<br />
				Подпись: ___________________ / {patientName} /
			</div>
		</div>
	);
};
