import React from "react";
import { Printer } from "lucide-react";
import {
	type A4DocumentContractData,
	type A4DocumentActData,
	type A4DocumentTreatmentPlanData,
	type A4DocumentMedicalCardData,
	formatRubles,
	formatAmountInWordsRu,
	formatPassportString,
} from "@dental/shared";
import "../../styles/professional-a4-print.css";

export type ProfessionalA4DocumentTab = "contract" | "act" | "treatment_plan" | "medical_card";

export interface ProfessionalDocumentA4SheetProps {
	readonly activeTab?: ProfessionalA4DocumentTab;
	readonly onTabChange?: (tab: ProfessionalA4DocumentTab) => void;
	readonly contractData: A4DocumentContractData;
	readonly actData: A4DocumentActData;
	readonly treatmentPlanData: A4DocumentTreatmentPlanData;
	readonly medicalCardData: A4DocumentMedicalCardData;
	readonly onPrint?: () => void;
	readonly className?: string;
}

export const ProfessionalDocumentA4Sheet: React.FC<ProfessionalDocumentA4SheetProps> = ({
	activeTab = "contract",
	onTabChange,
	contractData,
	actData,
	treatmentPlanData,
	medicalCardData,
	onPrint,
	className = "",
}) => {
	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		} else {
			window.print();
		}
	};

	const cl = contractData?.clinic || medicalCardData?.clinic || actData?.clinic || treatmentPlanData?.clinic || {
		name: "Клиника",
		legalName: "ООО Стоматологическая клиника",
		inn: "",
		kpp: "",
		ogrn: "",
		address: "",
		phone: "",
	};

	return (
		<div className={`pro-a4-viewport ${className}`}>
			{/* Верхний служебный тулбар (скрывается при @media print) */}
			<div className="pro-a4-toolbar no-print">
				<div className="pro-a4-tab-selector dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "contract"}
						data-active={activeTab === "contract"}
						className={`pro-a4-tab-btn dente-segmented-item ${activeTab === "contract" ? "active" : ""}`}
						onClick={() => onTabChange?.("contract")}
						data-testid="a4-tab-contract"
					>
						1. Договор (ПП РФ № 736)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "act"}
						data-active={activeTab === "act"}
						className={`pro-a4-tab-btn dente-segmented-item ${activeTab === "act" ? "active" : ""}`}
						onClick={() => onTabChange?.("act")}
						data-testid="a4-tab-act"
					>
						2. Акт выполненных работ
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "treatment_plan"}
						data-active={activeTab === "treatment_plan"}
						className={`pro-a4-tab-btn dente-segmented-item ${activeTab === "treatment_plan" ? "active" : ""}`}
						onClick={() => onTabChange?.("treatment_plan")}
						data-testid="a4-tab-treatment-plan"
					>
						3. План лечения (Этапы)
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "medical_card"}
						data-active={activeTab === "medical_card"}
						className={`pro-a4-tab-btn dente-segmented-item ${activeTab === "medical_card" ? "active" : ""}`}
						onClick={() => onTabChange?.("medical_card")}
						data-testid="a4-tab-medical-card"
					>
						4. Дневник приёма / Карта
					</button>
				</div>

				<div className="pro-a4-toolbar-actions">
					<span className="pro-a4-format-badge">Формат A4 · 210 × 297 мм · ГОСТ</span>
					<button
						type="button"
						className="primary-button pro-a4-print-btn"
						onClick={handlePrint}
						data-testid="btn-print-a4-document"
					>
						<Printer size={16} aria-hidden="true" />
						<span>Печать на принтер (A4)</span>
					</button>
				</div>
			</div>

			{/* Физический белый лист A4 */}
			<div className="pro-a4-paper-container">
				<article className="pro-a4-physical-sheet" data-testid="pro-a4-physical-sheet">
					{/* ── 1. ДОГОВОР ── */}
					{activeTab === "contract" && (
						<div className="pro-a4-doc-content" data-testid="a4-contract-content">
							<header className="a4-header">
								<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
								<div className="a4-clinic-requisites">
									Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone} · ИНН: {cl.inn} · ОГРН: {cl.ogrn}
									<br />
									Лицензия на медицинскую деятельность: № {cl.licenseNumber}
									{cl.licenseDate ? ` от ${cl.licenseDate} г.` : ""}
									{cl.licenseIssuer ? ` (${cl.licenseIssuer})` : ""}
								</div>
							</header>

							<h1 className="a4-doc-title">{`ДОГОВОР № ${contractData.contractNumber}`}</h1>
							<div className="a4-doc-subtitle">
								на оказание платных медицинских стоматологических услуг
								<br />
								(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)
							</div>

							<div className="a4-meta-row">
								<div>{cl.city || "г. Москва"}</div>
								<div>«{contractData.contractDate}» г.</div>
							</div>

							<p className="a4-p">
								<strong>{cl.legalName || cl.name}</strong>
								{cl.shortName ? ` (${cl.shortName})` : ""}, именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице {cl.directorTitle || "Руководителя"} {cl.directorFullName || "уполномоченного лица"}, действующего на основании Устава и лицензии на осуществление медицинской деятельности № {cl.licenseNumber}, с одной стороны, и гражданин(ка) <strong>{contractData.patient.fullName}</strong>, именуемый(ая) в дальнейшем <strong>«Пациент» (Заказчик)</strong>, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
							</p>

							<h2 className="a4-section-heading">1. Предмет договора и уведомление о государственных гарантиях</h2>
							<p className="a4-p">
								1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества в соответствии с клиническими рекомендациями и стандартами медицинской помощи РФ, а Заказчик обязуется принять и оплатить оказанные услуги в соответствии со сметой и условиями настоящего Договора.
							</p>
							<p className="a4-p">
								1.2. <strong>Уведомление о программе госгарантий:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольное согласие на получение платных услуг.
							</p>
							<p className="a4-p">
								1.3. Основание обращения: <u>{contractData.clinicalReason || "Первичная консультация и осмотр врача-стоматолога"}</u>. Медкарта № <strong>{contractData.patient.cardNumber || "б/н"}</strong>.
							</p>

							<h2 className="a4-section-heading">2. Перечень и предварительная стоимость услуг</h2>
							<table className="a4-table">
								<thead>
									<tr>
										<th style={{ width: "25px" }}>№</th>
										<th style={{ width: "70px" }}>Код услуги</th>
										<th>Наименование медицинской услуги</th>
										<th style={{ width: "55px" }}>Зуб</th>
										<th style={{ width: "35px" }}>Кол.</th>
										<th style={{ width: "75px" }}>Цена (руб.)</th>
										<th style={{ width: "75px" }}>Сумма (руб.)</th>
									</tr>
								</thead>
								<tbody>
									{contractData.services && contractData.services.length > 0 ? (
										contractData.services.map((s, idx) => (
											<tr key={idx}>
												<td style={{ textAlign: "center" }}>{idx + 1}</td>
												<td style={{ textAlign: "center" }}>{s.code804n || "—"}</td>
												<td>{s.name}</td>
												<td style={{ textAlign: "center" }}>{s.toothOrArea || "—"}</td>
												<td style={{ textAlign: "center" }}>{s.quantity}</td>
												<td style={{ textAlign: "right" }}>{formatRubles(s.unitPriceRub)}</td>
												<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(s.totalRub)}</td>
											</tr>
										))
									) : (
										<tr>
											<td style={{ textAlign: "center" }}>1</td>
											<td style={{ textAlign: "center" }}>B01.065.001</td>
											<td>{contractData.serviceScopeSummary || "Комплексные стоматологические услуги в соответствии с планом лечения"}</td>
											<td style={{ textAlign: "center" }}>—</td>
											<td style={{ textAlign: "center" }}>1</td>
											<td style={{ textAlign: "right" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
											<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
										</tr>
									)}
								</tbody>
								<tfoot>
									<tr className="total-row">
										<td colSpan={6} style={{ textAlign: "right" }}>ИТОГО К ОПЛАТЕ:</td>
										<td style={{ textAlign: "right" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
									</tr>
								</tfoot>
							</table>

							<p className="a4-p-noindent" style={{ fontSize: "8.5pt" }}>
								<strong>Ориентировочная стоимость услуг:</strong> {formatRubles(contractData.estimatedTotalRub)} руб. ({formatAmountInWordsRu(contractData.estimatedTotalRub)}). Оплата подтверждается фискальным кассовым чеком по 54-ФЗ.
							</p>

							<h2 className="a4-section-heading">3. Права и обязанности сторон, гарантии и конфиденциальность</h2>
							<p className="a4-p">
								3.1. Исполнитель обязан: оказать услуги в соответствии с клиническими рекомендациями, оформить информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н) до начала медицинского вмешательства, обеспечить конфиденциальность персональных данных в соответствии с 152-ФЗ.
							</p>
							<p className="a4-p">
								3.2. Пациент обязан: строго соблюдать врачебный режим, являться на контрольные профилактические осмотры не реже 1 раза в 6 месяцев для сохранения гарантийных обязательств клиники.
							</p>

							<div className="a4-sign-grid">
								<div className="a4-sign-col">
									<strong>ИСПОЛНИТЕЛЬ:</strong><br />
									<strong>{cl.legalName || cl.name}</strong><br />
									Юр. адрес: {cl.address}<br />
									Факт. адрес: {cl.actualAddress || cl.address}<br />
									ОГРН: {cl.ogrn}, ИНН: {cl.inn}{cl.kpp ? `, КПП: ${cl.kpp}` : ""}<br />
									Р/с: {cl.checkingAccount || "40702810938000123456"} в {cl.bankName || 'ПАО "Сбербанк"'}<br />
									БИК: {cl.bik || "044525225"}, Тел: {cl.phone}<br /><br />
									{cl.directorTitle || "Руководитель / Врач"}:<br />
									<div className="a4-sign-line" />
									<div className="a4-sign-hint">/ {contractData.doctorFullName || cl.directorFullName || "________________________"} / <span className="stamp-box">М.П.</span></div>
								</div>
								<div className="a4-sign-col">
									<strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br />
									<strong>{contractData.patient.fullName}</strong><br />
									Дата рождения: {contractData.patient.birthDate || "«___» _________ _____ г."}<br />
									Паспорт: {formatPassportString(contractData.patient)}<br />
									Адрес регистрации: {contractData.patient.registrationAddress || contractData.patient.address || "____________________________________"}<br />
									Телефон: {contractData.patient.phone || "____________________"}<br />
									{contractData.patient.snils ? <>СНИЛС: {contractData.patient.snils}<br /></> : null}
									<br />
									Подпись Заказчика (Пациента):<br />
									<div className="a4-sign-line" />
									<div className="a4-sign-hint">/ {contractData.patient.fullName} /</div>
								</div>
							</div>
						</div>
					)}

					{/* ── 2. АКТ ВЫПОЛНЕННЫХ РАБОТ ── */}
					{activeTab === "act" && (
						<div className="pro-a4-doc-content" data-testid="a4-act-content">
							<header className="a4-header">
								<div className="a4-clinic-name">{actData.clinic.legalName || actData.clinic.name}</div>
								<div className="a4-clinic-requisites">
									Адрес: {actData.clinic.actualAddress || actData.clinic.address} · Тел: {actData.clinic.phone} · ИНН: {actData.clinic.inn} · ОГРН: {actData.clinic.ogrn}<br />
									Лицензия: № {actData.clinic.licenseNumber}
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
								{actData.fiscalReceiptNumber ? <div><strong>Фискальный чек ККТ (54-ФЗ):</strong> № {actData.fiscalReceiptNumber}</div> : null}
								<div style={{ marginTop: "3px" }}><strong>Гарантийные обязательства:</strong> {actData.warrantyTermsText || "12 месяцев на терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении рекомендаций врача."}</div>
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
					)}

					{/* ── 3. ПЛАН ЛЕЧЕНИЯ ── */}
					{activeTab === "treatment_plan" && (
						<div className="pro-a4-doc-content" data-testid="a4-treatment-plan-content">
							<header className="a4-header">
								<div className="a4-clinic-name">{treatmentPlanData.clinic.legalName || treatmentPlanData.clinic.name}</div>
								<div className="a4-clinic-requisites">
									Адрес: {treatmentPlanData.clinic.actualAddress || treatmentPlanData.clinic.address} · Тел: {treatmentPlanData.clinic.phone} · ИНН: {treatmentPlanData.clinic.inn}<br />
									Лицензия на медицинскую деятельность: № {treatmentPlanData.clinic.licenseNumber}
								</div>
							</header>

							<h1 className="a4-doc-title">ПЛАН КОМПЛЕКСНОГО ЛЕЧЕНИЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</h1>
							<div className="a4-doc-subtitle">Приложение к Договору на оказание платных медицинских услуг · Дата: «{treatmentPlanData.planDate}» г.</div>

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
										<td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Повод обращения / Диагноз:</td>
										<td colSpan={3}>{treatmentPlanData.diagnosisSummary || treatmentPlanData.clinicalReason || "Первичная консультация и комплексная санация"}</td>
									</tr>
								</tbody>
							</table>

							<h2 className="a4-section-heading">Этапы и калькуляция лечебных мероприятий</h2>
							{treatmentPlanData.stages.map((st) => (
								<div key={st.stageNumber} style={{ marginTop: "8px" }}>
									<div style={{ fontWeight: "bold", fontSize: "9pt", background: "#eeeeee", border: "0.75pt solid #000000", padding: "3px 6px", borderBottom: "none" }}>
										{st.stageName} {st.stageTiming ? `(Срок: ${st.stageTiming})` : ""}
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

							<h2 className="a4-section-heading">Блок согласования плана лечения пациентом</h2>
							<p className="a4-p-noindent" style={{ fontSize: "8pt", lineHeight: 1.3, textAlign: "justify" }}>
								План лечения может быть дополнен и скорректирован по предварительному согласованию с пациентом в соответствии с клиническими показаниями. Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков, а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные осмотры 1 раз в 6 месяцев для сохранения гарантий клиники. Врачом даны исчерпывающие ответы на все вопросы.
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
									<div className="a4-sign-hint">/ {treatmentPlanData.doctorFullName} /</div>
								</div>
								<div className="a4-sign-col">
									<strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br /><br />
									Пациент (Заказчик):<br />
									<div className="a4-sign-line" />
									<div className="a4-sign-hint">/ {treatmentPlanData.patient.fullName} / (с планом, сроками и стоимостью согласен)</div>
								</div>
							</div>
						</div>
					)}

					{/* ── 4. КАРТА / ДНЕВНИК ПРИЁМА (БЕЗ 043у В ЗАГОЛОВКАХ!) ── */}
					{activeTab === "medical_card" && (
						<div className="pro-a4-doc-content" data-testid="a4-medical-card-content">
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

							<div className="a4-sign-grid">
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
					)}
				</article>
			</div>
		</div>
	);
};

ProfessionalDocumentA4Sheet.displayName = "ProfessionalDocumentA4Sheet";
