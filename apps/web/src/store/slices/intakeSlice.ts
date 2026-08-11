export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
import { loadUiPreferences } from "../../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const _initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createIntakeAndConsentSlice = (set: any) => ({
	intakeChiefComplaint: "",
	setIntakeChiefComplaint: createSetter(set, "intakeChiefComplaint"),
	/*
	 * Анамнез начинается пустым.
	 *
	 * Здесь лежали готовые фразы «со слов пациента не отмечены», «не принимает»,
	 * «отрицает». Врач мог ни разу не открыть анкету, а документ уходил на
	 * подпись с отрицательным аллергоанамнезом, которого никто не собирал.
	 * Подписанная анкета — доказательство, что пациента опросили; заранее
	 * вписанное отрицание превращает её в подделку, а при настоящей аллергии —
	 * в прямую угрозу.
	 *
	 * Формулировки никуда не делись: их вставляет кнопка «Со слов пациента —
	 * нет» в components/documents/AnamnesisField.tsx. Разница в том, что теперь
	 * их вписывает врач, а не хранилище за него.
	 */
	intakeAllergyStatus: "",
	setIntakeAllergyStatus: createSetter(set, "intakeAllergyStatus"),
	intakeCurrentMedications: "",
	setIntakeCurrentMedications: createSetter(set, "intakeCurrentMedications"),
	intakeChronicConditions: "",
	setIntakeChronicConditions: createSetter(set, "intakeChronicConditions"),
	intakePregnancyStatus: "unknown",
	setIntakePregnancyStatus: createSetter(set, "intakePregnancyStatus"),
	intakeAnticoagulants: "",
	setIntakeAnticoagulants: createSetter(set, "intakeAnticoagulants"),
	intakeInfectiousRiskNotes: "",
	setIntakeInfectiousRiskNotes: createSetter(set, "intakeInfectiousRiskNotes"),
	/*
	 * Системные риски начинаются пустыми — как аллергии и препараты выше.
	 *
	 * Это была единственная непустая графа здоровья во всём блоке: «Сердечно-
	 * сосудистые, эндокринные и иные системные риски требуют уточнения врачом
	 * перед вмешательством». В анкете она печаталась в строке «Сердце, давление,
	 * диабет и системные риски», то есть в графе ОТВЕТА пациента, хотя это
	 * заметка врача самому себе, а не то, что человек рассказал.
	 *
	 * Хуже, что непустое умолчание обезврежило предохранитель: проверка
	 * requiredDocumentField(intakeCardioEndocrineNotes, "анкета, системные
	 * риски") в documentValidators.ts не могла сработать никогда, и анкета уходила
	 * на подпись с незаполненной графой о сердце и диабете. Теперь пусто, и
	 * создание документа требует ответа.
	 *
	 * Долг (чужой файл): у поля в DocumentsView.tsx нет ни подсказки в пустом
	 * поле, ни кнопки «Со слов пациента — нет», которые есть у соседей через
	 * AnamnesisField. Пустая графа без подсказки — шаг назад по понятности.
	 */
	intakeCardioEndocrineNotes: "",
	setIntakeCardioEndocrineNotes: createSetter(
		set,
		"intakeCardioEndocrineNotes",
	),
	intakeEmergencyContact: "",
	setIntakeEmergencyContact: createSetter(set, "intakeEmergencyContact"),
	intakeAdditionalNotes: "",
	setIntakeAdditionalNotes: createSetter(set, "intakeAdditionalNotes"),
	intakeAccuracyConfirmed: false,
	setIntakeAccuracyConfirmed: createSetter(set, "intakeAccuracyConfirmed"),
	/*
	 * Название вмешательства пустое.
	 *
	 * Стояло «Стоматологическое вмешательство по согласованному плану» — то есть
	 * согласие получено на всё сразу. Смысл информированного согласия в том, что
	 * названо конкретное вмешательство; общая формулировка обнуляет документ,
	 * при этом выглядит заполненной. Подсказка в пустом поле осталась.
	 */
	informedConsentIntervention: "",
	setInformedConsentIntervention: createSetter(
		set,
		"informedConsentIntervention",
	),
	informedConsentToothOrArea: "",
	setInformedConsentToothOrArea: createSetter(
		set,
		"informedConsentToothOrArea",
	),
	informedConsentDiagnosisOrIndication: "",
	setInformedConsentDiagnosisOrIndication: createSetter(
		set,
		"informedConsentDiagnosisOrIndication",
	),
	informedConsentExpectedBenefit:
		"снижение боли, восстановление функции, профилактика осложнений и сохранение стоматологического здоровья",
	setInformedConsentExpectedBenefit: createSetter(
		set,
		"informedConsentExpectedBenefit",
	),
	informedConsentAnesthesia: "местная анестезия по показаниям",
	setInformedConsentAnesthesia: createSetter(set, "informedConsentAnesthesia"),
	informedConsentMaterialNotes: "",
	setInformedConsentMaterialNotes: createSetter(
		set,
		"informedConsentMaterialNotes",
	),
	/*
	 * Кому можно сообщать сведения — выбор пациента, а не наш.
	 *
	 * Стояло «не разрешаю сообщать медицинские сведения третьим лицам». Пациент,
	 * который как раз хотел вписать жену или взрослого сына, подписывал запрет,
	 * о котором его не спрашивали, — а клиника потом не имела права ответить на
	 * звонок родственника.
	 */
	informedConsentTrustedContact: "",
	setInformedConsentTrustedContact: createSetter(
		set,
		"informedConsentTrustedContact",
	),
	informedConsentRisks:
		"боль, отек, кровотечение или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного приема или изменения плана лечения\nограниченный прогноз при исходном состоянии зубов и тканей",
	setInformedConsentRisks: createSetter(set, "informedConsentRisks"),
	informedConsentAlternatives:
		"отложить вмешательство и наблюдать состояние\nполучить второе мнение\nвыбрать альтернативный метод лечения при наличии показаний\nотказаться от вмешательства с фиксацией возможных последствий",
	setInformedConsentAlternatives: createSetter(
		set,
		"informedConsentAlternatives",
	),
	informedConsentAftercare:
		"соблюдать рекомендации врача и режим приема препаратов\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при нарастающей боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
	setInformedConsentAftercare: createSetter(set, "informedConsentAftercare"),
	informedConsentDoctorFullName: "",
	setInformedConsentDoctorFullName: createSetter(
		set,
		"informedConsentDoctorFullName",
	),
	informedConsentConfirmedAt: "",
	setInformedConsentConfirmedAt: createSetter(
		set,
		"informedConsentConfirmedAt",
	),
	informedConsentQuestionsAnswered: false,
	setInformedConsentQuestionsAnswered: createSetter(
		set,
		"informedConsentQuestionsAnswered",
	),
	informedConsentRisksUnderstood: false,
	setInformedConsentRisksUnderstood: createSetter(
		set,
		"informedConsentRisksUnderstood",
	),
	informedConsentWithdrawUnderstood: false,
	setInformedConsentWithdrawUnderstood: createSetter(
		set,
		"informedConsentWithdrawUnderstood",
	),
	procedureConsentProcedureType:
		initialUiPreferences.procedureConsentProcedureType,
	setProcedureConsentProcedureType: createSetter(
		set,
		"procedureConsentProcedureType",
	),
	/* Пустое по той же причине, что informedConsentIntervention выше. */
	procedureConsentProcedureName: "",
	setProcedureConsentProcedureName: createSetter(
		set,
		"procedureConsentProcedureName",
	),
	procedureConsentToothOrArea: "",
	setProcedureConsentToothOrArea: createSetter(
		set,
		"procedureConsentToothOrArea",
	),
	procedureConsentDiagnosisOrIndication: "",
	setProcedureConsentDiagnosisOrIndication: createSetter(
		set,
		"procedureConsentDiagnosisOrIndication",
	),
	procedureConsentAnesthesia: "местная анестезия по показаниям",
	setProcedureConsentAnesthesia: createSetter(
		set,
		"procedureConsentAnesthesia",
	),
	procedureConsentMaterials: "",
	setProcedureConsentMaterials: createSetter(set, "procedureConsentMaterials"),
	/*
	 * Факторы риска пациента — пусто.
	 *
	 * Стояло «аллергии, постоянные препараты и хронические заболевания уточнены
	 * перед процедурой». Это не список рисков, а утверждение, что опрос
	 * проведён. Документ подтверждал сам себя.
	 */
	procedureConsentPatientRiskFactors: "",
	setProcedureConsentPatientRiskFactors: createSetter(
		set,
		"procedureConsentPatientRiskFactors",
	),
	procedureConsentSpecificRisks:
		"боль, отек, кровоточивость или временный дискомфорт\nнеобходимость повторного приема, коррекции или изменения плана\nаллергическая реакция на препараты или материалы",
	setProcedureConsentSpecificRisks: createSetter(
		set,
		"procedureConsentSpecificRisks",
	),
	procedureConsentAlternatives:
		"отложить процедуру и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от процедуры с фиксацией возможных последствий",
	setProcedureConsentAlternatives: createSetter(
		set,
		"procedureConsentAlternatives",
	),
	procedureConsentAftercare:
		"соблюдать рекомендации врача после процедуры\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
	setProcedureConsentAftercare: createSetter(set, "procedureConsentAftercare"),
	procedureConsentDoctorFullName: "",
	setProcedureConsentDoctorFullName: createSetter(
		set,
		"procedureConsentDoctorFullName",
	),
	procedureConsentConfirmedAt: "",
	setProcedureConsentConfirmedAt: createSetter(
		set,
		"procedureConsentConfirmedAt",
	),
	procedureConsentLocalFormAttached: false,
	setProcedureConsentLocalFormAttached: createSetter(
		set,
		"procedureConsentLocalFormAttached",
	),
	procedureConsentQuestionsAnswered: false,
	setProcedureConsentQuestionsAnswered: createSetter(
		set,
		"procedureConsentQuestionsAnswered",
	),
	procedureConsentExactProcedureConfirmed: false,
	setProcedureConsentExactProcedureConfirmed: createSetter(
		set,
		"procedureConsentExactProcedureConfirmed",
	),
	procedureConsentRisksUnderstood: false,
	setProcedureConsentRisksUnderstood: createSetter(
		set,
		"procedureConsentRisksUnderstood",
	),
	/*
	 * Ни одно разрешение в согласии на фото и видео не проставлено заранее.
	 *
	 * Две галочки из семи — «Можно передавать в зуботехническую лабораторию» и
	 * «Можно показывать коллегам для консультации» — открывались уже
	 * отмеченными, а остальные пять были пусты. Пациент подписывал согласие на
	 * передачу своих снимков в лабораторию и показ коллегам, о котором его не
	 * спрашивали, и по виду формы отличить его отметку от нашей невозможно.
	 * validatePhotoVideoConsent не требует ни одного разрешения, поэтому ничто
	 * не мешало выдать документ с чужим выбором.
	 *
	 * Разрешения остаются доступны в один клик: галочки на месте
	 * (components/documents/forms/PhotoVideoConsentForm.tsx), их ставит человек.
	 */
	photoVideoLabTransferAllowed: false,
	setPhotoVideoLabTransferAllowed: createSetter(
		set,
		"photoVideoLabTransferAllowed",
	),
	photoVideoColleagueConsultationAllowed: false,
	setPhotoVideoColleagueConsultationAllowed: createSetter(
		set,
		"photoVideoColleagueConsultationAllowed",
	),
	photoVideoEducationUseAllowed: false,
	setPhotoVideoEducationUseAllowed: createSetter(
		set,
		"photoVideoEducationUseAllowed",
	),
	photoVideoMarketingUseAllowed: false,
	setPhotoVideoMarketingUseAllowed: createSetter(
		set,
		"photoVideoMarketingUseAllowed",
	),
	photoVideoRecognizablePublicationAllowed: false,
	setPhotoVideoRecognizablePublicationAllowed: createSetter(
		set,
		"photoVideoRecognizablePublicationAllowed",
	),
	photoVideoClinicalRecordUseConfirmed: false,
	setPhotoVideoClinicalRecordUseConfirmed: createSetter(
		set,
		"photoVideoClinicalRecordUseConfirmed",
	),
	photoVideoAnonymizationConfirmed: false,
	setPhotoVideoAnonymizationConfirmed: createSetter(
		set,
		"photoVideoAnonymizationConfirmed",
	),
	/*
	 * Ни одна категория материалов не отмечена заранее.
	 *
	 * Стояли сразу три: внутриротовое фото, рентген и скан. Пациент подписывал
	 * согласие на съёмку и передачу материалов, которых ему не перечисляли, — а
	 * отметки выглядели так, будто он их проставил сам. Согласие на обработку
	 * изображений отзывается и оспаривается в первую очередь, и первым же
	 * вопросом будет, кто поставил галочки.
	 */
	photoVideoMaterials: [],
	setPhotoVideoMaterials: createSetter(set, "photoVideoMaterials"),
	photoVideoRevocationChannel:
		"письменное заявление в клинике или защищенное обращение через портал пациента",
	setPhotoVideoRevocationChannel: createSetter(
		set,
		"photoVideoRevocationChannel",
	),
	photoVideoScopeNotes: "",
	setPhotoVideoScopeNotes: createSetter(set, "photoVideoScopeNotes"),
	personalDataCrossBorderAllowed: false,
	setPersonalDataCrossBorderAllowed: createSetter(
		set,
		"personalDataCrossBorderAllowed",
	),
	personalDataAutomatedDecisionAllowed: false,
	setPersonalDataAutomatedDecisionAllowed: createSetter(
		set,
		"personalDataAutomatedDecisionAllowed",
	),
	personalDataConsentGivenAt: "",
	setPersonalDataConsentGivenAt: createSetter(
		set,
		"personalDataConsentGivenAt",
	),
	personalDataVoluntaryConsentConfirmed: false,
	setPersonalDataVoluntaryConsentConfirmed: createSetter(
		set,
		"personalDataVoluntaryConsentConfirmed",
	),
	personalDataMedicalProcessingAcknowledged: false,
	setPersonalDataMedicalProcessingAcknowledged: createSetter(
		set,
		"personalDataMedicalProcessingAcknowledged",
	),
	refusalIntervention: "",
	setRefusalIntervention: createSetter(set, "refusalIntervention"),
	refusalClinicalIndication: "",
	setRefusalClinicalIndication: createSetter(set, "refusalClinicalIndication"),
	refusalPatientReason: "",
	setRefusalPatientReason: createSetter(set, "refusalPatientReason"),
	refusalDoctorFullName: "",
	setRefusalDoctorFullName: createSetter(set, "refusalDoctorFullName"),
	refusalConfirmedAt: "",
	setRefusalConfirmedAt: createSetter(set, "refusalConfirmedAt"),
	refusalConsequencesUnderstood: false,
	setRefusalConsequencesUnderstood: createSetter(
		set,
		"refusalConsequencesUnderstood",
	),
	refusalSecondOpinionOffered: false,
	setRefusalSecondOpinionOffered: createSetter(
		set,
		"refusalSecondOpinionOffered",
	),
	refusalEmergencyCareExplained: false,
	setRefusalEmergencyCareExplained: createSetter(
		set,
		"refusalEmergencyCareExplained",
	),
	personalDataPurposes:
		"оказание стоматологической медицинской помощи\nведение медицинской карты и медицинской документации\nрасчеты, договоры, акты и налоговые документы\nуведомления о визитах, рекомендациях и готовности документов",
	setPersonalDataPurposes: createSetter(set, "personalDataPurposes"),
	personalDataCategories:
		"ФИО, дата рождения, телефон, email и адреса\nпаспортные данные, ИНН, СНИЛС, полис ОМС или ДМС\nсведения о здоровье, диагнозы, снимки, планы лечения и назначения\nплатежные документы, договоры, акты и налоговые заявления",
	setPersonalDataCategories: createSetter(set, "personalDataCategories"),
	personalDataActions:
		"сбор\nзапись\nсистематизация\nхранение\nуточнение\nиспользование\nпередача по законному основанию\nобезличивание\nудаление после окончания срока хранения",
	setPersonalDataActions: createSetter(set, "personalDataActions"),
	personalDataTransferRules:
		"Передача возможна только зуботехническим лабораториям, платежным и фискальным сервисам, страховым организациям, ИТ-подрядчикам с договором конфиденциальности, государственным органам по закону и пациентскому порталу по защищенному каналу.",
	setPersonalDataTransferRules: createSetter(set, "personalDataTransferRules"),
	personalDataRetentionPeriod:
		"в течение срока оказания помощи и обязательного срока хранения медицинской и бухгалтерской документации",
	setPersonalDataRetentionPeriod: createSetter(
		set,
		"personalDataRetentionPeriod",
	),
	personalDataRevocationChannel:
		"письменное заявление в клинике или защищенное обращение через портал пациента",
	setPersonalDataRevocationChannel: createSetter(
		set,
		"personalDataRevocationChannel",
	),
	refusalExplainedRisks:
		"усиление боли\nраспространение инфекции\nпотеря возможности сохранить зуб или ткани\nнеобходимость экстренного обращения при ухудшении",
	setRefusalExplainedRisks: createSetter(set, "refusalExplainedRisks"),
	refusalAlternatives:
		"повторная консультация\nобезболивание и контроль состояния\nвторое мнение профильного врача\nобращение в дежурную стоматологию при ухудшении",
	setRefusalAlternatives: createSetter(set, "refusalAlternatives"),
	refusalUrgentWarningSigns:
		"отек лица или шеи\nтемпература\nзатруднение глотания или дыхания\nкровотечение\nнарастающая боль",
	setRefusalUrgentWarningSigns: createSetter(set, "refusalUrgentWarningSigns"),
});

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
