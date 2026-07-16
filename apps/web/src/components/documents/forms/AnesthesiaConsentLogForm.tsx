import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function AnesthesiaConsentLogForm({ inferredTreatmentArea }: any) {
  const {
    anesthesiaMethod,
    setAnesthesiaMethod,
    anesthesiaAnesthetic,
    setAnesthesiaAnesthetic,
    anesthesiaVasoconstrictor,
    setAnesthesiaVasoconstrictor,
    anesthesiaZone,
    setAnesthesiaZone,
    anesthesiaAllergyStatus,
    setAnesthesiaAllergyStatus,
    anesthesiaRestrictionNotes,
    setAnesthesiaRestrictionNotes,
    anesthesiaDoseTime,
    setAnesthesiaDoseTime,
    anesthesiaDoseMl,
    setAnesthesiaDoseMl,
    anesthesiaReaction,
    setAnesthesiaReaction,
    anesthesiaRisksExplained,
    setAnesthesiaRisksExplained,
    anesthesiaAllergyRestrictionsChecked,
    setAnesthesiaAllergyRestrictionsChecked,
    anesthesiaConsentConfirmed,
    setAnesthesiaConsentConfirmed
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Журнал анестезии</h3>
								<p>Перед созданием: метод, препарат, зона, доза и реакция.</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
									<label>
										Метод
										<input
											value={anesthesiaMethod}
											onChange={(event) =>
												setAnesthesiaMethod(event.target.value)
											}
										/>
									</label>
									<label>
										Препарат
										<input
											value={anesthesiaAnesthetic}
											onChange={(event) =>
												setAnesthesiaAnesthetic(event.target.value)
											}
										/>
									</label>
									<label>
										Вазоконстриктор
										<input
											value={anesthesiaVasoconstrictor}
											onChange={(event) =>
												setAnesthesiaVasoconstrictor(event.target.value)
											}
										/>
									</label>
									<label>
										Зона
										<input
											value={anesthesiaZone}
											onChange={(event) =>
												setAnesthesiaZone(event.target.value)
											}
											placeholder={inferredTreatmentArea || "FDI / зона"}
										/>
									</label>
									<label>
										Аллергоанамнез
										<textarea
											value={anesthesiaAllergyStatus}
											onChange={(event) =>
												setAnesthesiaAllergyStatus(event.target.value)
											}
											rows={2}
										/>
									</label>
									<div className="document-payload-row">
										<label>
											Время
											<input
												value={anesthesiaDoseTime}
												onChange={(event) =>
													setAnesthesiaDoseTime(event.target.value)
												}
											/>
										</label>
										<label>
											Доза, мл
											<input
												value={anesthesiaDoseMl}
												onChange={(event) =>
													setAnesthesiaDoseMl(event.target.value)
												}
											/>
										</label>
									</div>
									<label>
										Реакция
										<textarea
											value={anesthesiaReaction}
											onChange={(event) =>
												setAnesthesiaReaction(event.target.value)
											}
											rows={2}
										/>
									</label>
									<label>
										Ограничения
										<textarea
											value={anesthesiaRestrictionNotes}
											onChange={(event) =>
												setAnesthesiaRestrictionNotes(event.target.value)
											}
											placeholder="например: без вазоконстриктора / контроль АД"
											rows={2}
										/>
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={anesthesiaRisksExplained}
											type="checkbox"
											onChange={(event) =>
												setAnesthesiaRisksExplained(event.target.checked)
											}
										/>
										Пациенту объяснены риски и ограничения анестезии
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={anesthesiaAllergyRestrictionsChecked}
											type="checkbox"
											onChange={(event) =>
												setAnesthesiaAllergyRestrictionsChecked(
													event.target.checked,
												)
											}
										/>
										Аллергии, лекарства и ограничения проверены до введения
									</label>
									<label className="document-payload-checkbox">
										<input
											checked={anesthesiaConsentConfirmed}
											type="checkbox"
											onChange={(event) =>
												setAnesthesiaConsentConfirmed(event.target.checked)
											}
										/>
										Пациент согласен на выбранную местную анестезию
									</label>
								</div>
							</details>
						</article>
					
  );
}
