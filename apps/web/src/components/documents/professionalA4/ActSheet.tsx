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

export interface ActSheetProps {
    zoomClass: string;
    actData: A4DocumentActData;
}

export const ActSheet: React.FC<ActSheetProps> = ({
    actData,
    zoomClass,
}) => {
    return (
        <div className="pro-a4-sheet-stack" data-testid="a4-act-content">
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{actData.clinic.legalName || actData.clinic.name}</div>
									<div className="a4-clinic-requisites">
										Адрес: {actData.clinic.actualAddress || actData.clinic.address} · Тел: {actData.clinic.phone} · ИНН: {actData.clinic.inn} · ОГРН: {actData.clinic.ogrn}<br />
										Лицензия на осуществление медицинской деятельности: № {actData.clinic.licenseNumber}
									</div>
								</header>

								<h1 className="a4-doc-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № {actData.actNumber}</h1>
								<div className="a4-doc-subtitle">
									к Договору на оказание платных медицинских услуг № <strong>{actData.contractNumber}</strong> от {actData.contractDate} г.<br />
									Дата составления Акта: <strong>«{actData.actDate}» г.</strong>
								</div>

								<table className="a4-table" style={{ marginBottom: "8px" }}>
									<tbody>
										<tr>
											<td style={{ width: "25%", fontWeight: "bold", background: "#f5f5f5" }}>Исполнитель:</td>
											<td style={{ width: "75%" }}>{actData.clinic.legalName || actData.clinic.name} (Лицензия № {actData.clinic.licenseNumber})</td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Заказчик / Пациент:</td>
											<td><strong>{actData.patient.fullName}</strong></td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Лечащий врач:</td>
											<td><strong>{actData.doctorFullName}</strong> ({actData.doctorSpecialty || "Врач-стоматолог"})</td>
										</tr>
									</tbody>
								</table>

								<h2 className="a4-section-heading">Перечень фактически оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</h2>
								<table className="a4-table">
									<thead>
										<tr>
											<th style={{ width: "25px" }}>№</th>
											<th style={{ width: "75px" }}>Код услуги</th>
											<th>Наименование медицинской услуги</th>
											<th style={{ width: "55px" }}>Зуб</th>
											<th style={{ width: "35px" }}>Кол.</th>
											<th style={{ width: "70px" }}>Цена (руб.)</th>
											<th style={{ width: "60px" }}>Скидка</th>
											<th style={{ width: "75px" }}>Итого (руб.)</th>
										</tr>
									</thead>
									<tbody>
										{actData.services.map((s, idx) => (
											<tr key={idx}>
												<td style={{ textAlign: "center" }}>{idx + 1}</td>
												<td style={{ textAlign: "center", fontFamily: "Courier New, monospace", fontWeight: "bold" }}>
													{s.code804n || "A16.07.002"}
												</td>
												<td>{s.name}</td>
												<td style={{ textAlign: "center" }}>{s.toothOrArea || "—"}</td>
												<td style={{ textAlign: "center" }}>{s.quantity}</td>
												<td style={{ textAlign: "right" }}>{formatRubles(s.unitPriceRub)}</td>
												<td style={{ textAlign: "right" }}>{s.discountRub ? formatRubles(s.discountRub) : "—"}</td>
												<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(s.totalRub)}</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr className="total-row">
											<td colSpan={7} style={{ textAlign: "right" }}>ИТОГО К ОПЛАТЕ:</td>
											<td style={{ textAlign: "right", fontSize: "9.5pt" }}>{formatRubles(actData.totalAmountRub)}</td>
										</tr>
									</tfoot>
								</table>

								<div style={{ border: "0.75pt solid #000000", padding: "6px 8px", margin: "8px 0", fontSize: "8.5pt", lineHeight: 1.35, background: "#fafafa" }}>
									<div><strong>Всего оказано услуг на сумму:</strong> <strong>{formatRubles(actData.totalAmountRub)} руб.</strong> ({formatAmountInWordsRu(actData.totalAmountRub)})</div>
									{actData.fiscalReceiptNumber ? <div><strong>Фискальный чек онлайн-кассы (54-ФЗ):</strong> № {actData.fiscalReceiptNumber}</div> : null}
									<div style={{ marginTop: "3px" }}><strong>Гарантийные обязательства:</strong> {actData.warrantyTermsText || "12 месяцев на терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении рекомендаций врача и графика осмотров."}</div>
									<div style={{ marginTop: "4px", fontWeight: "bold" }}>Юридическая формула сдачи-приемки:</div>
									<div style={{ textAlign: "justify", marginTop: "2px" }}>
										«Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством в соответствии со стандартами и клиническими рекомендациями Минздрава РФ. Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею.»
									</div>
								</div>

								<div className="a4-sign-grid">
									<div className="a4-sign-col">
										<strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br /><br />
										Врач-стоматолог:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {actData.doctorFullName} / <span className="stamp-box">М.П.</span></div>
									</div>
									<div className="a4-sign-col">
										<strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br /><br />
										Пациент / Заказчик:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {actData.patient.fullName} /</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>Акт № {actData.actNumber} от {actData.actDate} г. к Договору № {actData.contractNumber}</span>
								<span>Лист 1 из 1</span>
							</div>
						</section>
					</div>
    );
};
