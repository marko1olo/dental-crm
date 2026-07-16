import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PersonalDataProcessingConsentForm({ clinicProfileDraft }: any) {
  const {
    personalDataActions,
    personalDataAutomatedDecisionAllowed,
    personalDataCategories,
    personalDataConsentGivenAt,
    personalDataCrossBorderAllowed,
    personalDataMedicalProcessingAcknowledged,
    personalDataPurposes,
    personalDataRetentionPeriod,
    personalDataRevocationChannel,
    personalDataTransferRules,
    personalDataVoluntaryConsentConfirmed,
    setPersonalDataActions,
    setPersonalDataAutomatedDecisionAllowed,
    setPersonalDataCategories,
    setPersonalDataConsentGivenAt,
    setPersonalDataCrossBorderAllowed,
    setPersonalDataMedicalProcessingAcknowledged,
    setPersonalDataPurposes,
    setPersonalDataRetentionPeriod,
    setPersonalDataRevocationChannel,
    setPersonalDataTransferRules,
    setPersonalDataVoluntaryConsentConfirmed
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Согласие на ПДн</h3>
								<p>
									Оператор, цели, категории данных, передачи и отзыв согласия
									без пустого шаблона.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<div className="document-payload-row">
										<label>
											Оператор
											<input
												value={
													clinicProfileDraft.legalName ||
													clinicProfileDraft.clinicName
												}
												readOnly
												placeholder="заполните юридический профиль клиники"
											/>
										</label>
										<label>
											ИНН оператора
											<input
												value={clinicProfileDraft.inn}
												readOnly
												placeholder="из настроек клиники"
											/>
										</label>
									</div>
									<label>
										Адрес оператора
										<input
											value={clinicProfileDraft.address}
											readOnly
											placeholder="из настроек клиники"
										/>
									</label>
									<label>
										Цели обработки
										<textarea
											value={personalDataPurposes}
											onChange={(event) =>
												setPersonalDataPurposes(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label>
										Категории данных
										<textarea
											value={personalDataCategories}
											onChange={(event) =>
												setPersonalDataCategories(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label>
										Действия с данными
										<textarea
											value={personalDataActions}
											onChange={(event) =>
												setPersonalDataActions(event.target.value)
											}
											rows={4}
										/>
									</label>
									<label>
										Передача третьим лицам
										<textarea
											value={personalDataTransferRules}
											onChange={(event) =>
												setPersonalDataTransferRules(event.target.value)
											}
											rows={3}
										/>
									</label>
									<div className="document-payload-row">
										<label className="document-payload-checkbox">
											<input
												checked={personalDataCrossBorderAllowed}
												type="checkbox"
												onChange={(event) =>
													setPersonalDataCrossBorderAllowed(
														event.target.checked,
													)
												}
											/>
											Разрешена трансграничная передача
										</label>
										<label className="document-payload-checkbox">
											<input
												checked={personalDataAutomatedDecisionAllowed}
												type="checkbox"
												onChange={(event) =>
													setPersonalDataAutomatedDecisionAllowed(
														event.target.checked,
													)
												}
											/>
											Разрешены автоматизированные решения
										</label>
									</div>
									<label>
										Срок хранения
										<textarea
											value={personalDataRetentionPeriod}
											onChange={(event) =>
												setPersonalDataRetentionPeriod(event.target.value)
											}
											rows={2}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Порядок отзыва
											<textarea
												value={personalDataRevocationChannel}
												onChange={(event) =>
													setPersonalDataRevocationChannel(event.target.value)
												}
												rows={2}
											/>
										</label>
										<label>
											Дата согласия
											<input
												value={personalDataConsentGivenAt}
												onChange={(event) =>
													setPersonalDataConsentGivenAt(event.target.value)
												}
											/>
										</label>
									</div>
									<label className="document-payload-checkbox">
										<input
											checked={personalDataVoluntaryConsentConfirmed}
											type="checkbox"
											onChange={(event) =>
												setPersonalDataVoluntaryConsentConfirmed(
													event.target.checked,
												)
											}
										/>
										Пациент добровольно согласен на обработку персональных
										данных
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={personalDataMedicalProcessingAcknowledged}
											type="checkbox"
											onChange={(event) =>
												setPersonalDataMedicalProcessingAcknowledged(
													event.target.checked,
												)
											}
										/>
										Пациент понимает обработку медицинских данных
									</label>
								</div>
							</details>
						</article>
					
  );
}
