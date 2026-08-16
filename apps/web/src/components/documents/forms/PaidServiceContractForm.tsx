import type React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { money } from "../../../utils/financeUtils";
import { appendChipToText } from "../documentChipText";
import {
	type PaidContractRequiredFieldsReview,
	paidContractRequiredFieldsReview,
} from "../paidContractRequiredFields";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { QuickChipsRow } from "../QuickChipsRow";

export const PAID_CONTRACT_FIELDS_BLOCK_TITLE = "Обязательные поля договора";

const PAID_CONTRACT_CARE_REASON_CHIPS = [
	"Кариес",
	"Пульпит",
	"Острая боль",
	"Плановый осмотр",
	"Профгигиена",
	"Жалобы отсутствуют",
] as const;

export interface PaidServiceContractFormProps {
	documentPatientFullName?: string | null;
	activeVisitComplaint?: string | null;
	activeVisitTreatmentPlan?: string | null;
	activeVisitDoctorSummary?: string | null;
	activeDoctorFullName?: string | null;
	totalRubValue?: number;
	totalRubFormatted?: string | null;
}

/**
 * Форма договора на оказание платных медицинских услуг:
 * стороны, реквизиты, условия оплаты, гарантии, сроки.
 */
export function PaidServiceContractForm({
	documentPatientFullName,
	activeVisitComplaint,
	activeVisitTreatmentPlan,
	activeVisitDoctorSummary,
	activeDoctorFullName,
	totalRubValue = 0,
	totalRubFormatted,
}: PaidServiceContractFormProps) {
	const {
		paidContractNumber,
		paidContractDate,
		paidContractServiceStart,
		paidContractServiceEnd,
		paidContractCustomerFullName,
		paidContractRepresentativeFullName,
		paidContractCareReason,
		paidContractServiceScope,
		paidContractTotalRub,
		paidContractDoctorFullName,
		paidContractPaymentTerms,
		paidContractPriceChangeRules,
		paidContractFreeCareNotice,
		paidContractRecommendationWarning,
		paidContractRefundTerms,
		paidContractWarrantyTerms,
		paidContractSignedAt,
		paidContractClinicInfoConfirmed,
		paidContractServiceListConfirmed,
		paidContractPaidBasisConfirmed,
		paidContractWrittenChangesConfirmed,
		setPaidContractNumber,
		setPaidContractDate,
		setPaidContractServiceStart,
		setPaidContractServiceEnd,
		setPaidContractCustomerFullName,
		setPaidContractRepresentativeFullName,
		setPaidContractCareReason,
		setPaidContractServiceScope,
		setPaidContractTotalRub,
		setPaidContractDoctorFullName,
		setPaidContractPaymentTerms,
		setPaidContractPriceChangeRules,
		setPaidContractFreeCareNotice,
		setPaidContractRecommendationWarning,
		setPaidContractRefundTerms,
		setPaidContractWarrantyTerms,
		setPaidContractSignedAt,
		setPaidContractClinicInfoConfirmed,
		setPaidContractServiceListConfirmed,
		setPaidContractPaidBasisConfirmed,
		setPaidContractWrittenChangesConfirmed,
	} = useDocumentStore();

	const review: PaidContractRequiredFieldsReview =
		paidContractRequiredFieldsReview({
			contractNumber: paidContractNumber,
			serviceStart: paidContractServiceStart,
			serviceEnd: paidContractServiceEnd,
			customerFullName: paidContractCustomerFullName,
			patientFullName: documentPatientFullName ?? "",
			careReason: paidContractCareReason,
			visitComplaint: activeVisitComplaint ?? "",
			serviceScope: paidContractServiceScope,
			visitTreatmentPlan: activeVisitTreatmentPlan ?? "",
			visitDoctorSummary: activeVisitDoctorSummary ?? "",
			totalRub: totalRubValue,
			paymentTerms: paidContractPaymentTerms,
			priceChangeRules: paidContractPriceChangeRules,
			freeCareNotice: paidContractFreeCareNotice,
			recommendationWarning: paidContractRecommendationWarning,
			refundTerms: paidContractRefundTerms,
			warrantyTerms: paidContractWarrantyTerms,
			doctorFullName: paidContractDoctorFullName,
			activeDoctorFullName: activeDoctorFullName ?? "",
			clinicInfoConfirmed: paidContractClinicInfoConfirmed,
			serviceListConfirmed: paidContractServiceListConfirmed,
			paidBasisConfirmed: paidContractPaidBasisConfirmed,
			writtenChangesConfirmed: paidContractWrittenChangesConfirmed,
		});

	return (
		<article className="document-payload-card">
			<div>
				<h3>Договор платных медицинских услуг</h3>
				<p>
					Фиксация номера, сроков, состава услуг, стоимости, порядка
					оплаты и обязательных уведомлений пациента до лечения.
				</p>
			</div>
			<PaidContractRequiredFieldsPanel
				review={review}
				fieldsBlockTitle={PAID_CONTRACT_FIELDS_BLOCK_TITLE}
			/>
			<details className="document-manual-override">
				<summary>
					✏️ {PAID_CONTRACT_FIELDS_BLOCK_TITLE}
					{review.missing.length
						? ` — не хватает ${review.missing.length}`
						: " — всё заполнено"}
					{" (развернуть)"}
				</summary>
				<div className="document-payload-collapsed-content">
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
					<label>
						Основание обращения
						<textarea
							value={paidContractCareReason}
							onChange={(event) =>
								setPaidContractCareReason(event.target.value)
							}
							placeholder={
								activeVisitComplaint ??
								"жалоба, диагноз или плановый повод"
							}
							rows={2}
						/>
						<QuickChipsRow
							chips={PAID_CONTRACT_CARE_REASON_CHIPS}
							onPick={(chip) =>
								setPaidContractCareReason(
									appendChipToText(paidContractCareReason, chip),
								)
							}
						/>
					</label>
					<label>
						Состав услуг
						<textarea
							value={paidContractServiceScope}
							onChange={(event) =>
								setPaidContractServiceScope(event.target.value)
							}
							placeholder={
								activeVisitTreatmentPlan ||
								activeVisitDoctorSummary ||
								"перечень согласованных платных услуг"
							}
							rows={3}
						/>
					</label>
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
					<label>
						Порядок оплаты
						<textarea
							value={paidContractPaymentTerms}
							onChange={(event) =>
								setPaidContractPaymentTerms(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Изменение цены и объема
						<textarea
							value={paidContractPriceChangeRules}
							onChange={(event) =>
								setPaidContractPriceChangeRules(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Уведомление о бесплатной помощи
						<textarea
							value={paidContractFreeCareNotice}
							onChange={(event) =>
								setPaidContractFreeCareNotice(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Предупреждение о рекомендациях врача
						<textarea
							value={paidContractRecommendationWarning}
							onChange={(event) =>
								setPaidContractRecommendationWarning(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Отказ и возврат
						<textarea
							value={paidContractRefundTerms}
							onChange={(event) =>
								setPaidContractRefundTerms(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Гарантия и претензии
						<textarea
							value={paidContractWarrantyTerms}
							onChange={(event) =>
								setPaidContractWarrantyTerms(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Подписано
						<input
							value={paidContractSignedAt}
							onChange={(event) =>
								setPaidContractSignedAt(event.target.value)
							}
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={paidContractClinicInfoConfirmed}
							type="checkbox"
							onChange={(event) =>
								setPaidContractClinicInfoConfirmed(event.target.checked)
							}
						/>
						Пациент получил сведения о клинике, лицензии и исполнителе
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={paidContractServiceListConfirmed}
							type="checkbox"
							onChange={(event) =>
								setPaidContractServiceListConfirmed(
									event.target.checked,
								)
							}
						/>
						Перечень услуг и стоимость переданы пациенту до подписания
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={paidContractPaidBasisConfirmed}
							type="checkbox"
							onChange={(event) =>
								setPaidContractPaidBasisConfirmed(event.target.checked)
							}
						/>
						Пациент понимает платную основу оказания услуг
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={paidContractWrittenChangesConfirmed}
							type="checkbox"
							onChange={(event) =>
								setPaidContractWrittenChangesConfirmed(
									event.target.checked,
								)
							}
						/>
						Изменения состава или стоимости оформляются письменно
					</label>
				</div>
			</details>
		</article>
	);
}
