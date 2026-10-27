import { type GeneratedDocument } from "@dental/shared";
import { present, row } from "../baseRenderUtils.js";
import { checkList, signatureBlock } from "../signatureRenderUtils.js";
import { consentFlag } from "./minorRepresentativeConsentTemplate.js";

export function photoVideoConsent(document: GeneratedDocument): string {
	const payload = document.payload?.photoVideoConsent;
	if (payload) {
		const materialLabels: Record<string, string> = {
			intraoral_photo: "внутриротовые фото",
			face_photo: "фото лица",
			video: "видео",
			xray: "рентген-снимки",
			cbct: "КЛКТ/КТ",
			scan: "цифровые сканы",
			other: "иные материалы",
		};
		return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
      <div class="notice">
        Согласие разделяет медицинское использование, передачу подрядчикам, обучение и публикацию. Публикация узнаваемых материалов не считается разрешенной по умолчанию.
      </div>
      <table>
        ${row("Материалы", payload.materials.map((material) => materialLabels[material] ?? material).join(", "))}
        ${row("Медицинская карта и контроль лечения", payload.clinicalRecordUse ? "да, обязательно для медицинской документации" : "нет")}
        ${row("Передача зуботехнической лаборатории", consentFlag(payload.labTransferAllowed))}
        ${row("Консультация коллег / консилиум", consentFlag(payload.colleagueConsultationAllowed))}
        ${row("Обучение и профессиональные разборы", consentFlag(payload.educationUseAllowed))}
        ${row("Маркетинг клиники", consentFlag(payload.marketingUseAllowed))}
        ${row("Узнаваемая публикация лица/улыбки", consentFlag(payload.recognizablePublicationAllowed))}
        ${row("Обезличивание", payload.anonymizationRequired ? "обязательно; ФИО, телефон и лишние признаки не публиковать" : "не подтверждено")}
        ${row("Порядок отзыва", payload.revocationChannel)}
        ${present(payload.scopeNotes) ? row("Ограничения пациента", present(payload.scopeNotes) ?? "") : ""}
      </table>
      ${checkList([
				"использовать материалы только в отмеченных целях",
				"для маркетинга и узнаваемой публикации нужна отдельная явная отметка пациента",
				"после отзыва прекратить новые публикации и зафиксировать дату отзыва в карте/CRM",
				"рентген, КТ и сканы остаются частью медицинской документации и не удаляются из карты без законного основания",
			])}
      ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
	}

	return `<h2>Согласие на фото-, видео- и рентген-материалы</h2>
    <p>Стоматологические фото, видео, сканы и рентген-материалы используются для диагностики, планирования, контроля качества и ведения медицинской документации.</p>
    <table>
      ${row("Разрешенное использование", "медицинская карта / консультация коллег / лаборатория / обучение / маркетинг")}
      ${row("Маркетинг", "только при отдельной явной отметке пациента")}
      ${row("Обезличивание", "лицо, ФИО и контакты не публиковать без отдельного разрешения")}
      ${row("Отзыв согласия", "пациент может отозвать согласие в порядке, указанном клиникой")}
    </table>
    ${checkList([
			"отдельно отметить, разрешено ли использовать материалы вне медицинской карты",
			"проверить, что передача лаборатории/консилиуму соответствует согласию на ПДн",
			"не публиковать до/после с узнаваемым лицом без отдельной письменной отметки",
			"рентген/КТ остаются частью медицинской документации и не должны удаляться из карты без законного основания",
		])}
    ${signatureBlock("Пациент/законный представитель", "Представитель клиники")}`;
}
