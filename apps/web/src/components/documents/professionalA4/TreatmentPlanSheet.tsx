import React from "react";
import { formatRubles, formatAmountInWordsRu, formatAddressString, formatPhoneString, formatDateString, formatPassportString, formatSnilsString, formatSignatoryString } from "@dental/shared";
import type {
    A4DocumentContractData,
    A4DocumentActData,
    A4DocumentTreatmentPlanData,
    A4DocumentInformedConsentData,
    A4DocumentPersonalDataConsentData,
    A4DocumentMedicalCardData
} from "@dental/shared";

export interface TreatmentPlanSheetProps {
    zoomClass: string;
    treatmentPlanData: A4DocumentTreatmentPlanData;
    cl: any;
}

export const TreatmentPlanSheet: React.FC<TreatmentPlanSheetProps> = ({
    treatmentPlanData,
    cl,
    zoomClass,
}) => {
    return (
        <div className="pro-a4-sheet-stack" data-testid="a4-treatment-plan-content">
						{/* ── ЛИСТ 1 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{treatmentPlanData.clinic.legalName || treatmentPlanData.clinic.name}</div>
									<div className="a4-clinic-requisites">
										Адрес: {treatmentPlanData.clinic.actualAddress || treatmentPlanData.clinic.address} · Тел: {treatmentPlanData.clinic.phone} · ИНН: {treatmentPlanData.clinic.inn}<br />
										Лицензия на медицинскую деятельность: № {treatmentPlanData.clinic.licenseNumber}
									</div>
								</header>

								<h1 className="a4-doc-title">ПЛАН КОМПЛЕКСНОГО ЛЕЧЕНИЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</h1>
								<div className="a4-doc-subtitle">Приложение к Договору на оказание платных медицинских услуг · Дата составления: «{treatmentPlanData.planDate}» г.</div>

								<table className="a4-table" style={{ marginBottom: "6px" }}>
									<tbody>
										<tr>
											<td style={{ width: "25%", fontWeight: "bold", background: "#f5f5f5" }}>Пациент (ФИО):</td>
											<td style={{ width: "45%" }}><strong>{treatmentPlanData.patient.fullName}</strong></td>
											<td style={{ width: "15%", fontWeight: "bold", background: "#f5f5f5" }}>№ карты:</td>
											<td style={{ width: "15%" }}><strong>{treatmentPlanData.patient.cardNumber || "б/н"}</strong></td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Дата рождения / Тел:</td>
											<td>{treatmentPlanData.patient.birthDate || "—"} · Тел: {treatmentPlanData.patient.phone || "—"}</td>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Лечащий врач:</td>
											<td><strong>{treatmentPlanData.doctorFullName}</strong></td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Клинический диагноз:</td>
											<td colSpan={3}>{treatmentPlanData.diagnosisSummary || treatmentPlanData.clinicalReason || "Первичная консультация и комплексная санация"}</td>
										</tr>
									</tbody>
								</table>

								<h2 className="a4-section-heading">Этапы и калькуляция лечебных мероприятий</h2>
								{treatmentPlanData.stages.slice(0, 2).map((st) => (
									<div key={st.stageNumber} style={{ marginTop: "8px" }}>
										<div style={{ fontWeight: "bold", fontSize: "9pt", background: "#eeeeee", border: "0.75pt solid #000000", padding: "3px 6px", borderBottom: "none" }}>
											{st.stageName} {st.stageTiming ? `(Ориентировочный срок: ${st.stageTiming})` : ""}
										</div>
										<table className="a4-table" style={{ marginTop: 0 }}>
											<thead>
												<tr>
													<th style={{ width: "25px" }}>№</th>
													<th>Наименование медицинской процедуры</th>
													<th style={{ width: "65px" }}>Зуб / область</th>
													<th style={{ width: "90px" }}>Сроки</th>
													<th style={{ width: "85px" }}>Стоимость (руб.)</th>
												</tr>
											</thead>
											<tbody>
												{st.plannedServices.map((srv, sIdx) => (
													<tr key={sIdx}>
														<td style={{ textAlign: "center" }}>{st.stageNumber}.{sIdx + 1}</td>
														<td>{srv.name}</td>
														<td style={{ textAlign: "center" }}>{srv.toothOrArea || "—"}</td>
														<td style={{ textAlign: "center" }}>{srv.timing || st.stageTiming || "по плану"}</td>
														<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(srv.priceRub)}</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr className="total-row">
													<td colSpan={4} style={{ textAlign: "right" }}>Итого по этапу:</td>
													<td style={{ textAlign: "right" }}>{formatRubles(st.stageTotalRub)}</td>
												</tr>
											</tfoot>
										</table>
									</div>
								))}
							</div>

							<div className="a4-running-footer">
								<span>План комплексного лечения — Пациент: {treatmentPlanData.patient.fullName}</span>
								<span>Стр. 1 из 2</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{cl.legalName || cl.name} · План лечения</span>
									<span>Пациент: {treatmentPlanData.patient.fullName} · Стр. 2 из 2</span>
								</div>

								{treatmentPlanData.stages.slice(2).map((st) => (
									<div key={st.stageNumber} style={{ marginTop: "4px" }}>
										<div style={{ fontWeight: "bold", fontSize: "9pt", background: "#eeeeee", border: "0.75pt solid #000000", padding: "3px 6px", borderBottom: "none" }}>
											{st.stageName} {st.stageTiming ? `(Ориентировочный срок: ${st.stageTiming})` : ""}
										</div>
										<table className="a4-table" style={{ marginTop: 0 }}>
											<thead>
												<tr>
													<th style={{ width: "25px" }}>№</th>
													<th>Наименование медицинской процедуры</th>
													<th style={{ width: "65px" }}>Зуб / область</th>
													<th style={{ width: "90px" }}>Сроки</th>
													<th style={{ width: "85px" }}>Стоимость (руб.)</th>
												</tr>
											</thead>
											<tbody>
												{st.plannedServices.map((srv, sIdx) => (
													<tr key={sIdx}>
														<td style={{ textAlign: "center" }}>{st.stageNumber}.{sIdx + 1}</td>
														<td>{srv.name}</td>
														<td style={{ textAlign: "center" }}>{srv.toothOrArea || "—"}</td>
														<td style={{ textAlign: "center" }}>{srv.timing || st.stageTiming || "по плану"}</td>
														<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(srv.priceRub)}</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr className="total-row">
													<td colSpan={4} style={{ textAlign: "right" }}>Итого по этапу:</td>
													<td style={{ textAlign: "right" }}>{formatRubles(st.stageTotalRub)}</td>
												</tr>
											</tfoot>
										</table>
									</div>
								))}

								<div style={{ border: "0.75pt solid #000000", padding: "6px 8px", margin: "8px 0", background: "#fcfcfc", fontSize: "8.5pt" }}>
									<div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "9.5pt" }}>
										<div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
										<div>{formatRubles(treatmentPlanData.totalCostWithDiscountRub)} руб.</div>
									</div>
									{treatmentPlanData.discountRub ? (
										<div style={{ fontSize: "8pt", color: "#444444" }}>
											(Сумма без скидки: {formatRubles(treatmentPlanData.totalCostWithoutDiscountRub)} руб., скидка: {formatRubles(treatmentPlanData.discountRub)} руб.)
										</div>
									) : null}
									<div style={{ marginTop: "2px" }}>
										Сумма прописью: <strong>{formatAmountInWordsRu(treatmentPlanData.totalCostWithDiscountRub)}</strong>
									</div>
								</div>

								<h2 className="a4-section-heading">Альтернативные варианты лечения и клинические риски</h2>
								<p className="a4-p-noindent" style={{ fontSize: "8pt", lineHeight: 1.3, textAlign: "justify" }}>
									Пациенту разъяснены возможные альтернативные планы лечения, включая сохранение зубов под коронками vs удаление с одномоментной дентальной имплантацией, а также риски отказа от эндодонтического перелечивания. При несоблюдении сроков этапов возможно смещение опорных зубов и удорожание ортопедического этапа.
								</p>

								<h2 className="a4-section-heading">Блок согласования плана лечения пациентом</h2>
								<p className="a4-p-noindent" style={{ fontSize: "8pt", lineHeight: 1.3, textAlign: "justify" }}>
									Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков, а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные осмотры 1 раз в 6 месяцев для сохранения гарантий клиники. Врачом даны исчерпывающие ответы на все вопросы.
								</p>
								{treatmentPlanData.approvedVariantName ? (
									<div style={{ fontWeight: "bold", fontSize: "8.5pt", marginTop: "4px" }}>
										Выбранный вариант плана: {treatmentPlanData.approvedVariantName}
									</div>
								) : null}

								<div className="a4-sign-grid">
									<div className="a4-sign-col">
										<strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong><br /><br />
										Лечащий врач:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {treatmentPlanData.doctorFullName} / <span className="stamp-box">М.П.</span></div>
									</div>
									<div className="a4-sign-col">
										<strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br /><br />
										Пациент (Заказчик):<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {treatmentPlanData.patient.fullName} / (с планом, сроками и стоимостью согласен)</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>План комплексного лечения — Пациент: {treatmentPlanData.patient.fullName}</span>
								<span>Стр. 2 из 2</span>
							</div>
						</section>
					</div>
    );
};
