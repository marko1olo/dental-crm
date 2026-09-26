import React from "react";
import { Edit3 } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { appendChipToText } from "../documentChipText";

export interface TreatmentCostEstimateFormProps {
	treatmentEstimatePatientOrPayerFullNameValue?: (() => string) | undefined;
	treatmentEstimateTreatmentBasisValue?: (() => string) | undefined;
	treatmentEstimateTotalRubValue?: (() => number) | undefined;
	activeDoctorFullName?: string | null | undefined;
	money?: ((val: number | null | undefined) => string) | undefined;
	plannedServiceLinesForFinancialPayload?: (() => any[]) | undefined;
}

export const TreatmentCostEstimateForm: React.FC<TreatmentCostEstimateFormProps> =
	React.memo(function TreatmentCostEstimateForm(props) {
		const {
			treatmentEstimatePatientOrPayerFullNameValue = () => "",
			treatmentEstimateTreatmentBasisValue = () => "",
			treatmentEstimateTotalRubValue = () => 0,
			activeDoctorFullName,
			money = (v) => String(v ?? 0),
			plannedServiceLinesForFinancialPayload = () => [],
		} = props;

		const {
			treatmentEstimateNumber,
			setTreatmentEstimateNumber,
			treatmentEstimateDate,
			setTreatmentEstimateDate,
			treatmentEstimatePatientOrPayerFullName,
			setTreatmentEstimatePatientOrPayerFullName,
			treatmentEstimateValidUntil,
			setTreatmentEstimateValidUntil,
			treatmentEstimateTreatmentBasis,
			setTreatmentEstimateTreatmentBasis,
			treatmentEstimateTotalRub,
			setTreatmentEstimateTotalRub,
			treatmentEstimateDoctorFullName,
			setTreatmentEstimateDoctorFullName,
			treatmentEstimatePriceChangeRules,
			setTreatmentEstimatePriceChangeRules,
			treatmentEstimateExcludedItems,
			setTreatmentEstimateExcludedItems,
			treatmentEstimatePaymentMilestoneNotes,
			setTreatmentEstimatePaymentMilestoneNotes,
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
			setTreatmentEstimateChangeRulesConfirmed,
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
					<summary
						style={{
							cursor: "pointer",
							fontWeight: 600,
							color: "var(--brand-700)",
							userSelect: "none",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
					</summary>
					<div
						className="document-payload-collapsed-content"
						style={{
							marginTop: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
						}}
					>
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
							<div
								className="quick-chips-row"
								style={{ marginTop: "6px", flexWrap: "wrap" }}
							>
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
										onClick={() =>
											setTreatmentEstimateTreatmentBasis(
												appendChipToText(
													treatmentEstimateTreatmentBasis,
													chip,
												),
											)
										}
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
									placeholder={
										treatmentEstimateTotalRubValue()
											? money(treatmentEstimateTotalRubValue())
											: "сумма цифрами, копейки после запятой"
									}
								/>
							</label>
							<label>
								Ответственный врач
								<input
									value={treatmentEstimateDoctorFullName}
									onChange={(event) =>
										setTreatmentEstimateDoctorFullName(event.target.value)
									}
									placeholder={activeDoctorFullName ?? "лечащий врач"}
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
							<div
								className="quick-chips-row"
								style={{ marginTop: "6px", flexWrap: "wrap" }}
							>
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
										onClick={() =>
											setTreatmentEstimateExcludedItems(
												appendChipToText(
													treatmentEstimateExcludedItems,
													chip,
												),
											)
										}
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
							<div
								className="quick-chips-row"
								style={{ marginTop: "6px", flexWrap: "wrap" }}
							>
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
										onClick={() =>
											setTreatmentEstimatePaymentMilestoneNotes(
												appendChipToText(
													treatmentEstimatePaymentMilestoneNotes,
													chip,
												),
											)
										}
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
							{plannedServiceLinesForFinancialPayload().length} строк, сумма{" "}
							{money(treatmentEstimateTotalRubValue())}.
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
							Пациент понимает предварительный характер сметы и срок действия
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
							При изменениях нужна обновленная смета или отдельное согласование
						</label>
					</div>
				</details>
			</article>
		);
	});
