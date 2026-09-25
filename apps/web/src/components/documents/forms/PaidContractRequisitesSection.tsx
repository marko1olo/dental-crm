import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { money } from "../../../utils/financeUtils";

export interface PaidContractRequisitesSectionProps {
	documentPatientFullName?: string | null;
	activeDoctorFullName?: string | null;
	totalRubValue?: number;
	totalRubFormatted?: string | null;
}

/**
 * Блок реквизитов договора платных медицинских услуг по ПП РФ № 736:
 * номер, дата, сроки оказания, стороны (заказчик, представитель),
 * сумма договора и ответственный лечащий врач.
 */
export const PaidContractRequisitesSection = React.memo(
	function PaidContractRequisitesSection({
		documentPatientFullName,
		activeDoctorFullName,
		totalRubValue = 0,
		totalRubFormatted,
	}: PaidContractRequisitesSectionProps) {
		const paidContractNumber = useDocumentStore(
			(state) => state.paidContractNumber,
		);
		const setPaidContractNumber = useDocumentStore(
			(state) => state.setPaidContractNumber,
		);
		const paidContractDate = useDocumentStore(
			(state) => state.paidContractDate,
		);
		const setPaidContractDate = useDocumentStore(
			(state) => state.setPaidContractDate,
		);
		const paidContractServiceStart = useDocumentStore(
			(state) => state.paidContractServiceStart,
		);
		const setPaidContractServiceStart = useDocumentStore(
			(state) => state.setPaidContractServiceStart,
		);
		const paidContractServiceEnd = useDocumentStore(
			(state) => state.paidContractServiceEnd,
		);
		const setPaidContractServiceEnd = useDocumentStore(
			(state) => state.setPaidContractServiceEnd,
		);
		const paidContractCustomerFullName = useDocumentStore(
			(state) => state.paidContractCustomerFullName,
		);
		const setPaidContractCustomerFullName = useDocumentStore(
			(state) => state.setPaidContractCustomerFullName,
		);
		const paidContractRepresentativeFullName = useDocumentStore(
			(state) => state.paidContractRepresentativeFullName,
		);
		const setPaidContractRepresentativeFullName = useDocumentStore(
			(state) => state.setPaidContractRepresentativeFullName,
		);
		const paidContractTotalRub = useDocumentStore(
			(state) => state.paidContractTotalRub,
		);
		const setPaidContractTotalRub = useDocumentStore(
			(state) => state.setPaidContractTotalRub,
		);
		const paidContractDoctorFullName = useDocumentStore(
			(state) => state.paidContractDoctorFullName,
		);
		const setPaidContractDoctorFullName = useDocumentStore(
			(state) => state.setPaidContractDoctorFullName,
		);

		return (
			<>
				<div className="document-payload-row">
					<label>
						Номер договора
						<input
							value={paidContractNumber}
							onChange={(event) =>
								setPaidContractNumber(event.target.value)
							}
							placeholder="например: ДПМУ-2026-001"
						/>
					</label>
					<label>
						Дата договора
						<input
							value={paidContractDate}
							onChange={(event) =>
								setPaidContractDate(event.target.value)
							}
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						Начало оказания
						<input
							value={paidContractServiceStart}
							onChange={(event) =>
								setPaidContractServiceStart(event.target.value)
							}
							placeholder="дата и время первого этапа"
						/>
					</label>
					<label>
						Завершение
						<input
							value={paidContractServiceEnd}
							onChange={(event) =>
								setPaidContractServiceEnd(event.target.value)
							}
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						Заказчик
						<input
							value={paidContractCustomerFullName}
							onChange={(event) =>
								setPaidContractCustomerFullName(event.target.value)
							}
							placeholder={
								documentPatientFullName ??
								"если не отличается от пациента"
							}
						/>
					</label>
					<label>
						Представитель
						<input
							value={paidContractRepresentativeFullName}
							onChange={(event) =>
								setPaidContractRepresentativeFullName(
									event.target.value,
								)
							}
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
							onChange={(event) =>
								setPaidContractTotalRub(event.target.value)
							}
							placeholder={
								totalRubFormatted ||
								(totalRubValue
									? money(totalRubValue)
									: "сумма цифрами, копейки после запятой")
							}
						/>
					</label>
					<label>
						Ответственный врач
						<input
							value={paidContractDoctorFullName}
							onChange={(event) =>
								setPaidContractDoctorFullName(event.target.value)
							}
							placeholder={activeDoctorFullName ?? "лечащий врач"}
						/>
					</label>
				</div>
			</>
		);
	},
);

PaidContractRequisitesSection.displayName = "PaidContractRequisitesSection";
