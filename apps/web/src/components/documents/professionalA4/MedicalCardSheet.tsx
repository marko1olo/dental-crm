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

export interface MedicalCardSheetProps {
    zoomClass: string;
    medicalCardData: A4DocumentMedicalCardData;
    cl: any;
    pt: any;
    doctor: string;
}

export const MedicalCardSheet: React.FC<MedicalCardSheetProps> = ({
    medicalCardData,
    cl,
    pt,
    doctor,
    zoomClass,
}) => {
    return (
        <div className="pro-a4-sheet-stack" data-testid="a4-medical-card-content">
						{/* ── ЛИСТ 1 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{medicalCardData.clinic.legalName || medicalCardData.clinic.name}</div>
									<div className="a4-clinic-requisites">
										Адрес: {medicalCardData.clinic.actualAddress || medicalCardData.clinic.address} · Тел: {medicalCardData.clinic.phone} · ИНН: {medicalCardData.clinic.inn}<br />
										Лицензия на осуществление медицинской деятельности: № {medicalCardData.clinic.licenseNumber}
									</div>
								</header>

								<h1 className="a4-doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА</h1>
								<div className="a4-doc-subtitle">
									Амбулаторная карта стоматологического пациента № <strong>{medicalCardData.cardNumber}</strong>
								</div>

								<h2 className="a4-section-heading">1. Паспортная часть и соматический статус</h2>
								<table className="a4-table">
									<tbody>
										<tr>
											<td style={{ width: "25%", fontWeight: "bold", background: "#f5f5f5" }}>Пациент (ФИО):</td>
											<td style={{ width: "45%" }}><strong>{medicalCardData.patient.fullName}</strong></td>
											<td style={{ width: "15%", fontWeight: "bold", background: "#f5f5f5" }}>Дата рождения:</td>
											<td style={{ width: "15%" }}>{medicalCardData.patient.birthDate || "—"}</td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Пол / Контакты:</td>
											<td>{medicalCardData.patient.gender === "female" ? "Женский" : medicalCardData.patient.gender === "male" ? "Мужской" : "—"} · Тел: {medicalCardData.patient.phone || "—"}</td>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>СНИЛС / ОМС:</td>
											<td>{medicalCardData.patient.snils || medicalCardData.patient.omsPolis || "—"}</td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Паспортные данные:</td>
											<td colSpan={3}>{formatPassportString(medicalCardData.patient)}</td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Адрес проживания:</td>
											<td colSpan={3}>{medicalCardData.patient.address || medicalCardData.patient.registrationAddress || "—"}</td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Аллергологический статус:</td>
											<td colSpan={3}><strong>{medicalCardData.allergyStatus || "Не отягощен (со слов пациента)"}</strong></td>
										</tr>
										<tr>
											<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Соматический статус:</td>
											<td colSpan={3}>{medicalCardData.somaticStatus || "Соматически здоров, сопутствующих заболеваний нет"}</td>
										</tr>
									</tbody>
								</table>

								<h2 className="a4-section-heading">2. Протокол клинического осмотра и статус полости рта</h2>
								<div style={{ fontSize: "9pt", margin: "4px 0" }}><strong>Жалобы:</strong> {medicalCardData.complaints || "Жалоб на момент осмотра активно не предъявляет."}</div>
								<div style={{ fontSize: "9pt", margin: "4px 0" }}><strong>Анамнез заболевания (Anamnesis morbi):</strong> {medicalCardData.anamnesisMorbi || "Обратился для планового осмотра и санации полости рта."}</div>
								<div style={{ fontSize: "9pt", margin: "4px 0" }}><strong>Объективный осмотр (Status localis):</strong> {medicalCardData.statusLocalis}</div>

								<h2 className="a4-section-heading">3. Зубная формула (FDI World Dental Federation)</h2>
								<table className="a4-table" style={{ fontSize: "7.5pt", textAlign: "center", margin: "4px 0" }}>
									<tbody>
										<tr>
											<td colSpan={8} style={{ background: "#eeeeee", fontWeight: "bold" }}>Верхняя челюсть справа</td>
											<td colSpan={8} style={{ background: "#eeeeee", fontWeight: "bold" }}>Верхняя челюсть слева</td>
										</tr>
										<tr style={{ background: "#f7f7f7", fontWeight: "bold" }}>
											{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
												<td key={t} style={{ width: "22px" }}>{t}</td>
											))}
										</tr>
										<tr>
											{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
												<td key={t} style={{ width: "22px" }}>
													{medicalCardData.teethFormulaMap?.[t]?.state || "—"}
												</td>
											))}
										</tr>
										<tr>
											<td colSpan={16} style={{ height: "4px", padding: 0, background: "#000000" }} />
										</tr>
										<tr>
											{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
												<td key={t} style={{ width: "22px" }}>
													{medicalCardData.teethFormulaMap?.[t]?.state || "—"}
												</td>
											))}
										</tr>
										<tr style={{ background: "#f7f7f7", fontWeight: "bold" }}>
											{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
												<td key={t} style={{ width: "22px" }}>{t}</td>
											))}
										</tr>
										<tr>
											<td colSpan={8} style={{ background: "#eeeeee", fontWeight: "bold" }}>Нижняя челюсть справа</td>
											<td colSpan={8} style={{ background: "#eeeeee", fontWeight: "bold" }}>Нижняя челюсть слева</td>
										</tr>
									</tbody>
								</table>
								<div style={{ fontSize: "7.5pt", color: "#444444", marginBottom: "6px" }}>
									Обозначения: С — кариес, P — пульпит, Pt — периодонтит, П — пломба, К — коронка, И — имплантат, 0 — отсутствует, — — интактный.
									{medicalCardData.teethFormulaSummary ? <><br /><strong>Расшифровка:</strong> {medicalCardData.teethFormulaSummary}</> : null}
								</div>
							</div>

							<div className="a4-running-footer">
								<span>Медицинская карта № {medicalCardData.cardNumber} — Пациент: {medicalCardData.patient.fullName}</span>
								<span>Лист 1 из 2</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{medicalCardData.clinic.legalName || medicalCardData.clinic.name} · Карта № {medicalCardData.cardNumber}</span>
									<span>Пациент: {medicalCardData.patient.fullName} · Лист 2 из 2</span>
								</div>

								<h2 className="a4-section-heading">4. Клинический диагноз (МКБ-10)</h2>
								<div style={{ fontSize: "9pt", margin: "4px 0" }}>
									<strong>Код МКБ-10:</strong> <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{medicalCardData.diagnosisIcd10}</span> — {medicalCardData.diagnosisDescription}
									{medicalCardData.diagnosisTooth ? ` (Область/Зуб FDI: № ${medicalCardData.diagnosisTooth})` : ""}
								</div>

								<h2 className="a4-section-heading">5. Дневник приёма и протокол проведённого лечения</h2>
								<div style={{ fontSize: "9pt", lineHeight: 1.35, textAlign: "justify", margin: "4px 0" }}>
									<strong>Дата приёма:</strong> «{medicalCardData.visitDate}» г.<br />
									<strong>Проведённое лечение:</strong><br />
									{medicalCardData.treatmentProtocol}
								</div>
								{medicalCardData.materialsUsed ? (
									<div style={{ fontSize: "8.5pt", margin: "3px 0" }}>
										<strong>Примененные препараты и материалы:</strong> {medicalCardData.materialsUsed}
									</div>
								) : null}

								<div style={{ fontSize: "9pt", margin: "4px 0" }}>
									<strong>Рекомендации и назначения:</strong> {medicalCardData.recommendations}
								</div>

								<div className="a4-sign-grid" style={{ marginTop: "30px" }}>
									<div className="a4-sign-col">
										<strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br /><br />
										{medicalCardData.doctorSpecialty || "Врач-стоматолог"}:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {medicalCardData.doctorFullName} / <span className="stamp-box">М.П.</span></div>
									</div>
									<div className="a4-sign-col">
										<strong>ПАЦИЕНТ:</strong><br /><br />
										С диагнозом, планом лечения и рекомендациями ознакомлен:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {medicalCardData.patient.fullName} /</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>Медицинская карта № {medicalCardData.cardNumber} — Пациент: {medicalCardData.patient.fullName}</span>
								<span>Лист 2 из 2</span>
							</div>
						</section>
					</div>
    );
};
