/**
 * paidContract/contractHtmlRequisites.ts
 * Requisites table and signature blocks renderer (Mandate 8b <= 120 lines)
 */

import { escapeHtml, sanitizeImageDataUrl } from "@dental/shared";
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

	const safeTouchImg = contract.touchSignatureBase64
		? sanitizeImageDataUrl(contract.touchSignatureBase64)
		: "";

	const signatureStamp = isPep
		? `<div class="pep-stamp">
          <strong>ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><br>
          Телефон: <strong>${escapeHtml(smsDetails?.phone)}</strong> · Код: <strong>ВЕРИФИЦИРОВАН</strong><br>
          Дата: ${escapeHtml(new Date(smsDetails?.verifiedAt || Date.now()).toLocaleString("ru-RU"))}
        </div>`
		: contract.signMethod === "paper" || (contract.signMethod as string) === "manual"
			? `<div class="sign-underline"></div>
        <div class="paper-sign-stamp">Договор составлен на бумажном носителе. Личная подпись пациента подшита в медицинскую карту.</div>`
			: safeTouchImg
				? `<div class="touch-sign-preview"><img src="${safeTouchImg}" alt="Подпись" style="max-height:48px;" /></div>`
				: `<div class="sign-underline"></div>`;

	const patientPassport =
		pt.passportSeries && pt.passportNumber
			? `${escapeHtml(pt.passportSeries)} ${escapeHtml(pt.passportNumber)}`
			: "серия _____ № __________";

	return `<div class="requisites-grid">
    <div class="req-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${escapeHtml(cl.fullName)}</strong><br>
      Юр. адрес: ${escapeHtml(cl.legalAddress)}<br>
      ИНН/КПП: ${escapeHtml(cl.inn)} / ${escapeHtml(cl.kpp) || "—"}<br>
      ОГРН: ${escapeHtml(cl.ogrn)}<br>
      Р/с: ${escapeHtml(cl.checkingAccount || cl.bankAccount) || "—"}<br>
      Банк: ${escapeHtml(cl.bankName)}<br>
      БИК: ${escapeHtml(cl.bik)} · К/с: ${escapeHtml(cl.correspondentAccount)}<br>
      Тел: ${escapeHtml(cl.phone)} · E-mail: ${escapeHtml(cl.email)}<br>
      <div class="sign-block">
        ${escapeHtml(cl.directorTitle) || "Руководитель"}:<br>
        <div class="sign-underline"></div>
        / ${escapeHtml(cl.directorFullName) || "________________________"} /<br>
        М.П. / ЭЦП
      </div>
    </div>
    <div class="req-col">
      <strong>ПАЦИЕНТ:</strong><br>
      <strong>${escapeHtml(pt.fullName)}</strong><br>
      Паспорт: ${patientPassport}<br>
      Выдан: ${escapeHtml(pt.passportIssuedBy) || "___________________________________"}, ${escapeHtml(pt.passportIssuedDate) || "«___» _______ 20__ г."}<br>
      Адрес: ${escapeHtml(pt.registrationAddress) || "____________________________________________"}<br>
      СНИЛС: ${escapeHtml(pt.snils) || "—"}<br>
      Тел: ${escapeHtml(pt.phone) || "—"}<br>
      <div class="sign-block">
        Подпись Пациента:<br>
        ${signatureStamp}
      </div>
    </div>
    ${
			rep?.hasRepresentative
				? `<div class="req-col">
        <strong>ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ:</strong><br>
        <strong>${escapeHtml(rep.fullName) || "___________________________________"}</strong><br>
        Основание: ${escapeHtml(rep.basisDocument) || "Свидетельство о рождении"}<br>
        Паспорт: ${rep.passportSeries && rep.passportNumber ? `${escapeHtml(rep.passportSeries)} ${escapeHtml(rep.passportNumber)}` : "серия _____ № __________"}<br>
        Выдан: ${escapeHtml(rep.passportIssuedBy) || "___________________________________"}, ${escapeHtml(rep.passportIssuedDate) || "«___» _______ 20__ г."}<br>
        Адрес: ____________________________________________<br>
        Тел: ${escapeHtml(rep.phone) || "—"}<br>
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
        <strong>${escapeHtml(cust.fullName)}</strong><br>
        Паспорт: ${cust.passportSeries && cust.passportNumber ? `${escapeHtml(cust.passportSeries)} ${escapeHtml(cust.passportNumber)}` : "серия _____ № __________"}<br>
        Выдан: ${escapeHtml(cust.passportIssuedBy) || "___________________________________"}, ${escapeHtml(cust.passportIssuedDate) || "«___» _______ 20__ г."}<br>
        Адрес: ${escapeHtml(cust.registrationAddress) || "____________________________________________"}<br>
        Тел: ${escapeHtml(cust.phone) || "—"}<br>
        <div class="sign-block">
          Подпись Заказчика (Плательщика):<br>
          <div class="sign-underline"></div>
        </div>
      </div>`
				: ""
		}
  </div>`;
}
