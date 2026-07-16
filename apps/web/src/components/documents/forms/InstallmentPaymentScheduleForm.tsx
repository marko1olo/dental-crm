import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function InstallmentPaymentScheduleForm({ activeDoctor, documentPatient, money, installmentScheduleBaseDocumentTitleValue, installmentScheduleInstallmentRows, installmentSchedulePrepaidRubValue, installmentScheduleRemainingRubValue, installmentScheduleTotalRubValue }: any) {
  const {
    installmentScheduleNumber,
    setInstallmentScheduleNumber,
    installmentScheduleDate,
    setInstallmentScheduleDate,
    installmentScheduleBaseDocumentTitle,
    setInstallmentScheduleBaseDocumentTitle,
    installmentSchedulePayerFullName,
    setInstallmentSchedulePayerFullName,
    installmentScheduleTotalRub,
    setInstallmentScheduleTotalRub,
    installmentSchedulePrepaidRub,
    setInstallmentSchedulePrepaidRub,
    installmentScheduleRows,
    setInstallmentScheduleRows,
    installmentScheduleLatePolicy,
    setInstallmentScheduleLatePolicy,
    installmentSchedulePaymentMethodNotes,
    setInstallmentSchedulePaymentMethodNotes,
    installmentScheduleResponsibleFullName,
    setInstallmentScheduleResponsibleFullName,
    installmentScheduleAccepted,
    setInstallmentScheduleAccepted,
    installmentScheduleFiscalNoticeConfirmed,
    setInstallmentScheduleFiscalNoticeConfirmed,
    installmentScheduleWrittenChangesConfirmed,
    setInstallmentScheduleWrittenChangesConfirmed
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>График рассрочки и оплат</h3>
								<p>
									Внутренний график сроков и сумм к договору или плану лечения
									без подмены банковского кредита.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<div className="document-payload-row">
										<label>
											Номер графика
											<input
												value={installmentScheduleNumber}
												onChange={(event) =>
													setInstallmentScheduleNumber(event.target.value)
												}
												placeholder="например: ГР-2026-001"
											/>
										</label>
										<label>
											Дата графика
											<input
												value={installmentScheduleDate}
												onChange={(event) =>
													setInstallmentScheduleDate(event.target.value)
												}
											/>
										</label>
									</div>
									<label>
										Основание
										<input
											value={installmentScheduleBaseDocumentTitle}
											onChange={(event) =>
												setInstallmentScheduleBaseDocumentTitle(
													event.target.value,
												)
											}
											placeholder={installmentScheduleBaseDocumentTitleValue()}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Плательщик
											<input
												value={installmentSchedulePayerFullName}
												onChange={(event) =>
													setInstallmentSchedulePayerFullName(
														event.target.value,
													)
												}
												placeholder={
													documentPatient?.fullName ?? "ФИО плательщика"
												}
											/>
										</label>
										<label>
											Ответственный
											<input
												value={installmentScheduleResponsibleFullName}
												onChange={(event) =>
													setInstallmentScheduleResponsibleFullName(
														event.target.value,
													)
												}
												placeholder={activeDoctor?.fullName ?? "администратор"}
											/>
										</label>
									</div>
									<div className="document-payload-row">
										<label>
											Общая сумма
											<input
												inputMode="numeric"
												value={installmentScheduleTotalRub}
												onChange={(event) =>
													setInstallmentScheduleTotalRub(event.target.value)
												}
												placeholder={String(
													installmentScheduleTotalRubValue() || "",
												)}
											/>
										</label>
										<label>
											Предоплата
											<input
												inputMode="numeric"
												value={installmentSchedulePrepaidRub}
												onChange={(event) =>
													setInstallmentSchedulePrepaidRub(event.target.value)
												}
												placeholder={String(
													installmentSchedulePrepaidRubValue() || "",
												)}
											/>
										</label>
									</div>
									<label>
										Платежи
										<textarea
											value={installmentScheduleRows}
											onChange={(event) =>
												setInstallmentScheduleRows(event.target.value)
											}
											rows={4}
										/>
										<span>
											Формат строки: этап | срок | сумма | запланировано /
											оплачено / просрочено / перенесено / отменено
										</span>
									</label>
									<p className="small">
										Остаток: {money(installmentScheduleRemainingRubValue())}.
										Платежей: {installmentScheduleInstallmentRows().length}.
									</p>
									<label>
										Правила просрочки
										<textarea
											value={installmentScheduleLatePolicy}
											onChange={(event) =>
												setInstallmentScheduleLatePolicy(event.target.value)
											}
											rows={2}
										/>
									</label>
									<label>
										Способы оплаты
										<textarea
											value={installmentSchedulePaymentMethodNotes}
											onChange={(event) =>
												setInstallmentSchedulePaymentMethodNotes(
													event.target.value,
												)
											}
											rows={2}
										/>
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={installmentScheduleAccepted}
											type="checkbox"
											onChange={(event) =>
												setInstallmentScheduleAccepted(event.target.checked)
											}
										/>
										Пациент или плательщик принял график
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={installmentScheduleFiscalNoticeConfirmed}
											type="checkbox"
											onChange={(event) =>
												setInstallmentScheduleFiscalNoticeConfirmed(
													event.target.checked,
												)
											}
										/>
										График не заменяет кассовый чек
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={installmentScheduleWrittenChangesConfirmed}
											type="checkbox"
											onChange={(event) =>
												setInstallmentScheduleWrittenChangesConfirmed(
													event.target.checked,
												)
											}
										/>
										Изменения суммы или сроков оформляются письменно
									</label>
								</div>
							</details>
						</article>
					
  );
}
