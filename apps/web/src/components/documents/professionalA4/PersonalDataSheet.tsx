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

export interface PersonalDataSheetProps {
    zoomClass: string;
    effectivePersonalDataConsent: A4DocumentPersonalDataConsentData | undefined;
    cl: any;
}

export const PersonalDataSheet: React.FC<PersonalDataSheetProps> = ({
    effectivePersonalDataConsent,
    cl,
    zoomClass,
}) => {
    const pt = effectivePersonalDataConsent?.patient ?? ({} as any);
    const contractDate = effectivePersonalDataConsent?.consentDate ?? new Date().toLocaleDateString("ru-RU");

    return (
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
									в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»
								</div>

								<div className="a4-meta-row">
									<div>{cl.city || "г. Москва"}</div>
									<div>«{contractDate}» г.</div>
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
									2.2. Ведение медицинской документации, учётных форм (медицинской карты амбулаторного пациента), передача обязательных сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ Минздрава РФ) в соответствии с Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ).
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
								<span>Лист 1 из 1</span>
							</div>
						</section>
					</div>
    );
};
