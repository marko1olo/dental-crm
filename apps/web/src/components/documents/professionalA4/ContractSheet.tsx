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

export interface ContractSheetProps {
    zoomClass: string;
    contractData: A4DocumentContractData;
    cl: any;
}

export const ContractSheet: React.FC<ContractSheetProps> = ({
    contractData,
    cl,
    zoomClass,
}) => {
    return (
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
    );
};
