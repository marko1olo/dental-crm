import {
	type ClinicProfile,
	type DocumentKind,
	type GeneratedDocument,
	type MedicalRecordCopyRequestPayload,
	type MedicalRecordExtractPayload,
	type Patient,
	type VisitAttendanceCertificatePayload,
	type WarrantyServiceMemoPayload,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	compactParts,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	patientInsurancePolicyNumber,
	patientSnils,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	documentRecipientLine,
	representativeIdentityLine,
	clinicalToothRowsTable,
	issuedDate,
	rub,
	row,
	cell,
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";

export function medicalRecordExtract(document: GeneratedDocument, patient: Patient) {
	const payload = document.payload?.medicalRecordExtract as
		| MedicalRecordExtractPayload
		| undefined;
	if (!payload) {
		return `<h2>Выписка из медицинской карты</h2>
      <p>Документ ожидает структурированные данные из подписанной медицинской записи: период, источники, жалобы, анамнез, статус, диагноз, лечение, рекомендации, врач и получатель.</p>
      ${signatureBlock("Пациент/получатель", "Врач/уполномоченное лицо")}`;
	}
	return `<h2>Выписка из медицинской карты</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Период обращения", `с ${payload.periodStart} по ${payload.periodEnd}`)}
      ${row("Источник сведений", payload.sourceVisitIds.join(", "))}
      ${row("Жалобы и анамнез", payload.complaintAndAnamnesis)}
      ${row("Объективный статус", payload.objectiveStatus)}
      ${row("Диагноз", payload.diagnosis)}
      ${row("Проведенное лечение", payload.treatmentProvided)}
      ${row("Рекомендации", payload.recommendations)}
      ${row("Получатель", payload.recipientFullName)}
      ${row("Основание выдачи", payload.recipientAuthority)}
      ${row("Врач", payload.doctorFullName)}
      ${row("Дата выписки", payload.issuedAt)}
    </table>
    <h2>Клиническая детализация по зубам и сегментам</h2>
    ${clinicalToothRowsTable(payload.clinicalToothRows)}
    ${checkList([
			"выписка сформирована только из подписанных медицинских записей",
			"диагноз и рекомендации проверены врачом перед выдачей",
			"лишние сведения о третьих лицах исключены из текста выписки",
			"основание выдачи и получатель проверены администратором клиники",
		])}
    <p class="small">Выписка отражает сведения медицинской документации за указанный период. Диктовка, черновики и AI-подсказки не являются источником финального диагноза.</p>
    ${signatureBlock(signatureParty("Пациент/получатель", payload.recipientFullName), signatureParty("Врач/уполномоченное лицо", payload.doctorFullName))}`;
}

export function structuredMedicalRecordCopyRequest(
	document: GeneratedDocument,
	patient: Patient,
) {
	const payload = document.payload?.medicalRecordCopyRequest as
		| MedicalRecordCopyRequestPayload
		| undefined;
	if (!payload) {
		return `<h2>Запрос на копии медицинской документации</h2>
      <p class="placeholder-warning">Документ ожидает структурированные данные запроса: состав, период, формат, получателя, полномочия, контакт выдачи и проверку лишних данных третьих лиц.</p>`;
	}

	const formatLabels: Record<
		MedicalRecordCopyRequestPayload["requestedFormat"],
		string
	> = {
		paper: "бумажная копия",
		pdf: "PDF",
		dicom_archive: "архив исходных снимков",
		secure_link: "защищенная ссылка",
		physical_media: "физический носитель",
		other: "иной согласованный формат",
	};
	const period =
		payload.periodStart || payload.periodEnd
			? `с ${payload.periodStart || "начала хранения"} по ${payload.periodEnd || "дату запроса"}`
			: "весь доступный период по запросу";

	return `<h2>Запрос на копии медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента в карте", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Запрошенные документы", payload.requestedDocumentTypes.join("; "))}
      ${row("Период", period)}
      ${row("Формат выдачи", formatLabels[payload.requestedFormat])}
      ${row("Получатель", payload.recipientFullName)}
      ${row("Документ получателя", payload.recipientIdentityDocument)}
      ${row("Основание полномочий", payload.recipientAuthority)}
      ${payload.representativeAuthorityDocument ? row("Документ представителя", payload.representativeAuthorityDocument) : ""}
      ${row("Дата запроса", payload.requestedAt)}
      ${row("Контакт и канал выдачи", payload.contactForDelivery)}
      ${payload.specialInstructions ? row("Особые указания", payload.specialInstructions) : ""}
      ${row("Исходные файлы снимков", payload.includeDicomSourceData ? "запрошены при наличии в архиве" : "не запрошены")}
    </table>
    ${checkList([
			"личность получателя проверена до выдачи",
			"объем выдачи соответствует запросу и не содержит лишних данных третьих лиц",
			"КТ и рентген выдаются как исходные медицинские файлы, а не как скриншоты, если пациент запросил исходные данные",
			"факт выдачи нужно закрыть распиской о передаче медицинских документов",
		])}
    ${signatureBlock(signatureParty("Заявитель/получатель", payload.recipientFullName), "Ответственный сотрудник")}`;
}

export function _medicalRecordCopyRequest(patient: Patient) {
	return `<h2>Запрос на копии медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
      ${row("Что выдать", "выписка / копия карты / снимки / КТ / финансовые документы / иное")}
      ${row("Период", "с __________ по __________")}
      ${row("Формат", "бумага / PDF / архив исходных снимков / защищенная ссылка при наличии процесса")}
      ${row("Получатель", documentRecipientLine(patient))}
      ${row("Основание представителя", representativeIdentityLine(patient))}
    </table>
    ${checkList([
			"личность получателя проверена",
			"объем выдачи согласован с врачом/администратором и не содержит лишних данных третьих лиц",
			"КТ и рентген выдаются как исходные медицинские файлы, а не как скриншоты, если пациент запросил исходные данные",
			"факт выдачи и канал передачи записаны в журнале клиники",
		])}
    ${signatureBlock("Заявитель/получатель", "Ответственный сотрудник")}`;
}

export function medicalDocumentReleaseReceipt(
	document: GeneratedDocument,
	patient: Patient,
) {
	const payload = document.payload?.medicalDocumentReleaseReceipt;
	if (payload) {
		const releaseChannelLabels: Record<string, string> = {
			paper: "бумажная выдача",
			pdf: "PDF",
			dicom_archive: "архив исходных снимков",
			secure_link: "защищенная ссылка",
			physical_media: "физический носитель",
			other: "иной канал",
		};
		const period = compactParts([
			present(payload.periodStart) ? `с ${present(payload.periodStart)}` : null,
			present(payload.periodEnd) ? `по ${present(payload.periodEnd)}` : null,
		]);
		return `<h2>Расписка о выдаче медицинской документации</h2>
      <p>Получатель подтверждает, что клиника передала только согласованный состав медицинских документов и проверила полномочия до выдачи.</p>
      <table>
        ${row("Получатель", payload.recipientFullName)}
        ${row("Основание выдачи в DENTE", `запрос на копии медицинской документации ${payload.sourceRequestDocumentId}`)}
        ${row("Документ получателя", payload.recipientIdentityDocument)}
        ${row("Основание полномочий", payload.recipientAuthority)}
        ${row("Канал выдачи", releaseChannelLabels[payload.releaseChannel] ?? payload.releaseChannel)}
        ${row("Состав выдачи", payload.documentTypes.join(", "))}
        ${period ? row("Период документов", period) : ""}
        ${row("Дата и время выдачи", payload.deliveredAt)}
        ${present(payload.accessExpiresAt) ? row("Доступ действует до", present(payload.accessExpiresAt) ?? "") : ""}
        ${row("Защита передачи", payload.deliveryProtectionNote)}
        ${row("Проверка данных третьих лиц", payload.thirdPartyDataChecked ? "лишние данные третьих лиц исключены" : "не подтверждено")}
      </table>
      ${checkList([
				"личность получателя и основание выдачи проверены",
				"состав выдачи совпадает с запросом пациента или законного представителя",
				"при передаче КТ/рентгена/снимков проверена целостность архива и носителя",
				"в журнале клиники сохранен факт выдачи, канал передачи и ответственный сотрудник",
			])}
      ${signatureBlock("Получатель", "Администратор/ответственный сотрудник")}`;
	}
	return `<h2>Расписка о выдаче медицинской документации</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Получатель", documentRecipientLine(patient))}
      ${row("Документ получателя", representativeIdentityLine(patient))}
      ${row("Канал выдачи", "лично / бумага / PDF / архив исходных снимков / защищенная ссылка / иной носитель")}
      ${row("Дата и время выдачи", "____.__.____ ____:____")}
    </table>
    <h2>Что выдано</h2>
    ${checkList([
			"выписка из медицинской карты",
			"копии медицинской документации за указанный период",
			"рентген/ОПТГ/ТРГ/КЛКТ: исходные файлы снимков или архив, если они запрошены",
			"финансовые документы: договор, акт, чек/квитанция, налоговая справка при наличии",
			"иное: ____________________",
		])}
    <h2>Контроль выдачи</h2>
    ${checkList([
			"личность получателя проверена до передачи",
			"лишние данные третьих лиц не включены",
			"факт выдачи записан в журнале/аудите клиники",
			"при электронной передаче указан срок действия ссылки или способ защиты архива",
		])}
    ${signatureBlock("Получатель", "Ответственный сотрудник")}`;
}

export function xrayCbctReferral(document: GeneratedDocument) {
	const payload = document.payload?.xrayCbctReferral;
	if (payload) {
		const studyTypeLabels: Record<string, string> = {
			rvg: "RVG / прицельный снимок",
			opg: "ОПТГ",
			cbct: "КЛКТ / КТ",
			trg: "ТРГ",
			tmj: "ВНЧС",
			sinus: "гайморова пазуха",
			photo_protocol: "фотопротокол",
			other: "иное исследование",
		};
		const priorityLabels: Record<string, string> = {
			routine: "планово",
			urgent: "срочно",
		};
		const pregnancyStatusLabels: Record<string, string> = {
			not_applicable: "не применимо",
			denied: "беременность со слов пациента отрицается",
			possible: "беременность возможна",
			confirmed: "беременность подтверждена",
			unknown: "статус не уточнен",
		};
		return `<h2>Направление на рентген/КЛКТ</h2>
      <div class="notice">
        Исследование назначено врачом с конкретной клинической задачей. Результат, описание и исходные файлы должны быть привязаны к медицинской карте пациента.
      </div>
      <h2>Клиническая привязка направления</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        ${row("Вид исследования", studyTypeLabels[payload.studyType] ?? payload.studyType)}
        ${row("Область", payload.area)}
        ${row("Клинический вопрос", payload.clinicalQuestion)}
        ${row("Показание", payload.indication)}
        ${row("Срочность", priorityLabels[payload.priority] ?? payload.priority)}
        ${row("Беременность/ограничения", pregnancyStatusLabels[payload.pregnancyStatus] ?? payload.pregnancyStatus)}
        ${row("Комментарий по ограничениям", payload.safetyNotes)}
        ${row("Куда направить", payload.recipientClinic ?? "по маршруту клиники")}
        ${row("Срок", payload.dueDate ?? "по записи пациента")}
        ${row("Назначил", payload.requestedBy)}
        ${row("Передача результата", [payload.includeRadiologistReport ? "описание врача-рентгенолога" : null, payload.includeDicomExport ? "исходные файлы снимков" : null].filter(Boolean).join(", ") || "снимок/отчет в карту пациента")}
      </table>
      ${checkList([
				"пациенту объяснена цель исследования и связь с планом лечения",
				"перед исследованием уточнены беременность, ограничения и необходимость защиты",
				"результат должен быть просмотрен врачом, назначившим исследование",
				"исходные файлы, снимки и описание сохраняются в карте пациента и журнале выдачи",
			])}
      ${signatureBlock("Пациент", "Врач")}`;
	}
	return `<h2>Направление на рентген/КЛКТ</h2>
    <table>
      ${row("Вид исследования", "RVG / ОПТГ / ТРГ / КЛКТ / фото-протокол")}
      ${row("Область", "зуб/сегмент/челюсть указать врачом")}
      ${row("Клиническая задача", "диагностика, эндодонтия, имплантация, ортодонтия, хирургия, контроль")}
      ${row("Беременность/ограничения", "уточнить перед исследованием")}
    </table>
    ${checkList([
			"пациенту объяснена цель исследования",
			"проверены противопоказания и необходимость защиты",
			"результат должен быть привязан к карте пациента и просмотрен врачом",
		])}
    ${signatureBlock("Пациент", "Врач")}`;
}

export function labWorkOrder(document: GeneratedDocument) {
	const payload = document.payload?.labWorkOrder;
	if (payload) {
		return `<h2>Зуботехнический заказ-наряд</h2>
      <h2>Клиническая привязка лабораторной работы</h2>
      ${clinicalToothRowsTable(payload.clinicalToothRows)}
      <table>
        ${row("Тип работы", payload.workType)}
        ${row("Зубы/область", payload.teethOrArea)}
        ${row("Материал", payload.material)}
        ${row("Цвет и форма", payload.shade)}
        ${row("Источник данных", payload.source)}
        ${row("Срок", payload.deadline)}
        ${row("Ориентировочная стоимость лабораторного этапа", rub(document.totalAmountRub))}
      </table>
      <h2>Технические требования</h2>
      <p>${escapeHtml(payload.technicianNotes ?? "Дополнительные требования не указаны.")}</p>
      ${checkList([
				"контактные пункты, окклюзия, края и требования к препарированию зафиксированы",
				"имплант-платформа, абатмент, тип фиксации и torque указаны, если применимо",
				"фото, карта цвета, сканы и комментарии врача приложены в карте пациента",
				"примерки, коррекции, дата готовности и ответственный техник отслеживаются",
			])}
      ${signatureBlock("Врач", "Лаборатория")}`;
	}
	return `<h2>Зуботехнический заказ-наряд</h2>
    <table>
      ${row("Тип работы", "коронка / вкладка / винир / мост / съемный протез / капа / элайнер / ретейнер / другое")}
      ${row("Зубы/область", "указать по FDI или сегментам")}
      ${row("Материал", "E.max / цирконий / металлокерамика / композит / PMMA / титан / другое")}
      ${row("Цвет и форма", "VITA shade, индивидуальная карта цвета, фото-протокол")}
      ${row("Основание", "скан / оттиск / прикусной регистрат / фото / КТ / файл STL/PLY/OBJ")}
      ${row("Ориентировочная стоимость лабораторного этапа", rub(document.totalAmountRub))}
    </table>
    <h2>Технические требования</h2>
    ${checkList([
			"указать контактные пункты, окклюзию, межзубные контакты и край препарирования",
			"для имплантов указать систему, платформу, абатмент, винтовую/цементную фиксацию и torque, если применимо",
			"для ортодонтии указать цель, этап, количество кап/ретейнеров и контрольную дату",
			"приложить фото улыбки, шкалу цвета, сканы и комментарии врача",
			"фиксировать примерки, коррекции, срок готовности и ответственного техника",
		])}
    ${signatureBlock("Врач", "Лаборатория")}`;
}

export function visitAttendanceCertificate(
	document: GeneratedDocument,
	patient: Patient,
) {
	const payload = document.payload?.visitAttendanceCertificate as
		| VisitAttendanceCertificatePayload
		| undefined;
	if (!payload) {
		return `<h2>Справка о посещении врача-стоматолога</h2>
      <p>Документ ожидает структурированные данные о фактическом времени посещения, цели выдачи и подписанте.</p>
      ${signatureBlock("Пациент/получатель", "Врач/администратор")}`;
	}
	return `<h2>Справка о посещении врача-стоматолога</h2>
    <p>Пациент находился на стоматологическом приеме в медицинской организации. Справка подтверждает только факт посещения и не раскрывает диагноз, план лечения или стоимость без отдельного законного основания.</p>
    <table>
      ${row("Пациент", patient.fullName)}
      ${patient.birthDate ? row("Дата рождения", patient.birthDate) : ""}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${row("Время посещения", `${payload.attendedAtStart} - ${payload.attendedAtEnd}`)}
      ${row("Цель выдачи", payload.purpose)}
      ${present(payload.recipientOrganization) ? row("Куда предъявляется", present(payload.recipientOrganization) ?? "") : ""}
      ${row("Дата выдачи", payload.issuedAt)}
      ${row("Подписант", `${payload.signedByFullName}, ${payload.signedByRole}`)}
      ${row("Ограничение", "не является листком нетрудоспособности и не заменяет медицинское заключение")}
    </table>
    ${checkList([
			"ФИО, дата рождения и документ пациента сверены",
			"указано фактическое время посещения клиники",
			"диагноз, план лечения, снимки и стоимость не раскрыты",
			"при необходимости клиника ставит печать по локальному порядку",
		])}
    ${signatureBlock("Пациент/получатель", signatureParty(payload.signedByRole, payload.signedByFullName))}`;
}

export function warrantyServiceMemo(document: GeneratedDocument) {
	const payload = document.payload?.warrantyServiceMemo as
		| WarrantyServiceMemoPayload
		| undefined;
	if (payload) {
		return `<h2>Гарантийная памятка по стоматологической работе</h2>
      <div class="notice">
        Памятка фиксирует условия контроля после лечения и границы ответственности клиники по конкретной работе.
        Сроки и условия применяются вместе с договором, актом, медицинскими показаниями и локальным положением клиники.
      </div>
      <table>
        ${row("Работа/услуга", payload.serviceOrWorkName)}
        ${row("Дата завершения", payload.completedAt)}
        ${row("Зубы/область", payload.teethOrArea)}
        ${row("Материалы/системы", payload.materialsOrSystems)}
        ${row("Гарантийный срок/условия", payload.warrantyPeriod)}
        ${row("Контрольные визиты", payload.controlVisitSchedule)}
        ${row("Связанный акт или договор", payload.linkedActOrContract)}
        ${row("Врач", payload.doctorFullName)}
        ${row("Выдано", payload.issuedAt)}
      </table>
      <h2>Что должен соблюдать пациент</h2>
      ${bulletList(payload.patientObligations)}
      <h2>Что требует отдельной оценки</h2>
      ${bulletList(payload.excludedRiskFactors)}
      <h2>Когда связаться с клиникой срочно</h2>
      ${bulletList(payload.urgentContactReasons)}
      ${checkList([
				"условия сверены с локальным гарантийным положением клиники",
				"пациент получил послеоперационные или поствизитные рекомендации",
				"пациент понимает обязательность контрольных визитов и гигиены",
			])}
      ${signatureBlock("Пациент", signatureParty("Врач", payload.doctorFullName))}`;
	}
	return `<h2>Гарантийная памятка по стоматологической работе</h2>
    <p>Памятка фиксирует условия контроля после лечения и границы ответственности клиники. Конкретные сроки гарантии должны соответствовать локальным правилам клиники, договору и виду работы.</p>
    <table>
      ${row("Работа/услуга", "указать вид лечения, зубы/область, материалы и дату завершения")}
      ${row("Контрольные визиты", "плановые осмотры, профессиональная гигиена, коррекции, снимки по показаниям")}
      ${row("Что сохраняет гарантию", "соблюдение рекомендаций врача, контрольные визиты, гигиена, отсутствие самостоятельных вмешательств")}
      ${row("Что требует отдельной оценки", "травма, бруксизм, перегрузка, новые заболевания, отказ от рекомендованного лечения, нарушение графика контроля")}
    </table>
    ${checkList([
			"вписать точные сроки и условия по локальному положению клиники",
			"отметить материалы, конструкцию, зубы или имплант-систему",
			"объяснить пациенту контрольные визиты и признаки срочного обращения",
			"выдать памятку вместе с актом или финальным этапом лечения",
		])}
    ${signatureBlock()}`;
}


export function patientIntakeQuestionnaire(document: GeneratedDocument) {
	const payload = document.payload?.patientIntakeQuestionnaire;
	if (payload) {
		const pregnancyStatusLabels: Record<string, string> = {
			not_applicable: "не применимо",
			denied: "беременность/лактация со слов пациента отрицается",
			possible: "беременность возможна",
			confirmed: "беременность подтверждена",
			lactation: "лактация",
			unknown: "статус не уточнен",
		};
		return `<h2>Анкета пациента</h2>
      <div class="notice">
        Анкета фиксирует сведения, сообщенные пациентом до приема. Врач использует ее как входные данные для осмотра, но не заменяет ею медицинскую запись и диагноз.
      </div>
      <table>
        ${row("Основная жалоба или цель визита", payload.chiefComplaint)}
        ${row("Аллергии и нежелательные реакции", payload.allergyStatus)}
        ${row("Постоянные препараты", payload.currentMedications)}
        ${row("Хронические заболевания", payload.chronicConditions)}
        ${row("Беременность/лактация", pregnancyStatusLabels[payload.pregnancyStatus] ?? payload.pregnancyStatus)}
        ${row("Антикоагулянты и препараты, влияющие на кровотечение", payload.anticoagulants)}
        ${row("Инфекционные риски", payload.infectiousRiskNotes)}
        ${row("Сердечно-сосудистые, эндокринные и иные риски", payload.cardioEndocrineNotes)}
        ${present(payload.emergencyContact) ? row("Экстренный контакт", present(payload.emergencyContact) ?? "") : ""}
        ${present(payload.additionalNotes) ? row("Дополнительные сведения", present(payload.additionalNotes) ?? "") : ""}
        ${row("Подтверждение пациента", payload.accuracyConfirmed ? "пациент подтверждает достоверность сведений и обязуется сообщать об изменениях" : "не подтверждено")}
      </table>
      ${checkList([
				"администратор сверил ФИО, телефон и дату рождения пациента",
				"врач просмотрел аллергоанамнез, лекарства, хронические заболевания и риски кровотечения до вмешательства",
				"при неясном статусе беременности или системных рисках врач выбирает безопасную тактику или откладывает вмешательство",
				"изменения анкеты сохраняются в карте пациента и учитываются в последующих визитах",
			])}
      ${signatureBlock("Пациент/законный представитель", "Администратор/врач")}`;
	}
	return `<h2>Анкета пациента</h2>
    <table>
      ${row("Основная жалоба или цель визита", "заполнить со слов пациента")}
      ${row("Аллергии и нежелательные реакции", "заполнить")}
      ${row("Постоянные препараты", "заполнить")}
      ${row("Хронические заболевания", "заполнить")}
      ${row("Беременность/лактация", "уточнить до приема")}
      ${row("Антикоагулянты", "заполнить")}
    </table>
    <p>Пациент подтверждает достоверность сообщенных сведений и обязуется сообщать об изменениях.</p>
    ${signatureBlock("Пациент/законный представитель", "Администратор")}`;
}
