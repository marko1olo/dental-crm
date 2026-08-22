/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY FORM 057/U-04 PRESETS & INTER-CLINIC ROUTING CATALOG
 * Приказ Минздравсоцразвития РФ от 22.11.2004 № 255 (Форма № 057/у-04)
 * Направление на госпитализацию, восстановительное лечение, обследование, консультацию
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Referral057ClinicalProfileId =
	| "hospitalization_cmfs"
	| "imaging_mri_cbct"
	| "allergic_examination"
	| "ent_consultation"
	| "cardio_consultation";

export type Referral057Purpose =
	| "hospitalization"
	| "examination"
	| "consultation"
	| "rehabilitation";

export type Referral057Urgency = "routine" | "urgent";

export type Referral057PaymentSource = "oms" | "dms" | "commercial";

export interface PartnerHospitalPreset {
	readonly id: string;
	readonly fullName: string;
	readonly shortName: string;
	readonly departmentName: string;
	readonly ogrn: string;
	readonly address: string;
	readonly phone: string;
	readonly supportedProfiles: readonly Referral057ClinicalProfileId[];
	readonly acceptsOms: boolean;
	readonly acceptsDms: boolean;
}

export interface Icd10DiagnosticTemplate {
	readonly code: string;
	readonly titleRu: string;
	readonly detailedDiagnosisRu: string;
	readonly clinicalJustificationRu: string;
	readonly recommendedPurpose: Referral057Purpose;
}

export interface DefaultDiagnosticTestPreset {
	readonly testName: string;
	readonly defaultResult: string;
	readonly requiredForProfiles: readonly Referral057ClinicalProfileId[];
	readonly validityDays: number;
}

export interface Referral057ProfileDefinition {
	readonly id: Referral057ClinicalProfileId;
	readonly labelRu: string;
	readonly shortBadgeRu: string;
	readonly descriptionRu: string;
	readonly targetSpecialtyRu: string;
	readonly defaultPurpose: Referral057Purpose;
	readonly defaultUrgency: Referral057Urgency;
	readonly primaryPartnerHospitalId: string;
	readonly icd10Templates: readonly Icd10DiagnosticTemplate[];
	readonly defaultClinicalGoalRu: string;
	readonly preOpTestsChecklist: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARTNER HOSPITALS & DIAGNOSTIC CENTERS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const PARTNER_HOSPITALS_CATALOG: readonly PartnerHospitalPreset[] = [
	{
		id: "hosp_cmfs_pirogov",
		fullName: 'ГБУЗ "Городская клиническая больница № 1 им. Н.И. Пирогова ДЗМ"',
		shortName: "ГКБ № 1 им. Н.И. Пирогова (ЧЛХ)",
		departmentName: "Отделение челюстно-лицевой хирургии",
		ogrn: "1037700012345",
		address: "119049, г. Москва, Ленинский пр-т, д. 8",
		phone: "+7 (495) 536-91-16",
		supportedProfiles: ["hospitalization_cmfs"],
		acceptsOms: true,
		acceptsDms: true,
	},
	{
		id: "hosp_cmfs_cniis",
		fullName: 'ФГБУ "НМИЦ "ЦНИИС и ЧЛХ" Минздрава России"',
		shortName: "НМИЦ ЦНИИС и ЧЛХ Минздрава РФ",
		departmentName: "Стационар челюстно-лицевой и пластической хирургии",
		ogrn: "1027739001234",
		address: "119021, г. Москва, ул. Тимура Фрунзе, д. 16",
		phone: "+7 (499) 246-82-59",
		supportedProfiles: ["hospitalization_cmfs", "imaging_mri_cbct"],
		acceptsOms: true,
		acceptsDms: true,
	},
	{
		id: "hosp_cmfs_inozemtsev",
		fullName: 'ГБУЗ "ГКБ им. Ф.И. Иноземцева ДЗМ"',
		shortName: "ГКБ им. Ф.И. Иноземцева (ЧЛХ)",
		departmentName: "Отделение экстренной и плановой ЧЛХ",
		ogrn: "1037719001234",
		address: "105187, г. Москва, ул. Фортунатовская, д. 1",
		phone: "+7 (499) 166-50-25",
		supportedProfiles: ["hospitalization_cmfs"],
		acceptsOms: true,
		acceptsDms: false,
	},
	{
		id: "diag_mri_medscan",
		fullName: 'ООО "Диагностический центр МЕДСКАН Эксперт 3D"',
		shortName: "МЕДСКАН Эксперт 3D (МРТ/КТ)",
		departmentName: "Отделение магнитно-резонансной и лучевой томографии",
		ogrn: "1157746001234",
		address: "117342, г. Москва, ул. Обручева, д. 21",
		phone: "+7 (495) 150-17-77",
		supportedProfiles: ["imaging_mri_cbct"],
		acceptsOms: true,
		acceptsDms: true,
	},
	{
		id: "inst_allergy_iaki",
		fullName: 'АНО "Институт Аллергологии и Клинической Иммунологии (ИАКИ)"',
		shortName: "Институт Аллергологии (ИАКИ)",
		departmentName: "Консультативно-диагностическое отделение аллергологии",
		ogrn: "1027700054321",
		address: "123104, г. Москва, Малая Бронная ул., д. 20, стр. 1",
		phone: "+7 (495) 695-56-95",
		supportedProfiles: ["allergic_examination"],
		acceptsOms: true,
		acceptsDms: true,
	},
	{
		id: "sverzh_ent_center",
		fullName: 'ГБУЗ "НИКИО им. Л.И. Свержевского ДЗМ"',
		shortName: "МНПЦО им. Л.И. Свержевского (ЛОР)",
		departmentName: "Отделение ринологии и микрохирургии пазух",
		ogrn: "1037739005678",
		address: "117152, г. Москва, Загородное шоссе, д. 18А, стр. 2",
		phone: "+7 (495) 633-92-05",
		supportedProfiles: ["ent_consultation"],
		acceptsOms: true,
		acceptsDms: true,
	},
	{
		id: "chazov_cardio_center",
		fullName: 'ФГБУ "НМИЦ кардиологии им. ак. Е.И. Чазова Минздрава России"',
		shortName: "НМИЦ Кардиологии им. ак. Е.И. Чазова",
		departmentName: "Консультативно-диагностический центр кардиологии",
		ogrn: "1027700098765",
		address: "121552, г. Москва, 3-я Черепковская ул., д. 15А",
		phone: "+7 (495) 414-60-00",
		supportedProfiles: ["cardio_consultation"],
		acceptsOms: true,
		acceptsDms: true,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL REFERRAL PROFILES CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export const REFERRAL_057_PROFILES: readonly Referral057ProfileDefinition[] = [
	{
		id: "hospitalization_cmfs",
		labelRu: "Челюстно-лицевая хирургия (ЧЛХ)",
		shortBadgeRu: "ЧЛХ Стационар",
		descriptionRu: "Госпитализация в стационар ЧЛХ при остеомиелите, флегмонах, ретенированных дистопированных зубах высокой сложности, кистах челюстей > 3 см",
		targetSpecialtyRu: "Врач-челюстно-лицевой хирург",
		defaultPurpose: "hospitalization",
		defaultUrgency: "routine",
		primaryPartnerHospitalId: "hosp_cmfs_pirogov",
		defaultClinicalGoalRu: "Госпитализация в отделение ЧЛХ для проведения планового оперативного вмешательства под эндотрахеальным наркозом в условиях специализированного стационара.",
		preOpTestsChecklist: [
			"ОАК (общий анализ крови с лейкоцитарной формулой и СОЭ) — годен 10-14 дней",
			"ОАМ (общий анализ мочи) — годен 10-14 дней",
			"Биохимический анализ крови (глюкоза, мочевина, креатинин, билирубин, АЛТ, АСТ, общий белок) — годен 14 дней",
			"Коагулограмма (ПТИ, МНО, АЧТВ, фибриноген, тромбиновое время) — годна 14 дней",
			"Госпитальный комплекс (ВИЧ, HBsAg, HCV, RW/сифилис) — годен 3 месяца",
			"Группа крови и резус-фактор (AB0 и Rh-фактор с фенотипированием) — бессрочно",
			"ЭКГ в 12 отведениях с расшифровкой — годна 1 месяц",
			"Флюорография / Рентгенография органов грудной клетки в 2 проекциях — годна 11 месяцев",
			"3D КЛКТ челюстно-лицевой области 15x15 см / ОПТГ в цифровом виде (диск/ссылка)",
			"Заключение врача-терапевта об отсутствии противопоказаний к плановой операции под общей анестезией",
		],
		icd10Templates: [
			{
				code: "K01.1",
				titleRu: "Ретинированные зубы",
				detailedDiagnosisRu: "K01.1 Глубокая костная ретенция и дистопия зуба 3.8 (IV класс по Pell & Gregory), непосредственное прилегание верхушек корней к нижнечелюстному каналу.",
				clinicalJustificationRu: "Невозможность безопасного амбулаторного удаления ввиду высокого риска повреждения нижнеальвеолярного нерва и массивного интраоперационного кровотечения. Показано удаление зуба 3.8 в условиях стационара ЧЛХ.",
				recommendedPurpose: "hospitalization",
			},
			{
				code: "K10.2",
				titleRu: "Воспалительные заболевания челюстей (Остеомиелит)",
				detailedDiagnosisRu: "K10.2 Хронический одонтогенный деструктивно-продуктивный остеомиелит тела и ветви нижней челюсти справа в фазе обострения.",
				clinicalJustificationRu: "Выраженная воспалительная инфильтрация мягких тканей, наличие деструктивных очагов и секвестрации костной ткани. Требуется секвестрэктомия, периостотомия и комплексная антибактериальная дезинтоксикационная терапия в стационаре ЧЛХ.",
				recommendedPurpose: "hospitalization",
			},
			{
				code: "K04.8",
				titleRu: "Корневая киста (Обширная радикулярная киста)",
				detailedDiagnosisRu: "K04.8 Обширная радикулярная киста нижней челюсти в области зубов 4.5-4.7 диаметром более 3.5 см с истончением кортикальной пластинки.",
				clinicalJustificationRu: "Высокий риск патологического перелома нижней челюсти при амбулаторной цистэктомии. Показана цистэктомия с костной пластинкой остеопластическим материалом и фиксацией титановой минипластиной в отделении ЧЛХ.",
				recommendedPurpose: "hospitalization",
			},
			{
				code: "K12.2",
				titleRu: "Флегмона и абсцесс полости рта",
				detailedDiagnosisRu: "K12.2 Одонтогенная флегмона поднижнечелюстного и околоушно-жевательного пространств справа от зуба 4.7.",
				clinicalJustificationRu: "Быстро прогрессирующий отек, контрактура жевательных мышц III степени, гипертермия 38.8 °C, угроза распространения в средостение. Показана экстренная госпитализация в стационар ЧЛХ для вскрытия и дренирования флегмоны.",
				recommendedPurpose: "hospitalization",
			},
		],
	},
	{
		id: "imaging_mri_cbct",
		labelRu: "Высокотехнологичная лучевая диагностика (МРТ / КЛКТ)",
		shortBadgeRu: "МРТ / КЛКТ 3D",
		descriptionRu: "Направление на высокотехнологичное лучевое обследование: МРТ ВНЧС с функциональными пробами, КЛКТ 3D 15x15 см, ТРГ в боковой проекции",
		targetSpecialtyRu: "Врач-рентгенолог / Специалист МРТ-диагностики",
		defaultPurpose: "examination",
		defaultUrgency: "routine",
		primaryPartnerHospitalId: "diag_mri_medscan",
		defaultClinicalGoalRu: "Проведение магнитно-резонансной томографии височно-нижнечелюстных суставов (МРТ ВНЧС) с функциональными пробами в сагиттальной и фронтальной плоскостях (с закрытым и максимально открытым ртом).",
		preOpTestsChecklist: [
			"Ортопантомограмма (ОПТГ) / обзорный панорамный снимок зубных рядов",
			"Консультативное заключение врача-стоматолога ортопеда/гнатолога",
			"Анкета безопасности МРТ (отсутствие кардиостимулятора, ферромагнитных имплантатов и клипс)",
		],
		icd10Templates: [
			{
				code: "K07.6",
				titleRu: "Болезни височно-нижнечелюстного сустава (Дисфункция ВНЧС)",
				detailedDiagnosisRu: "K07.6 Синдром болевой дисфункции ВНЧС с обеих сторон. Подострый невправляемый передне-медиальный вывих суставного диска правого ВНЧС.",
				clinicalJustificationRu: "Болевой синдром, ограничение открывания рта до 22 мм, девиация нижней челюсти вправо, крепитация и щелчки при движении. Требуется МРТ ВНЧС в режимах T1, T2, PD-ВИ для верификации положения суставного диска и планирования сплинт-терапии.",
				recommendedPurpose: "examination",
			},
			{
				code: "M19.9",
				titleRu: "Артроз неуточненный (Деформирующий остеоартроз ВНЧС)",
				detailedDiagnosisRu: "M19.9 Деформирующий остеоартроз правого височно-нижнечелюстного сустава II-III стадии, уплощение суставной головки, остеофиты.",
				clinicalJustificationRu: "Хронический болевой синдром при жевании, хруст в суставе. Показано проведение МРТ ВНЧС и КЛКТ 3D для оценки состояния суставного хряща, биламинарной зоны и объема костной деструкции.",
				recommendedPurpose: "examination",
			},
			{
				code: "K08.1",
				titleRu: "Потеря зубов вследствие удаления / атрофия альвеолярного гребня",
				detailedDiagnosisRu: "K08.1 Частичное вторичное отсутствие зубов на верхней и нижней челюстях. Выраженная атрофия альвеолярного отростка верхней челюсти (класс IV по Cawood & Howell).",
				clinicalJustificationRu: "Планирование тотальной реабилитации с использованием скуловых и птеригоидных имплантатов (All-on-4 / All-on-6). Требуется 3D КЛКТ ЧЛО с полем обзора 15x15 см и разрешением 0.15 мм для навигационного 3D-шаблона.",
				recommendedPurpose: "examination",
			},
		],
	},
	{
		id: "allergic_examination",
		labelRu: "Аллергологическое обследование (Аллерголог-иммунолог)",
		shortBadgeRu: "Аллерголог-иммунолог",
		descriptionRu: "Консультация аллерголога-иммунолога и постановка аллергопроб на местные анестетики (амиды/эфиры), латекс, акрилаты, металлы",
		targetSpecialtyRu: "Врач-аллерголог-иммунолог",
		defaultPurpose: "consultation",
		defaultUrgency: "routine",
		primaryPartnerHospitalId: "inst_allergy_iaki",
		defaultClinicalGoalRu: "Консультация аллерголога-иммунолога, постановка кожных скарификационных/прик-тестов и определение специфических IgE к местным анестетикам группы амидов для подбора безопасного анестетика для стоматологического лечения.",
		preOpTestsChecklist: [
			"ОАК с развернутой лейкоцитарной формулой и подсчетом эозинофилов",
			"Общий сывороточный иммуноглобулин E (IgE общий)",
			"Список планируемых стоматологических препаратов и анестетиков (Артикаин 4%, Мепивакаин 3%, Ультракаин Д-С Форте, Скандонест, Септанест)",
		],
		icd10Templates: [
			{
				code: "Z88.8",
				titleRu: "Аллергическое состояние к другим лекарственным средствам в анамнезе",
				detailedDiagnosisRu: "Z88.8 Отягощенный аллергологический анамнез: генерализованная крапивница и отек губы после инъекции местного анестетика неуточненного ряда в 2024 г.",
				clinicalJustificationRu: "Необходимость санации полости рта и эндодонтического лечения под местной анестезией. Показано проведение аллергопроб (in vivo / in vitro IgE) на Артикаин 4%, Мепивакаин 3%, Лидокаин 2% для исключения IgE-опосредованной гиперчувствительности.",
				recommendedPurpose: "consultation",
			},
			{
				code: "T78.3",
				titleRu: "Ангионевротический отек (Отек Квинке в анамнезе)",
				detailedDiagnosisRu: "T78.3 Ангионевротический отек Квинке в личном анамнезе на медикаментозные препараты. Поливалентная сенсибилизация.",
				clinicalJustificationRu: "Предстоит хирургическое вмешательство (множественное удаление зубов, синус-лифтинг). Требуется заключение аллерголога с подбором безопасного препарата и премедикации (антигистаминные/ГКС).",
				recommendedPurpose: "consultation",
			},
			{
				code: "L27.0",
				titleRu: "Генерализованное высыпание на коже от лекарств",
				detailedDiagnosisRu: "L27.0 Контактный аллергический стоматит / хейлит на акрилаты базиса съемного протеза (метилметакрилат).",
				clinicalJustificationRu: "Жжение слизистой оболочки протезного ложа, эритема. Показана консультация аллерголога с проведением аппликационных патч-тестов на стоматологические полимеры и металлы (Ni, Cr, Co, Ti).",
				recommendedPurpose: "examination",
			},
		],
	},
	{
		id: "ent_consultation",
		labelRu: "Оториноларингология (ЛОР-консультация)",
		shortBadgeRu: "ЛОР-врач",
		descriptionRu: "Консультация ЛОР-врача при одонтогенном гайморите, перфорации дна гайморовой пазухи, перед проведением синус-лифтинга",
		targetSpecialtyRu: "Врач-оториноларинголог",
		defaultPurpose: "consultation",
		defaultUrgency: "routine",
		primaryPartnerHospitalId: "sverzh_ent_center",
		defaultClinicalGoalRu: "Консультация врача-оториноларинголога с эндоскопией полости носа и носоглотки, оценка проходимости естественного соустья верхнечелюстной пазухи перед проведением синус-лифтинга / при одонтогенном гайморите.",
		preOpTestsChecklist: [
			"3D КЛКТ околоносовых пазух и верхней челюсти (диск/DICOM срез)",
			"ОАК с лейкоформулой и СОЭ",
			"С-реактивный белок (СРБ) количественный",
			"Цитологический/микробиологический мазок из полости носа (при наличии отделяемого)",
		],
		icd10Templates: [
			{
				code: "J32.0",
				titleRu: "Хронический верхнечелюстной синусит (Одонтогенный гайморит)",
				detailedDiagnosisRu: "J32.0 Хронический одонтогенный правосторонний верхнечелюстной синусит, ассоциированный с периапикальным очагом зуба 1.6.",
				clinicalJustificationRu: "Заложенность носа справа, периодические гнойные выделения, утолщение слизистой оболочки дна пазухи более 8 мм по данным КЛКТ. Показана эндоскопическая гайморотомия / санация пазухи перед удалением причинного зуба.",
				recommendedPurpose: "consultation",
			},
			{
				code: "T81.2",
				titleRu: "Перфорация дна гайморовой пазухи (Ороантральное соустье)",
				detailedDiagnosisRu: "T81.2 Острое ороантральное сообщение в области лунки удаленного зуба 2.6, возникшее при сложном удалении корней.",
				clinicalJustificationRu: "Положительная носоротовая проба. Требуется консультация ЛОР-врача, оценка состояния слизистой оболочки пазухи и совместное решение вопроса о пластике соустья местными тканями.",
				recommendedPurpose: "consultation",
			},
			{
				code: "K04.5",
				titleRu: "Хронический апикальный периодонтит верхних моляров / предоперационная оценка",
				detailedDiagnosisRu: "K04.5 Хронический гранулирующий периодонтит зубов 2.6, 2.7. Планируется открытый синус-лифтинг и установка имплантатов.",
				clinicalJustificationRu: "Наличие куполообразного утолщения слизистой Шнейдера (киста/полип пазухи до 14 мм). Требуется оценка вентиляционной функции соустья и заключение о допустимости синус-лифтинга.",
				recommendedPurpose: "consultation",
			},
		],
	},
	{
		id: "cardio_consultation",
		labelRu: "Кардиология (Предоперационная консультация)",
		shortBadgeRu: "Кардиолог",
		descriptionRu: "Консультация кардиолога при артериальной гипертензии III ст., приеме антикоагулянтов (Варфарин, Ксарелто) перед хирургией",
		targetSpecialtyRu: "Врач-кардиолог",
		defaultPurpose: "consultation",
		defaultUrgency: "routine",
		primaryPartnerHospitalId: "chazov_cardio_center",
		defaultClinicalGoalRu: "Консультация врача-кардиолога для оценки периоперационного кардиоваскулярного риска, коррекции гипотензивной терапии и согласования схемы временной отмены/мост-терапии антикоагулянтами перед стоматологической операцией.",
		preOpTestsChecklist: [
			"Электрокардиограмма (ЭКГ в 12 отведениях) с расшифровкой (срок давности до 14 дней)",
			"Коагулограмма: МНО, ПТИ, АЧТВ, фибриноген (срок давности до 7 дней)",
			"Дневник самоконтроля АД за последние 7 дней",
			"Эхокардиография (ЭхоКГ / УЗИ сердца) при пороках и сердечной недостаточности",
			"Список принимаемых кардиологических препаратов с указанием дозировок",
		],
		icd10Templates: [
			{
				code: "Z92.1",
				titleRu: "В анамнезе долговременное использование антикоагулянтов",
				detailedDiagnosisRu: "Z92.1 Постоянная антикоагулянтная терапия препаратом Ксарелто (Ривароксабан) 20 мг/сут по поводу фибрилляции предсердий. Артериальная гипертензия II ст.",
				clinicalJustificationRu: "Предстоит обширное хирургическое вмешательство (множественное удаление 6 зубов с альвеолопластикой). Требуется заключение кардиолога о возможности отмены Ксарелто за 24-48 ч до операции или переводе на низкомолекулярные гепарины.",
				recommendedPurpose: "consultation",
			},
			{
				code: "I11.9",
				titleRu: "Гипертензивная болезнь сердца (АГ III стадии)",
				detailedDiagnosisRu: "I11.9 Гипертоническая болезнь III стадии, риск ССО 4 (очень высокий). Частые гипертонические кризы с подъемом АД до 190/110 мм рт. ст.",
				clinicalJustificationRu: "Неконтролируемая артериальная гипертензия. Требуется подбор стабильной гипотензивной терапии для безопасного проведения стоматологического лечения с адреналин-содержащими анестетиками.",
				recommendedPurpose: "consultation",
			},
			{
				code: "Z95.2",
				titleRu: "Наличие протеза сердечного клапана (Прием Варфарина)",
				detailedDiagnosisRu: "Z95.2 Состояние после протезирования митрального клапана механическим протезом. Постоянный прием Варфарина под контролем МНО.",
				clinicalJustificationRu: "Показано хирургическое вмешательство в полости рта. Требуется согласование целевого уровня МНО (2.0-2.5) или мост-терапии НМГ (Клексан/Фраксипарин) и антибиотикопрофилактики инфекционного эндокардита.",
				recommendedPurpose: "consultation",
			},
		],
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. STANDARD DIAGNOSTIC TESTS CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_DIAGNOSTIC_TESTS: readonly DefaultDiagnosticTestPreset[] = [
	{
		testName: "Общий (клинический) анализ крови развернутый с лейкоформулой и СОЭ",
		defaultResult: "Hb: 142 г/л; Эр: 4.6x10^12/л; Лейк: 6.8x10^9/л; Тромб: 245x10^9/л; СОЭ: 8 мм/ч",
		requiredForProfiles: ["hospitalization_cmfs", "allergic_examination", "ent_consultation"],
		validityDays: 14,
	},
	{
		testName: "Коагулограмма (гемостазиограмма): ПТИ, МНО, АЧТВ, фибриноген",
		defaultResult: "МНО: 1.04; ПТИ: 98%; АЧТВ: 31 сек; Фибриноген: 3.2 г/л",
		requiredForProfiles: ["hospitalization_cmfs", "cardio_consultation"],
		validityDays: 14,
	},
	{
		testName: "Биохимический анализ крови: глюкоза, билирубин, АЛТ, АСТ, креатинин, мочевина, общий белок",
		defaultResult: "Глюкоза: 5.1 ммоль/л; Креатинин: 78 мкмоль/л; Билирубин общ: 14.2 мкмоль/л; АЛТ: 22 Ед/л; АСТ: 19 Ед/л",
		requiredForProfiles: ["hospitalization_cmfs"],
		validityDays: 14,
	},
	{
		testName: "Госпитальный комплекс инфекций (ВИЧ 1/2, HBsAg, Anti-HCV, Treponema pallidum)",
		defaultResult: "ВИЧ 1/2: отрицательно; HBsAg: отрицательно; Anti-HCV: отрицательно; RW (микрореакция): отрицательно",
		requiredForProfiles: ["hospitalization_cmfs"],
		validityDays: 90,
	},
	{
		testName: "Группа крови и резус-фактор (AB0 / Rh-фактор / фенотип Kell)",
		defaultResult: "Группа крови: A (II) вторая, Rh (+), Kell (-)",
		requiredForProfiles: ["hospitalization_cmfs"],
		validityDays: 3650,
	},
	{
		testName: "Электрокардиограмма (ЭКГ в 12 отведениях с расшифровкой)",
		defaultResult: "Ритм синусовый, правильный. ЧСС 72 уд/мин. ЭОС нормальная. Очаговых и ишемических изменений не выявлено",
		requiredForProfiles: ["hospitalization_cmfs", "cardio_consultation"],
		validityDays: 30,
	},
	{
		testName: "Флюорография / Рентгенография органов грудной клетки (2 проекции)",
		defaultResult: "Легочные поля прозрачны, без очаговых и инфильтративных теней. Корни структурны. Синусы свободны. Сердце и аорта в норме",
		requiredForProfiles: ["hospitalization_cmfs"],
		validityDays: 330,
	},
	{
		testName: "Ортопантомография (ОПТГ цифровой панорамный снимок)",
		defaultResult: "ОПТГ от текущей даты: визуализируются очаги периапикальной деструкции, анатомические ориентиры сохранены",
		requiredForProfiles: ["hospitalization_cmfs", "imaging_mri_cbct", "ent_consultation"],
		validityDays: 180,
	},
	{
		testName: "Конусно-лучевая компьютерная томография (3D КЛКТ ЧЛО)",
		defaultResult: "3D КЛКТ: получены объемные рекострукции с высоким разрешением, визуализированы костные дефекты и каналы",
		requiredForProfiles: ["hospitalization_cmfs", "imaging_mri_cbct", "ent_consultation"],
		validityDays: 180,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. HELPER LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getReferralProfileDefinition(
	profileId: Referral057ClinicalProfileId | string,
): Referral057ProfileDefinition {
	const found = REFERRAL_057_PROFILES.find((p) => p.id === profileId);
	if (found) return found;
	return REFERRAL_057_PROFILES[0]!;
}

export function getPartnerHospitalPreset(
	hospitalId: string,
): PartnerHospitalPreset {
	const found = PARTNER_HOSPITALS_CATALOG.find((h) => h.id === hospitalId);
	if (found) return found;
	return PARTNER_HOSPITALS_CATALOG[0]!;
}

export function getPurposeLabelRu(purpose: Referral057Purpose): string {
	switch (purpose) {
		case "hospitalization":
			return "Госпитализация";
		case "examination":
			return "Обследование";
		case "consultation":
			return "Консультация";
		case "rehabilitation":
			return "Восстановительное лечение";
		default:
			return "Консультация";
	}
}

export function getUrgencyLabelRu(urgency: Referral057Urgency): string {
	switch (urgency) {
		case "routine":
			return "Плановое";
		case "urgent":
			return "Экстренное (неотложное)";
		default:
			return "Плановое";
	}
}

export function getPaymentSourceLabelRu(source: Referral057PaymentSource): string {
	switch (source) {
		case "oms":
			return "ОМС (Обязательное медицинское страхование)";
		case "dms":
			return "ДМС (Добровольное медицинское страхование)";
		case "commercial":
			return "ПМУ (Платные медицинские услуги)";
		default:
			return "ОМС";
	}
}
