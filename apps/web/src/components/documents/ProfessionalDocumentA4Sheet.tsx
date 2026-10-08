import React from "react";
import { Printer } from "lucide-react";
import {
	type A4DocumentContractData,
	type A4DocumentActData,
	type A4DocumentTreatmentPlanData,
	type A4DocumentInformedConsentData,
	type A4DocumentPersonalDataConsentData,
	type A4DocumentMedicalCardData,
	formatRubles,
	formatAmountInWordsRu,
	formatPassportString,
} from "@dental/shared";
import "../../styles/professional-a4-print.css";

export type ProfessionalA4DocumentTab =
	| "contract"
	| "act"
	| "treatment_plan"
	| "consent_1051n"
	| "personal_data"
	| "medical_card";

export interface ProfessionalDocumentA4SheetProps {
	readonly activeTab?: ProfessionalA4DocumentTab;
	readonly onTabChange?: (tab: ProfessionalA4DocumentTab) => void;
	readonly contractData: A4DocumentContractData;
	readonly actData: A4DocumentActData;
	readonly treatmentPlanData: A4DocumentTreatmentPlanData;
	readonly consentData?: A4DocumentInformedConsentData | undefined;
	readonly personalDataConsent?: A4DocumentPersonalDataConsentData | undefined;
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
	consentData,
	personalDataConsent,
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

	const cl =
		contractData?.clinic ||
		medicalCardData?.clinic ||
		actData?.clinic ||
		treatmentPlanData?.clinic || {
			name: "ООО Стоматологическая клиника ДЕНТЕ Премиум",
			legalName: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
			shortName: 'ООО "ДЕНТЕ Премиум"',
			inn: "7710984521",
			kpp: "771001001",
			ogrn: "1217700456123",
			licenseNumber: "ЛО41-01137-77/00645892",
			licenseDate: "15.04.2022",
			licenseIssuer: "Департамент здравоохранения города Москвы",
			address: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			actualAddress: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			phone: "+7 (495) 123-45-67",
			city: "г. Москва",
			bankName: 'ПАО "Сбербанк"',
			bik: "044525225",
			checkingAccount: "40702810938000123456",
			correspondentAccount: "30101810400000000225",
			directorTitle: "Генеральный директор",
			directorFullName: "Воронов Алексей Владимирович",
		};

	const pt = contractData?.patient || medicalCardData?.patient;
	const doctor =
		contractData?.doctorFullName ||
		actData?.doctorFullName ||
		treatmentPlanData?.doctorFullName ||
		medicalCardData?.doctorFullName ||
		cl.directorFullName ||
		"Воронов Алексей Владимирович";

	return (
		<div className={`pro-a4-viewport ${className}`}>
			{/* Верхний компактный служебный тулбар (скрывается при @media print) */}
			<div className="pro-a4-toolbar no-print">
				<div className="pro-a4-tab-selector dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "contract"}
						className={`pro-a4-tab-btn ${activeTab === "contract" ? "active" : ""}`}
						onClick={() => onTabChange?.("contract")}
						data-testid="a4-tab-contract"
					>
						1. Договор (ПП РФ № 736) [3 листа]
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "act"}
						className={`pro-a4-tab-btn ${activeTab === "act" ? "active" : ""}`}
						onClick={() => onTabChange?.("act")}
						data-testid="a4-tab-act"
					>
						2. Акт услуг (804н) [1 лист]
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "treatment_plan"}
						className={`pro-a4-tab-btn ${activeTab === "treatment_plan" ? "active" : ""}`}
						onClick={() => onTabChange?.("treatment_plan")}
						data-testid="a4-tab-treatment-plan"
					>
						3. План лечения [2 листа]
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "consent_1051n"}
						className={`pro-a4-tab-btn ${activeTab === "consent_1051n" ? "active" : ""}`}
						onClick={() => onTabChange?.("consent_1051n")}
						data-testid="a4-tab-consent-1051n"
					>
						4. Согласие ИДС (1051н) [2 листа]
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "personal_data"}
						className={`pro-a4-tab-btn ${activeTab === "personal_data" ? "active" : ""}`}
						onClick={() => onTabChange?.("personal_data")}
						data-testid="a4-tab-personal-data"
					>
						5. Персданные (152-ФЗ) [1 лист]
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "medical_card"}
						className={`pro-a4-tab-btn ${activeTab === "medical_card" ? "active" : ""}`}
						onClick={() => onTabChange?.("medical_card")}
						data-testid="a4-tab-medical-card"
					>
						6. Карта / Дневник [2 листа]
					</button>
				</div>

				<div className="pro-a4-toolbar-actions">
					<span className="pro-a4-format-badge">Формат A4 · ГОСТ Р 7.0.97-2016</span>
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

			{/* Физический рабочий стол и стопка белых листов A4 */}
			<div className="pro-a4-paper-container">
				{/* ════════════════════════════════════════════════════════════════
				    1. ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДУСЛУГ (ПП РФ № 736) — 3 ЛИСТА
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "contract" && (
					<div className="pro-a4-sheet-stack" data-testid="a4-contract-content">
						{/* ── ЛИСТ 1 ИЗ 3 ── */}
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
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
									1.2. <strong>Уведомление о программе госгарантий:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольное согласие на получение медицинских услуг в клинике Исполнителя на платной основе.
								</p>
								<p className="a4-p">
									1.3. Основание обращения: <u>{contractData.clinicalReason || "Первичная консультация, диагностика и санация полости рта"}</u>. Номер медицинской карты: <strong>{contractData.patient.cardNumber || "б/н"}</strong>.
								</p>

								<h2 className="a4-section-heading">2. Условия и сроки предоставления медицинских услуг</h2>
								<p className="a4-p">
									2.1. Платные медицинские услуги предоставляются при наличии оформленного информированного добровольного согласия (ИДС) Пациента в соответствии со статьей 20 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» и Приказом Минздрава РФ № 1051н.
								</p>
								<p className="a4-p">
									2.2. Сроки оказания медицинских услуг определяются клинической ситуацией, согласованным Сторонами Планом лечения и графиком назначенных врачебных приемов.
								</p>

								<h2 className="a4-section-heading">3. Стоимость услуг и порядок расчетов</h2>
								<p className="a4-p">
									3.1. Предварительная ориентировочная стоимость медицинских услуг по настоящему Договору составляет: <strong>{formatRubles(contractData.estimatedTotalRub)} руб. ({formatAmountInWordsRu(contractData.estimatedTotalRub)})</strong> в соответствии со спецификацией (разделом 4 настоящего Договора).
								</p>
								<p className="a4-p">
									3.2. Оплата производится в рублях РФ наличными денежными средствами, с применением электронных средств платежа (банковской картой, СБП) или безналичным перечислением с обязательной выдачей фискального кассового чека в соответствии с Федеральным законом № 54-ФЗ.
								</p>
								<p className="a4-p">
									3.3. <strong>Запрет на одностороннее изменение сметы:</strong> Стоимость согласованных услуг является фиксированной. Оказание дополнительных платных услуг допускается исключительно после оформления письменного дополнительного соглашения или утверждения скорректированного Плана лечения.
								</p>
							</div>

							<div className="a4-running-footer">
								<span>Договор № {contractData.contractNumber} от {contractData.contractDate} г.</span>
								<span>Стр. 1 из 3</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 3 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{cl.legalName || cl.name} · Лицензия № {cl.licenseNumber}</span>
									<span>Договор № {contractData.contractNumber} · Стр. 2 из 3</span>
								</div>

								<h2 className="a4-section-heading">4. Перечень и предварительная спецификация услуг (Номенклатура МЗ РФ № 804н)</h2>
								<table className="a4-table">
									<thead>
										<tr>
											<th style={{ width: "25px" }}>№</th>
											<th style={{ width: "75px" }}>Код услуги</th>
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
													<td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{s.code804n || "—"}</td>
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
												<td>{contractData.serviceScopeSummary || "Комплексные специализированные стоматологические медицинские услуги по плану лечения"}</td>
												<td style={{ textAlign: "center" }}>—</td>
												<td style={{ textAlign: "center" }}>1</td>
												<td style={{ textAlign: "right" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
												<td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
											</tr>
										)}
									</tbody>
									<tfoot>
										<tr className="total-row">
											<td colSpan={6} style={{ textAlign: "right" }}>ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</td>
											<td style={{ textAlign: "right" }}>{formatRubles(contractData.estimatedTotalRub)}</td>
										</tr>
									</tfoot>
								</table>

								<p className="a4-p-noindent" style={{ fontSize: "8.5pt", margin: "4px 0 10px 0" }}>
									<strong>Сумма сметы прописью:</strong> {formatAmountInWordsRu(contractData.estimatedTotalRub)}. Оплата подтверждается кассовым чеком онлайн-кассы 54-ФЗ.
								</p>

								<h2 className="a4-section-heading">5. Права и обязанности Сторон</h2>
								<p className="a4-p">
									5.1. <strong>Исполнитель обязан:</strong> обеспечить соответствие оказываемых услуг порядкам оказания медицинской помощи, клиническим рекомендациям и стандартам; применять сертифицированные лекарственные средства и медицинские изделия; оформить Информированное добровольное согласие до начала каждого вмешательства; обеспечить безопасность персональных данных и сохранение врачебной тайны в соответствии со статьей 13 Федерального закона № 323-ФЗ и Федеральным законом № 152-ФЗ.
								</p>
								<p className="a4-p">
									5.2. <strong>Пациент обязан:</strong> информировать лечащего врача до начала манипуляций о перенесенных и сопутствующих соматических заболеваниях, аллергических реакциях, непереносимости анестетиков и принимаемых лекарственных препаратах; строго выполнять назначения и врачебный режим в период лечения; соблюдать гигиену полости рта; являться на назначенные приёмы и контрольные осмотры.
								</p>
								<p className="a4-p">
									5.3. <strong>Права Пациента:</strong> получать в доступной форме полную информацию о состоянии здоровья, характере манипуляций, применяемых материалах и возможных рисках; отказаться от медицинского вмешательства с оплатой фактически оказанных к моменту отказа услуг.
								</p>

								<h2 className="a4-section-heading">6. Гарантийные обязательства клиники</h2>
								<p className="a4-p">
									6.1. На выполненные стоматологические работы (композитные реставрации, несъемные ортопедические конструкции) устанавливаются гарантийные сроки в соответствии с Положением о гарантиях клиники: 12 месяцев на терапевтические пломбы, 24 месяца на керамические коронки.
								</p>
								<p className="a4-p">
									6.2. <strong>Условия сохранения гарантии:</strong> прохождение Пациентом обязательного бесплатного контрольного осмотра и профессиональной гигиены полости рта в клинике Исполнителя не реже 1 раза в 6 месяцев, а также соблюдение гигиенических рекомендаций лечащего врача.
								</p>
							</div>

							<div className="a4-running-footer">
								<span>Договор № {contractData.contractNumber} от {contractData.contractDate} г.</span>
								<span>Стр. 2 из 3</span>
							</div>
						</section>

						{/* ── ЛИСТ 3 ИЗ 3 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{cl.legalName || cl.name} · Лицензия № {cl.licenseNumber}</span>
									<span>Договор № {contractData.contractNumber} · Стр. 3 из 3</span>
								</div>

								<h2 className="a4-section-heading">7. Конфиденциальность, врачебная тайна и персональные данные (152-ФЗ)</h2>
								<p className="a4-p">
									7.1. Исполнитель гарантирует сохранность врачебной тайны и конфиденциальность персональных данных Пациента в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и статьи 13 Федерального закона № 323-ФЗ.
								</p>
								<p className="a4-p">
									7.2. Предоставление сведений, составляющих врачебную тайну, без согласия Пациента допускается исключительно по основаниям, прямо предусмотренным частью 4 статьи 13 Федерального закона № 323-ФЗ (в целях информирования органов контроля, по запросам суда и следственных органов, внесения сведений в ЕГИСЗ Минздрава РФ).
								</p>

								<h2 className="a4-section-heading">8. Ответственность Сторон и порядок разрешения споров</h2>
								<p className="a4-p">
									8.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством РФ и Законом РФ «О защите прав потребителей».
								</p>
								<p className="a4-p">
									8.2. Претензионный порядок урегулирования споров обязателен. Срок рассмотрения письменной претензии Стороной составляет 10 (десять) календарных дней с момента её получения. При недостижении согласия спор передается на рассмотрение суда по установленной подсудности.
								</p>

								<h2 className="a4-section-heading">9. Сведения о контролирующих органах</h2>
								<p className="a4-p" style={{ fontSize: "8pt" }}>
									Государственный надзор в сфере охраны здоровья осуществляют: Территориальный орган Росздравнадзора по г. Москве и МО (roszdravnadzor.gov.ru), Управление Роспотребнадзора по г. Москве (rospotrebnadzor.ru), Департамент здравоохранения города Москвы (mosgorzdrav.ru).
								</p>

								<h2 className="a4-section-heading">10. Срок действия договора и прочие условия</h2>
								<p className="a4-p">
									10.1. Настоящий Договор вступает в силу с даты его подписания Сторонами и действует до полного исполнения обязательств. Договор составлен в двух аутентичных экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон.
								</p>

								<h2 className="a4-section-heading">11. Адреса, банковские реквизиты и подписи Сторон</h2>
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
										<div className="a4-sign-hint">
											/ {contractData.doctorFullName || cl.directorFullName || "________________________"} /{" "}
											<span className="stamp-box">М.П.</span>
										</div>
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

							<div className="a4-running-footer">
								<span>Договор № {contractData.contractNumber} от {contractData.contractDate} г.</span>
								<span>Стр. 3 из 3</span>
							</div>
						</section>
					</div>
				)}

				{/* ════════════════════════════════════════════════════════════════
				    2. АКТ ВЫПОЛНЕННЫХ РАБОТ (ПРИКАЗ МЗ РФ № 804н) — 1 ЛИСТ
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "act" && (
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
								<span>Стр. 1 из 1</span>
							</div>
						</section>
					</div>
				)}

				{/* ════════════════════════════════════════════════════════════════
				    3. КОМПЛЕКСНЫЙ ПЛАН ЛЕЧЕНИЯ — 2 ЛИСТА
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "treatment_plan" && (
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
				)}

				{/* ════════════════════════════════════════════════════════════════
				    4. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (1051н) — 2 ЛИСТА
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "consent_1051n" && (
					<div className="pro-a4-sheet-stack" data-testid="a4-consent-1051n-content">
						{/* ── ЛИСТ 1 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
									<div className="a4-clinic-requisites">
										Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone} · ИНН: {cl.inn} · ОГРН: {cl.ogrn}<br />
										Лицензия на осуществление медицинской деятельности: № {cl.licenseNumber}
									</div>
								</header>

								<h1 className="a4-doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО</h1>
								<div className="a4-doc-subtitle">
									в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ
									<br />
									и Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н
								</div>

								<div className="a4-meta-row">
									<div>{cl.city || "г. Москва"}</div>
									<div>«{contractData.contractDate}» г.</div>
								</div>

								<p className="a4-p">
									Я, гражданин(ка) <strong>{pt.fullName}</strong>, дата рождения: {pt.birthDate || "«___» _________ _____ г."}, документ, удостоверяющий личность: {formatPassportString(pt)}, проживающий(ая) по адресу: {pt.registrationAddress || pt.address || "____________________________________"}, настоящим даю информированное добровольное согласие на проведение медицинского вмешательства лечащим врачом <strong>{doctor}</strong>.
								</p>

								<h2 className="a4-section-heading">1. Цели, методы и характер медицинского вмешательства</h2>
								<p className="a4-p">
									1.1. Мне в доступной форме разъяснены цели вмешательства: диагностика состояния зубочелюстной системы, купирование воспалительного процесса, восстановление анатомической формы, жевательной функции и эстетики зубов.
								</p>
								<p className="a4-p">
									1.2. Планируемые манипуляции включают: визуальный и инструментальный осмотр, фотопротокол, прицельную визиографию и КЛКТ, инфильтрационную и проводниковую местную анестезию, препарирование кариозных полостей с водно-воздушным охлаждением, изоляцию системой коффердам, эндодонтическую обработку корневых каналов, установку адгезивных композитных пломб и ортопедических конструкций.
								</p>

								<h2 className="a4-section-heading">2. Применяемая местная анестезия и возможные реакции</h2>
								<p className="a4-p">
									2.1. Для обезболивания применяются современные карпульные анестетики артикаинового ряда (Ультракаин, Убистезин) с вазоконстриктором (эпинефрин 1:100000 или 1:200000) либо без него при соматических противопоказаниях.
								</p>
								<p className="a4-p">
									2.2. Мне разъяснено, что применение местной анестезии может сопровождаться чувством распирания в месте инъекции, кратковременным учащением пульса, временным онемением губ, щек и языка длительностью от 1 до 4 часов, а также редкими рисками образования микрогематомы или индивидуальной аллергической реакции.
								</p>

								<h2 className="a4-section-heading">3. Возможные осложнения и нежелательные последствия</h2>
								<p className="a4-p">
									3.1. Мне разъяснено, что медицинское вмешательство сопряжено с естественными биологическими реакциями тканей: возможна постпломбировочная чувствительность зуба при накусывании в течение 3–7 дней, незначительная болезненность десны в месте фиксации клампа коффердама, изменение вкусовых ощущений.
								</p>
								<p className="a4-p">
									3.2. При глубоком кариесе существует вероятность случайного вскрытия воспаленной пульпы, требующего расширения вмешательства до эндодонтического лечения корневых каналов.
								</p>
							</div>

							<div className="a4-running-footer">
								<span>ИДС (Приказ МЗ РФ № 1051н) — Пациент: {pt.fullName}</span>
								<span>Стр. 1 из 2</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{cl.legalName || cl.name} · ИДС (Приказ МЗ РФ № 1051н)</span>
									<span>Пациент: {pt.fullName} · Стр. 2 из 2</span>
								</div>

								<h2 className="a4-section-heading">4. Альтернативные методы лечения</h2>
								<p className="a4-p">
									4.1. Мне разъяснены альтернативные методы лечения (динамическое наблюдение, консервативная реминерализирующая терапия при начальном кариесе, удаление зуба при невозможности эндодонтического сохранения) и последствия отказа от предложенного вмешательства.
								</p>

								<h2 className="a4-section-heading">5. Обязательства пациента и рекомендации после вмешательства</h2>
								<p className="a4-p">
									5.1. Я обязуюсь: воздержаться от приема твердой и горячей пищи до полного окончания действия анестезии во избежание травматического прикусывания мягких тканей; соблюдать щадящую диету в течение первых суток; тщательно выполнять индивидуальную гигиену полости рта рекомендованными средствами; незамедлительно связаться с клиникой при возникновении выраженного отека, повышении температуры тела или острой боли.
								</p>

								<h2 className="a4-section-heading">6. Право на отказ от медицинского вмешательства</h2>
								<p className="a4-p">
									6.1. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения в соответствии с частью 3 статьи 20 Федерального закона № 323-ФЗ. Возможные последствия отказа (прогрессирование инфекции, развитие пульпита, периодонтита, потеря зуба и распространение воспаления на челюстную кость) мне полностью понятны.
								</p>

								<h2 className="a4-section-heading">7. Подтверждение добровольности и информированности</h2>
								<p className="a4-p" style={{ fontWeight: "bold" }}>
									Я подтверждаю, что текст настоящего Информированного добровольного согласия мною прочитан, все медицинские термины разъяснены лечащим врачом, на все заданные вопросы получены исчерпывающие ответы. Я принимаю осознанное добровольное решение о прохождении медицинского вмешательства на предложенных условиях.
								</p>

								<div className="a4-sign-grid" style={{ marginTop: "30px" }}>
									<div className="a4-sign-col">
										<strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br /><br />
										Врач-стоматолог:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {doctor} / <span className="stamp-box">М.П.</span></div>
									</div>
									<div className="a4-sign-col">
										<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br /><br />
										Пациент:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {pt.fullName} / (согласие дано добровольно)</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>ИДС (Приказ МЗ РФ № 1051н) — Пациент: {pt.fullName}</span>
								<span>Стр. 2 из 2</span>
							</div>
						</section>
					</div>
				)}

				{/* ════════════════════════════════════════════════════════════════
				    5. СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ (152-ФЗ) — 1 ЛИСТ
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "personal_data" && (
					<div className="pro-a4-sheet-stack" data-testid="a4-personal-data-content">
						<section className="pro-a4-page-sheet" data-testid="pro-a4-physical-sheet">
							<div className="a4-sheet-body">
								<header className="a4-header">
									<div className="a4-clinic-name">{cl.legalName || cl.name}</div>
									<div className="a4-clinic-requisites">
										Оператор персональных данных · ИНН: {cl.inn} · ОГРН: {cl.ogrn}<br />
										Адрес: {cl.actualAddress || cl.address} · Тел: {cl.phone}
									</div>
								</header>

								<h1 className="a4-doc-title">СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ И СПЕЦИАЛЬНЫХ КАТЕГОРИЙ</h1>
								<div className="a4-doc-subtitle">
									в соответствии со статьями 6, 9 и 10 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»
								</div>

								<div className="a4-meta-row">
									<div>{cl.city || "г. Москва"}</div>
									<div>«{contractData.contractDate}» г.</div>
								</div>

								<p className="a4-p">
									Я, гражданин(ка) <strong>{pt.fullName}</strong>, дата рождения: {pt.birthDate || "«___» _________ _____ г."}, паспорт: {formatPassportString(pt)}, адрес регистрации: {pt.registrationAddress || pt.address || "____________________________________"}, телефон: {pt.phone || "____________________"}, СНИЛС: {pt.snils || "____________________"}, свободно, своей волей и в своем интересе даю согласие <strong>{cl.legalName || cl.name}</strong> (Оператор) на обработку моих персональных данных на следующих условиях:
								</p>

								<h2 className="a4-section-heading">1. Перечень обрабатываемых персональных данных</h2>
								<p className="a4-p">
									1.1. Общие категории персональных данных: фамилия, имя, отчество, пол, дата рождения, паспортные данные, адрес места жительства и регистрации, контактный телефон, адрес электронной почты, реквизиты полиса ОМС/ДМС, СНИЛС.
								</p>
								<p className="a4-p">
									1.2. <strong>Специальные категории персональных данных (статья 10 152-ФЗ):</strong> сведения о состоянии здоровья, жалобах, анамнезе заболеваний, перенесенных операциях, аллергических реакциях, результатах осмотров, лабораторных и инструментальных исследований (визиография, ОПТГ, КЛКТ), установленных стоматологических диагнозах и проведенном лечении.
								</p>

								<h2 className="a4-section-heading">2. Цели обработки персональных данных</h2>
								<p className="a4-p">
									2.1. Установление медицинского диагноза, оказание специализированной медицинской помощи и медицинских услуг.
								</p>
								<p className="a4-p">
									2.2. Ведение медицинской документации, учётных форм (медицинской карты амбулаторного пациента), передача обязательных сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ Минздрава РФ).
								</p>
								<p className="a4-p">
									2.3. Информирование о времени и дате назначенных приёмов, готовности ортопедических конструкций посредством SMS, мессенджеров или телефонных звонков.
								</p>

								<h2 className="a4-section-heading">3. Перечень действий с персональными данными и условия передачи</h2>
								<p className="a4-p">
									3.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение, использование, обезличивание, блокирование и уничтожение персональных данных с использованием средств автоматизации и без их использования.
								</p>
								<p className="a4-p">
									3.2. Передача персональных данных третьим лицам без согласия субъекта не допускается, за исключением случаев, прямо предусмотренных законодательством РФ (контролирующим органам, судам, органам следствия).
								</p>

								<h2 className="a4-section-heading">4. Срок действия согласия и порядок его отзыва</h2>
								<p className="a4-p">
									4.1. Настоящее согласие действует в течение установленного нормативными актами Минздрава РФ срока хранения первичной медицинской документации (25 лет для медицинских карт) либо до момента его письменного отзыва. Отзыв согласия может быть направлен Оператору в виде письменного заявления.
								</p>

								<div className="a4-sign-grid" style={{ marginTop: "40px" }}>
									<div className="a4-sign-col">
										<strong>ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br /><br />
										{cl.legalName || cl.name}<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">Ответственное лицо за обработку ПДн / М.П.</div>
									</div>
									<div className="a4-sign-col">
										<strong>СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br /><br />
										Пациент:<br />
										<div className="a4-sign-line" />
										<div className="a4-sign-hint">/ {pt.fullName} / (подпись субъекта ПДн)</div>
									</div>
								</div>
							</div>

							<div className="a4-running-footer">
								<span>Согласие на обработку персональных данных (152-ФЗ) — Пациент: {pt.fullName}</span>
								<span>Стр. 1 из 1</span>
							</div>
						</section>
					</div>
				)}

				{/* ════════════════════════════════════════════════════════════════
				    6. КАРТА / ДНЕВНИК ПРИЁМА (БЕЗ 043у В ЗАГОЛОВКАХ!) — 2 ЛИСТА
				════════════════════════════════════════════════════════════════ */}
				{activeTab === "medical_card" && (
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
								<span>Стр. 1 из 2</span>
							</div>
						</section>

						{/* ── ЛИСТ 2 ИЗ 2 ── */}
						<section className="pro-a4-page-sheet">
							<div className="a4-sheet-body">
								<div className="a4-running-header">
									<span>{medicalCardData.clinic.legalName || medicalCardData.clinic.name} · Карта № {medicalCardData.cardNumber}</span>
									<span>Пациент: {medicalCardData.patient.fullName} · Стр. 2 из 2</span>
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
								<span>Стр. 2 из 2</span>
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
};

ProfessionalDocumentA4Sheet.displayName = "ProfessionalDocumentA4Sheet";
