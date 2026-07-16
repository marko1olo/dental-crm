import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function TreatmentCostEstimateForm({ activeDoctor, money, plannedServiceLinesForFinancialPayload, treatmentEstimatePatientOrPayerFullNameValue, treatmentEstimateTotalRubValue, treatmentEstimateTreatmentBasisValue }: any) {
  const {
    treatmentEstimateNumber,
    setTreatmentEstimateNumber,
    treatmentEstimateDate,
    setTreatmentEstimateDate,
    treatmentEstimatePatientOrPayerFullName,
    setTreatmentEstimatePatientOrPayerFullName,
    treatmentEstimateTreatmentBasis,
    setTreatmentEstimateTreatmentBasis,
    treatmentEstimateTotalRub,
    setTreatmentEstimateTotalRub,
    treatmentEstimateValidUntil,
    setTreatmentEstimateValidUntil,
    treatmentEstimatePriceChangeRules,
    setTreatmentEstimatePriceChangeRules,
    treatmentEstimateExcludedItems,
    setTreatmentEstimateExcludedItems,
    treatmentEstimatePaymentMilestoneNotes,
    setTreatmentEstimatePaymentMilestoneNotes,
    treatmentEstimateDoctorFullName,
    setTreatmentEstimateDoctorFullName,
    treatmentEstimateAdminFullName,
    setTreatmentEstimateAdminFullName,
    treatmentEstimateSignedAt,
    setTreatmentEstimateSignedAt,
    treatmentEstimatePreliminaryConfirmed,
    setTreatmentEstimatePreliminaryConfirmed,
    treatmentEstimateScopeConfirmed,
    setTreatmentEstimateScopeConfirmed,
    treatmentEstimateFiscalNoticeConfirmed,
    setTreatmentEstimateFiscalNoticeConfirmed,
    treatmentEstimateChangeRulesConfirmed,
    setTreatmentEstimateChangeRulesConfirmed
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Смета лечения</h3>
								<p>
									Предварительный расчет с составом услуг, сроком действия,
									исключениями и правилами изменения цены.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<div className="document-payload-row">
										<label>
											Номер сметы
											<input
												value={treatmentEstimateNumber}
												onChange={(event) =>
													setTreatmentEstimateNumber(event.target.value)
												}
												placeholder="например: СМ-2026-001"
											/>
										</label>
										<label>
											Дата сметы
											<input
												value={treatmentEstimateDate}
												onChange={(event) =>
													setTreatmentEstimateDate(event.target.value)
												}
											/>
										</label>
									</div>
									<div className="document-payload-row">
										<label>
											Пациент или плательщик
											<input
												value={treatmentEstimatePatientOrPayerFullName}
												onChange={(event) =>
													setTreatmentEstimatePatientOrPayerFullName(
														event.target.value,
													)
												}
												placeholder={
													treatmentEstimatePatientOrPayerFullNameValue() ||
													"ФИО пациента или плательщика"
												}
											/>
										</label>
										<label>
											Смета действует до
											<input
												value={treatmentEstimateValidUntil}
												onChange={(event) =>
													setTreatmentEstimateValidUntil(event.target.value)
												}
												placeholder="дата или условие действия сметы"
											/>
										</label>
									</div>
									<label>
										Основание лечения
										<textarea
											value={treatmentEstimateTreatmentBasis}
											onChange={(event) =>
												setTreatmentEstimateTreatmentBasis(event.target.value)
											}
											placeholder={treatmentEstimateTreatmentBasisValue()}
											rows={3}
										/>
										<div className="quick-chips-row">
											{[
												"Кариес дентина",
												"Острый пульпит",
												"Частичная адентия",
												"Хронический периодонтит",
												"Осмотр и профгигиена",
											].map((chip) => (
												<button
													key={chip}
													type="button"
													className="quick-chip quick-chip--sm"
													onClick={() => {
														const current =
															treatmentEstimateTreatmentBasis.trim();
														setTreatmentEstimateTreatmentBasis(
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
									<div className="document-payload-row">
										<label>
											Итого по смете
											<input
												inputMode="numeric"
												value={treatmentEstimateTotalRub}
												onChange={(event) =>
													setTreatmentEstimateTotalRub(event.target.value)
												}
												placeholder={String(
													treatmentEstimateTotalRubValue() || "",
												)}
											/>
										</label>
										<label>
											Ответственный врач
											<input
												value={treatmentEstimateDoctorFullName}
												onChange={(event) =>
													setTreatmentEstimateDoctorFullName(event.target.value)
												}
												placeholder={activeDoctor?.fullName ?? "лечащий врач"}
											/>
										</label>
									</div>
									<label>
										Правила изменения цены
										<textarea
											value={treatmentEstimatePriceChangeRules}
											onChange={(event) =>
												setTreatmentEstimatePriceChangeRules(event.target.value)
											}
											rows={3}
										/>
									</label>
									<label>
										Не входит в текущую смету
										<textarea
											value={treatmentEstimateExcludedItems}
											onChange={(event) =>
												setTreatmentEstimateExcludedItems(event.target.value)
											}
											rows={4}
										/>
										<div className="quick-chips-row">
											{[
												"Рентгенологические снимки",
												"Анестезия",
												"Дополнительные материалы",
												"Консультации смежных специалистов",
												"Удаление зубов",
											].map((chip) => (
												<button
													key={chip}
													type="button"
													className="quick-chip quick-chip--sm"
													onClick={() => {
														const current =
															treatmentEstimateExcludedItems.trim();
														setTreatmentEstimateExcludedItems(
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
										Условия оплаты
										<textarea
											value={treatmentEstimatePaymentMilestoneNotes}
											onChange={(event) =>
												setTreatmentEstimatePaymentMilestoneNotes(
													event.target.value,
												)
											}
											rows={3}
										/>
										<div className="quick-chips-row">
											{[
												"100% предоплата",
												"Оплата по факту",
												"Аванс 50%",
												"Оплата поэтапно",
												"В рассрочку",
											].map((chip) => (
												<button
													key={chip}
													type="button"
													className="quick-chip quick-chip--sm"
													onClick={() => {
														const current =
															treatmentEstimatePaymentMilestoneNotes.trim();
														setTreatmentEstimatePaymentMilestoneNotes(
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
									<div className="document-payload-row">
										<label>
											Ответственный администратор
											<input
												value={treatmentEstimateAdminFullName}
												onChange={(event) =>
													setTreatmentEstimateAdminFullName(event.target.value)
												}
												placeholder="если отличается от врача"
											/>
										</label>
										<label>
											Ознакомление
											<input
												value={treatmentEstimateSignedAt}
												onChange={(event) =>
													setTreatmentEstimateSignedAt(event.target.value)
												}
											/>
										</label>
									</div>
									<small>
										Состав услуг берется из плана лечения:{" "}
										{plannedServiceLinesForFinancialPayload().length} строк,
										сумма {money(treatmentEstimateTotalRubValue())}.
									</small>
									<label className="document-payload-checkbox">
										<input
											checked={treatmentEstimatePreliminaryConfirmed}
											type="checkbox"
											onChange={(event) =>
												setTreatmentEstimatePreliminaryConfirmed(
													event.target.checked,
												)
											}
										/>
										Пациент понимает предварительный характер сметы и срок
										действия
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={treatmentEstimateScopeConfirmed}
											type="checkbox"
											onChange={(event) =>
												setTreatmentEstimateScopeConfirmed(event.target.checked)
											}
										/>
										Состав услуг сметы сверён с планом лечения
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={treatmentEstimateFiscalNoticeConfirmed}
											type="checkbox"
											onChange={(event) =>
												setTreatmentEstimateFiscalNoticeConfirmed(
													event.target.checked,
												)
											}
										/>
										Смета не заменяет договор, акт и кассовый чек
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={treatmentEstimateChangeRulesConfirmed}
											type="checkbox"
											onChange={(event) =>
												setTreatmentEstimateChangeRulesConfirmed(
													event.target.checked,
												)
											}
										/>
										При изменениях нужна обновленная смета или отдельное
										согласование
									</label>
								</div>
							</details>
						</article>
					
  );
}
