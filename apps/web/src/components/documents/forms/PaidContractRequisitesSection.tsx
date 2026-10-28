import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { money } from "../../../utils/financeUtils";

export interface PaidContractRequisitesSectionProps {
	documentPatientFullName?: string | null | undefined;
	activeDoctorFullName?: string | null | undefined;
	totalRubValue?: number | undefined;
	totalRubFormatted?: string | null | undefined;
}

export const PaidContractRequisitesSection = React.memo(
	function PaidContractRequisitesSection({
		documentPatientFullName,
		activeDoctorFullName,
		totalRubValue = 0,
		totalRubFormatted,
	}: PaidContractRequisitesSectionProps) {
		const {
			paidContractNumber, setPaidContractNumber,
			paidContractDate, setPaidContractDate,
			paidContractServiceStart, setPaidContractServiceStart,
			paidContractServiceEnd, setPaidContractServiceEnd,
			paidContractCustomerFullName, setPaidContractCustomerFullName,
			paidContractRepresentativeFullName, setPaidContractRepresentativeFullName,
			paidContractTotalRub, setPaidContractTotalRub,
			paidContractDoctorFullName, setPaidContractDoctorFullName,
		} = useDocumentStore();

		const totalPlaceholder = totalRubFormatted || (totalRubValue ? money(totalRubValue) : "сумма цифрами, копейки после запятой");

		return (
			<>
				<div className="document-payload-row">
					<label>
						Номер договора
						<input
							value={paidContractNumber}
							onChange={(e) => setPaidContractNumber(e.target.value)}
							placeholder="например: ДПМУ-2026-001"
						/>
					</label>
					<label>
						Дата договора
						<input
							value={paidContractDate}
							onChange={(e) => setPaidContractDate(e.target.value)}
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						Начало оказания
						<input
							value={paidContractServiceStart}
							onChange={(e) => setPaidContractServiceStart(e.target.value)}
							placeholder="дата и время первого этапа"
						/>
					</label>
					<label>
						Завершение
						<input
							value={paidContractServiceEnd}
							onChange={(e) => setPaidContractServiceEnd(e.target.value)}
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						Заказчик
						<input
							value={paidContractCustomerFullName}
							onChange={(e) => setPaidContractCustomerFullName(e.target.value)}
							placeholder={documentPatientFullName ?? "если не отличается от пациента"}
						/>
					</label>
					<label>
						Представитель
						<input
							value={paidContractRepresentativeFullName}
							onChange={(e) => setPaidContractRepresentativeFullName(e.target.value)}
							placeholder="если действует представитель"
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						Сумма договора
						<input
							inputMode="numeric"
							value={paidContractTotalRub}
							onChange={(e) => setPaidContractTotalRub(e.target.value)}
							placeholder={totalPlaceholder}
						/>
					</label>
					<label>
						Ответственный врач
						<input
							value={paidContractDoctorFullName}
							onChange={(e) => setPaidContractDoctorFullName(e.target.value)}
							placeholder={activeDoctorFullName ?? "лечащий врач"}
						/>
					</label>
				</div>
			</>
		);
	},
);

PaidContractRequisitesSection.displayName = "PaidContractRequisitesSection";
