/**
 * paidContract/contractHtmlRequisites.ts
 * Requisites table and signature blocks renderer (Mandate 8b <= 120 lines)
 */

import type { PaidContractData } from "./contractDataTypes";

export function renderContractRequisites(contract: PaidContractData): string {
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;
	const rep = contract.representative;

	const smsDetails = contract.pepSmsDetails || contract.smsSignDetails;
	const isPep =
		(contract.signMethod === "pep_sms" || (contract.signMethod as string) === "sms_otp") &&
		smsDetails?.isVerified;

	const signatureStamp = isPep
		? `<div class="pep-stamp">
          <strong>ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><br>
          Телефон: <strong>${smsDetails?.phone}</strong> · Код: <strong>ВЕРИФИЦИРОВАН</strong><br>
          Дата: ${new Date(smsDetails?.verifiedAt || Date.now()).toLocaleString("ru-RU")}
        </div>`
		: contract.signMethod === "paper" || (contract.signMethod as string) === "manual"
			? `<div class="sign-underline"></div>
        <div class="paper-sign-stamp">Договор составлен на бумажном носителе. Личная подпись пациента подшита в медицинскую карту.</div>`
			: contract.touchSignatureBase64
				? `<div class="touch-sign-preview"><img src="${contract.touchSignatureBase64}" alt="Подпись" style="max-height:48px;" /></div>`
				: `<div class="sign-underline"></div>`;

	const patientPassport =
		pt.passportSeries && pt.passportNumber
			? `${pt.passportSeries} ${pt.passportNumber}`
			: "серия _____ № __________";

	return `<div class="requisites-grid">
    <div class="req-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${cl.fullName}</strong><br>
      Юр. адрес: ${cl.legalAddress}<br>
      ИНН/КПП: ${cl.inn} / ${cl.kpp || "—"}<br>
      ОГРН: ${cl.ogrn}<br>
      Р/с: ${cl.checkingAccount || cl.bankAccount || "—"}<br>
      Банк: ${cl.bankName}<br>
      БИК: ${cl.bik} · К/с: ${cl.correspondentAccount}<br>
      Тел: ${cl.phone} · E-mail: ${cl.email}<br>
      <div class="sign-block">
        Подпись Исполнителя:<br>
        <div class="sign-underline"></div>
        М.П. / ЭЦП
      </div>
    </div>
    <div class="req-col">
      <strong>ПАЦИЕНТ:</strong><br>
      <strong>${pt.fullName}</strong><br>
      Паспорт: ${patientPassport}<br>
      Выдан: ${pt.passportIssuedBy || "___________________________________"}, ${pt.passportIssuedDate || "«___» _______ 20__ г."}<br>
      Адрес: ${pt.registrationAddress || "____________________________________________"}<br>
      СНИЛС: ${pt.snils || "—"}<br>
      Тел: ${pt.phone || "—"}<br>
      <div class="sign-block">
        Подпись Пациента:<br>
        ${signatureStamp}
      </div>
    </div>
    ${
			rep?.hasRepresentative
				? `<div class="req-col">
        <strong>ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ:</strong><br>
        <strong>${rep.fullName || "___________________________________"}</strong><br>
        Основание: ${rep.basisDocument || "Свидетельство о рождении"}<br>
        Паспорт: ${rep.passportSeries && rep.passportNumber ? `${rep.passportSeries} ${rep.passportNumber}` : "серия _____ № __________"}<br>
        Выдан: ${rep.passportIssuedBy || "___________________________________"}, ${rep.passportIssuedDate || "«___» _______ 20__ г."}<br>
        Адрес: ____________________________________________<br>
        Тел: ${rep.phone || "—"}<br>
        <div class="sign-block">
          Подпись Законного представителя:<br>
          <div class="sign-underline"></div>
        </div>
      </div>`
				: ""
		}
    ${
			contract.customer.isDifferentFromPatient
				? `<div class="req-col">
        <strong>ЗАКАЗЧИК (ПЛАТЕЛЬЩИК):</strong><br>
        <strong>${cust.fullName}</strong><br>
        Паспорт: ${cust.passportSeries && cust.passportNumber ? `${cust.passportSeries} ${cust.passportNumber}` : "серия _____ № __________"}<br>
        Выдан: ${cust.passportIssuedBy || "___________________________________"}, ${cust.passportIssuedDate || "«___» _______ 20__ г."}<br>
        Адрес: ${cust.registrationAddress || "____________________________________________"}<br>
        Тел: ${cust.phone || "—"}<br>
        <div class="sign-block">
          Подпись Заказчика (Плательщика):<br>
          <div class="sign-underline"></div>
        </div>
      </div>`
				: ""
		}
  </div>`;
}
