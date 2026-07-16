import React from 'react';
import { useDocumentStore } from "../../../store/documentStore";

export interface PaidMedicalServicesContractFormProps {
    dashboard: any;
    documentPatient: any;
    activeDoctor: any;
    paidContractTotalRubValue: () => number | string | undefined;
}

export function PaidMedicalServicesContractForm({
    dashboard,
    documentPatient,
    activeDoctor,
    paidContractTotalRubValue,
}: PaidMedicalServicesContractFormProps) {
	const {
		paidContractNumber,
		setPaidContractNumber,
		paidContractDate,
		setPaidContractDate,
		paidContractServiceStart,
		setPaidContractServiceStart,
		paidContractServiceEnd,
		setPaidContractServiceEnd,
		paidContractCustomerFullName,
		setPaidContractCustomerFullName,
		paidContractRepresentativeFullName,
		setPaidContractRepresentativeFullName,
		paidContractCareReason,
		setPaidContractCareReason,
		paidContractServiceScope,
		setPaidContractServiceScope,
		paidContractTotalRub,
		setPaidContractTotalRub,
		paidContractDoctorFullName,
		setPaidContractDoctorFullName,
		paidContractPaymentTerms,
		setPaidContractPaymentTerms,
		paidContractPriceChangeRules,
		setPaidContractPriceChangeRules,
		paidContractFreeCareNotice,
		setPaidContractFreeCareNotice,
		paidContractRecommendationWarning,
		setPaidContractRecommendationWarning,
		paidContractRefundTerms,
		setPaidContractRefundTerms,
		paidContractWarrantyTerms,
		setPaidContractWarrantyTerms,
		paidContractSignedAt,
		setPaidContractSignedAt,
		paidContractClinicInfoConfirmed,
		setPaidContractClinicInfoConfirmed,
		paidContractServiceListConfirmed,
		setPaidContractServiceListConfirmed,
		paidContractPaidBasisConfirmed,
		setPaidContractPaidBasisConfirmed,
		paidContractWrittenChangesConfirmed,
		setPaidContractWrittenChangesConfirmed,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
							<div>
								<h3>Договор платных медицинских услуг</h3>
								<p>
									Фиксация номера, сроков, состава услуг, стоимости, порядка
									оплаты и обязательных уведомлений пациента до лечения.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
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
													documentPatient?.fullName ??
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
												dashboard?.activeVisit?.complaint ??
												"жалоба, диагноз или плановый повод"
											}
											rows={2}
										/>
										<div className="quick-chips-row">
											{[
												"Кариес",
												"Пульпит",
												"Острая боль",
												"Плановый осмотр",
												"Профгигиена",
												"Жалобы отсутствуют",
											].map((chip) => (
												<button
													key={chip}
													type="button"
													className="quick-chip quick-chip--sm"
													onClick={() => {
														const current = paidContractCareReason.trim();
														setPaidContractCareReason(
															current
																? `${current}, ${chip.toLowerCase()}`
																: chip,
														);
													}}
												>
													+ {chip}
												</button>
											))}
										</div>
									</label>
									<label>
										Состав услуг
										<textarea
											value={paidContractServiceScope}
											onChange={(event) =>
												setPaidContractServiceScope(event.target.value)
											}
											placeholder={
												dashboard?.activeVisit?.treatmentPlan ||
												dashboard?.activeVisit?.doctorSummary ||
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
												placeholder={String(paidContractTotalRubValue() || "")}
											/>
										</label>
										<label>
											Ответственный врач
											<input
												value={paidContractDoctorFullName}
												onChange={(event) =>
													setPaidContractDoctorFullName(event.target.value)
												}
												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
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
