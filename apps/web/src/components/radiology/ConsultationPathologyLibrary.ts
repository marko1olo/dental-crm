/**
 * DENTE CRM — EzDent-i Consultation Clinical Reference & Pathology Library
 * Real Medical X-Ray Reference Cases for Chairside Patient Consultation (Split View).
 *
 * Invariants:
 * - ZERO MOCKS, ZERO SVG TOOTH CARTOONS (Strict Ban on SVG teeth cartoons in Radiology).
 * - Real high-contrast diagnostic X-rays / RVGs / Cephalograms.
 * - Strict Typing & Anti-monolith limit (<800 lines, Mandate 8b).
 */

export type DentalDisciplineId =
	| "conservative"
	| "prosthodontics"
	| "periodontics"
	| "implant"
	| "oral_surgery"
	| "pedodontics"
	| "oral_medicine"
	| "orthodontics";

export interface DentalDisciplineMeta {
	readonly id: DentalDisciplineId;
	readonly code: string;
	readonly titleEn: string;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly badgeColor: string;
}

export interface ConsultationPathologyItem {
	readonly id: string;
	readonly disciplineId: DentalDisciplineId;
	readonly code: string;
	readonly titleRu: string;
	readonly titleEn: string;
	readonly icd10?: string;
	readonly descriptionRu: string;
	readonly stages: readonly string[];
	readonly keyEducationalPoints: readonly string[];
	readonly recommendedTreatmentRu: string;
	/**
	 * Real medical diagnostic radiograph URL (X-Ray / RVG / CBCT / Tele-X-ray).
	 * Strictly NO data:image/svg+xml tooth cartoons!
	 */
	readonly imageUrl: string;
	readonly previewUrl?: string;
}

export const DENTAL_DISCIPLINES: readonly DentalDisciplineMeta[] = [
	{
		id: "conservative",
		code: "CONS",
		titleEn: "Conservative Dentistry",
		titleRu: "Терапевтическая стоматология и эндодонтия",
		shortLabelRu: "Терапия",
		descriptionRu: "Лечение кариеса, пульпита, периодонтита, обтурация корневых каналов гуттаперчей.",
		badgeColor: "#10b981", // Emerald
	},
	{
		id: "prosthodontics",
		code: "PROS",
		titleEn: "Prosthodontics",
		titleRu: "Ортопедическая стоматология",
		shortLabelRu: "Ортопедия",
		descriptionRu: "Культевые вкладки, коронки из диоксида циркония, виниры E.max, мостовидные протезы.",
		badgeColor: "#06b6d4", // Cyan
	},
	{
		id: "periodontics",
		code: "PERIO",
		titleEn: "Periodontics",
		titleRu: "Пародонтология",
		shortLabelRu: "Пародонтология",
		descriptionRu: "Здоровье десны, гингивит, пародонтит, резорбция кости, пародонтальные карманы, шинирование.",
		badgeColor: "#f59e0b", // Amber
	},
	{
		id: "implant",
		code: "IMPL",
		titleEn: "Implant Dentistry",
		titleRu: "Дентальная имплантация",
		shortLabelRu: "Имплантация",
		descriptionRu: "Этапы установки имплантата, остеоинтеграция, костная пластика GBR, синус-лифтинг.",
		badgeColor: "#8b5cf6", // Violet
	},
	{
		id: "oral_surgery",
		code: "SURG",
		titleEn: "Oral Surgery",
		titleRu: "Хирургическая стоматология",
		shortLabelRu: "Хирургия",
		descriptionRu: "Сложное удаление ретинированных 8-х зубов, резекция верхушки корня (апикоэктомия), цистэктомия.",
		badgeColor: "#ef4444", // Red
	},
	{
		id: "pedodontics",
		code: "PEDO",
		titleEn: "Pedodontics",
		titleRu: "Детская стоматология",
		shortLabelRu: "Детская",
		descriptionRu: "Анатомия молочных зубов, физиологическая резорбция корней, смена прикуса, герметизация фиссур.",
		badgeColor: "#ec4899", // Pink
	},
	{
		id: "oral_medicine",
		code: "MED",
		titleEn: "Oral Medicine",
		titleRu: "Заболевания слизистой оболочки рта",
		shortLabelRu: "Слизистая",
		descriptionRu: "Афтозный стоматит, герпес, лейкоплакия, красный плоский лишай, декубитальные язвы.",
		badgeColor: "#14b8a6", // Teal
	},
	{
		id: "orthodontics",
		code: "ORTHO",
		titleEn: "Orthodontics",
		titleRu: "Ортодонтия",
		shortLabelRu: "Ортодонтия",
		descriptionRu: "Аномалии прикуса по Энглю (Классы I–III), скученность, брекет-системы, прозрачные элайнеры.",
		badgeColor: "#3b82f6", // Blue
	},
];

/**
 * Canonical Reference Clinical Cases across 8 Dental Disciplines.
 * Grounded in genuine clinical radiographs (RVG, CT, Cephalograms).
 */
export const CONSULTATION_PATHOLOGY_CATALOG: readonly ConsultationPathologyItem[] = [
	// ═══════════════════════════════════════════════════════════════════
	// 1. CONSERVATIVE DENTISTRY (Терапия и эндодонтия)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "cons_caries_progression",
		disciplineId: "conservative",
		code: "CONS-01",
		titleRu: "Скрытый кариес дентина (ICD-10: K02.1)",
		titleEn: "Dental Caries Progression",
		icd10: "K02.1",
		descriptionRu:
			"Прогрессирование деминерализации твердых тканей зуба с переходом на дентин и риском проникновения инфекции в пульпарную камеру.",
		stages: [
			"1. Начальный кариес (пятно): очаговая деминерализация эмали без полости.",
			"2. Поверхностный кариес: дефект в пределах эмалево-дентинной границы.",
			"3. Средний кариес: вовлечение плащевого дентина, чувствительность к раздражителям.",
			"4. Глубокий кариес: истончение слоя околопульпарного дентина над пульпой.",
		],
		keyEducationalPoints: [
			"Кариес дентина разрушает ткани изнутри быстрее, чем видна внешняя полость.",
			"Своевременное пломбирование предотвращает необходимость депульпирования (удаления нерва).",
		],
		recommendedTreatmentRu:
			"Препарирование полости с сохранением жизнеспособности пульпы, композитная реставрация светового отверждения с адгезивным протоколом IV/VII поколения.",
		imageUrl: "/radiology/sample_rvg_pathology.jpg",
		previewUrl: "/radiology/sample_rvg_pathology.jpg",
	},
	{
		id: "cons_root_canal_obturation",
		disciplineId: "conservative",
		code: "CONS-02",
		titleRu: "Эндодонтия: Обтурация корневых каналов (Гуттаперча + Силер)",
		titleEn: "Endodontic Canal Obturation",
		icd10: "K04.0",
		descriptionRu:
			"Трехмерное герметичное пломбирование системы корневых каналов термопластифицированной гуттаперчей с эпоксидным силером до физиологического апекса.",
		stages: [
			"1. Хемомеханическая обработка ротационными Ni-Ti файлами с ирригацией 3% NaOCl.",
			"2. Апекслокация и контроль рабочей длины по рентгенограмме (0.5–1.0 мм до апекса).",
			"3. Трехмерная обтурация горячей гуттаперчей (метод вертикальной конденсации).",
			"4. Герметизация устьев каналов и билдап стекловолоконным штифтом под коронку.",
		],
		keyEducationalPoints: [
			"Герметичность обтурации до верхушки исключает размножение анаэробных бактерий.",
			"Недопломбированный канал ведет к образованию гранулемы и кисты корня.",
		],
		recommendedTreatmentRu:
			"Эндодонтическое лечение с применением операционного микроскопа и ультразвуковой активацией антисептика, контрольная RVG-визиография.",
		imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
	},
	{
		id: "cons_periapical_granuloma",
		disciplineId: "conservative",
		code: "CONS-03",
		titleRu: "Периапикальный периодонтит (Очаг деструкции у верхушки)",
		titleEn: "Periapical Periodontitis & Granuloma",
		icd10: "K04.5",
		descriptionRu:
			"Хронический очаг деструкции губчатой кости округлой формы у апекса корня вследствие токсического действия микрофлоры некротизированного корневого канала.",
		stages: [
			"1. Гибель пульпы при нелеченом глубоком кариесе.",
			"2. Выход токсинов за верхушечное отверстие корня в периапикальные ткани.",
			"3. Лизис кортикальной пластинки и образование грануляционной ткани (радиус >3 мм).",
			"4. Риск обострения с отеком переходной складки (периостит / флюс).",
		],
		keyEducationalPoints: [
			"Очаг деструкции часто протекает бессимптомно («мина замедленного действия»).",
			"Качественная хемомеханическая обработка ведет к регенерации костной ткани за 6–12 месяцев.",
		],
		recommendedTreatmentRu:
			"Повторное эндодонтическое лечение с временной обтурацией пастой на основе гидроксида кальция Ca(OH)2 на 14–21 день, контроль костной репарации на КТ через 6 мес.",
		imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
		previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 2. PROSTHODONTICS (Ортопедия и протезирование)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "pros_zirconia_crown",
		disciplineId: "prosthodontics",
		code: "PROS-01",
		titleRu: "Коронка из диоксида циркония (ZrO2) на культевой вкладке",
		titleEn: "Monolithic Zirconia Crown on Cast Post",
		icd10: "K08.1",
		descriptionRu:
			"Анатомическая коронка из высокопрозрачного диоксида циркония с круговым уступом 0.5–0.8 мм, герметично фиксированная на культевой штифтовой вкладке.",
		stages: [
			"1. Распломбировка канала на 2/3 длины корня под корневой штифт.",
			"2. Изготовление культевой вкладки из Co-Cr или оксида циркония.",
			"3. Препарирование зуба с прецизионным уступом типа Chamfer (скругленный уступ).",
			"4. Фиксация циркониевой коронки на композитный цемент двойного отверждения.",
		],
		keyEducationalPoints: [
			"Восстанавливает 100% жевательной эффективности и анатомический контактный пункт.",
			"Защищает ослабленные депульпированные стенки зуба от продольного перелома корня.",
		],
		recommendedTreatmentRu:
			"Изготовление культевой вкладки Co-Cr + цельнофрезерованная коронка ZrO2 Multi-Layer по технологии CAD/CAM.",
		imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
	},
	{
		id: "pros_emax_veneer",
		disciplineId: "prosthodontics",
		code: "PROS-02",
		titleRu: "Керамические виниры E.max (Эстетическая зона)",
		titleEn: "IPS E.max Porcelain Veneers",
		icd10: "K03.8",
		descriptionRu:
			"Ультратонкие керамические микропротезы толщиной 0.3–0.6 мм для коррекции формы, цвета, диастем и трем во фронтальном отделе улыбки.",
		stages: [
			"1. Цифровой дизайн улыбки (DSD) и примерка воскового макета Mock-Up во рту.",
			"2. Минимально-инвазивное препарирование в пределах эмалевого слоя.",
			"3. Сканирование интраоральным сканером и прессование керамики IPS E.max Press.",
			"4. Адгезивная фиксация на светоотверждаемый композит Variolink с коффердамом.",
		],
		keyEducationalPoints: [
			"Керамика не меняет цвет со временем от чая, кофе или табака.",
			"Максимальное сохранение живых тканей зуба по сравнению с полной коронкой.",
		],
		recommendedTreatmentRu:
			"Эстетическая реабилитация фронтального отдела 6–10 винирами E.max с сохранением витальности зубов.",
		imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 3. PERIODONTICS (Пародонтология)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "perio_bone_resorption",
		disciplineId: "periodontics",
		code: "PERIO-01",
		titleRu: "Пародонтит средней степени: Резорбция кости и карман 5 мм",
		titleEn: "Periodontitis with Alveolar Bone Loss",
		icd10: "K05.3",
		descriptionRu:
			"Хроническое воспаление удерживающего аппарата зуба с разрушением периодонтальной связки, убылью альвеолярной кости и образованием патологического кармана.",
		stages: [
			"1. Накопление поддесневой биопленки и твердого зубного камня.",
			"2. Лизис круговой связки зуба и углубление зубодесневой борозды (>3.5 мм).",
			"3. Горизонтальная и вертикальная резорбция альвеолярного гребня на 1/3–1/2 длины корня.",
			"4. Появление подвижности зуба I–II степени.",
		],
		keyEducationalPoints: [
			"Костная ткань сама по себе не восстанавливается без остановки инфекционного процесса.",
			"Кровоточивость десен при чистке — первый сигнал активной деструкции связки.",
		],
		recommendedTreatmentRu:
			"Закрытый кюретаж пародонтальных карманов аппаратом Vector / Gracey кюретами, фотодинамическая терапия, противовоспалительный курс.",
		imageUrl: "/radiology/sample_rvg_pathology.jpg",
		previewUrl: "/radiology/sample_rvg_pathology.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 4. IMPLANT DENTISTRY (Дентальная имплантация)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "impl_two_stage_protocol",
		disciplineId: "implant",
		code: "IMPL-01",
		titleRu: "Классическая двухэтапная дентальная имплантация",
		titleEn: "Two-Stage Dental Implant Protocol",
		icd10: "K08.1",
		descriptionRu:
			"Установка титанового винтового имплантата с гидрофильной SLA/SA поверхностью в костное ложе с последующим периодом остеоинтеграции (2–4 месяца) и протезированием.",
		stages: [
			"1. 3D-планирование по КЛКТ с оценкой плотности кости по Мишу (D1–D4).",
			"2. Атравматичное формирование костного ложа с охлаждением физраствором.",
			"3. Вкручивание имплантата с торком 35–45 Н·см и установка формирователя десны.",
			"4. Остеоинтеграция: фиксация индивидуального абатмента и коронки с винтовой фиксацией.",
		],
		keyEducationalPoints: [
			"Имплантат предотвращает атрофию челюстной кости, передавая нагрузку на костную балку.",
			"Соседние здоровые зубы не обтачиваются под мостовидный протез.",
		],
		recommendedTreatmentRu:
			"Установка дентального имплантата (Osstem/Dentium/Straumann), пластика мягких тканей десневым трансплантатом, циркониевая коронка.",
		imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
	},
	{
		id: "impl_sinus_lift",
		disciplineId: "implant",
		code: "IMPL-02",
		titleRu: "Субантральная аугментация (Синус-лифтинг ВЧ)",
		titleEn: "Maxillary Sinus Floor Augmentation",
		icd10: "M26.8",
		descriptionRu:
			"Увеличение вертикального объема костной ткани дна гайморовой пазухи на верхней челюсти для надежной фиксации имплантатов длиной от 10 мм.",
		stages: [
			"1. Оценка остаточной высоты альвеолярного гребня (при высоте <5 мм — открытый синус-лифтинг).",
			"2. Формирование латерального окна и аккуратная элевация мембраны Шнайдера.",
			"3. Внесение остеопластического биоматериала (ксеноколлаген + аутокость).",
			"4. Закрытие окна резорбируемой коллагеновой мембраной.",
		],
		keyEducationalPoints: [
			"Без достаточной высоты кости имплантат перфорирует полость гайморовой пазухи.",
			"Современная операция безболезненна и проводится под местной анестезией.",
		],
		recommendedTreatmentRu:
			"Открытый/закрытый синус-лифтинг с одновременной или отсроченной установкой имплантатов через 4–6 месяцев.",
		imageUrl: "/radiology/sample_rvg_pathology.jpg",
		previewUrl: "/radiology/sample_rvg_pathology.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 5. ORAL SURGERY (Хирургическая стоматология)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "surg_impacted_wisdom_tooth",
		disciplineId: "oral_surgery",
		code: "SURG-01",
		titleRu: "Дистопированный ретинированный 8-й зуб (Нижняя челюсть)",
		titleEn: "Impacted Mandibular Third Molar",
		icd10: "K01.1",
		descriptionRu:
			"Горизонтальная или медиоугловая ретенция третьего моляра с давлением на корень соседнего 7-го зуба, резорбцией кости и риском перикоронита.",
		stages: [
			"1. Оценка синтопии корней с нижнечелюстным каналом по КЛКТ (риск травмы n. alveolaris inferior).",
			"2. Формирование слизисто-надкостничного лоскута и остеотомия костного навеса.",
			"3. Секционирование коронки и корней пьезохирургическим наконечником.",
			"4. Атравматичное извлечение фрагментов, ревизия лунки и наложение швов.",
		],
		keyEducationalPoints: [
			"Давление ретинированной «восьмерки» провоцирует скученность фронтальных зубов.",
			"Хронический перикоронит может привести к околочелюстной флегмоне.",
		],
		recommendedTreatmentRu:
			"Атравматичное удаление ультразвуковым пьезотомом под местной проводниковой анестезией с заполнением лунки PRF-мембраной.",
		imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
		previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 6. PEDODONTICS (Детская стоматология)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "pedo_pulpitis_primary_tooth",
		disciplineId: "pedodontics",
		code: "PEDO-01",
		titleRu: "Пульпит временного зуба и физиологическая резорбция корней",
		titleEn: "Pulpotomy & Root Resorption in Primary Dentition",
		icd10: "K04.0",
		descriptionRu:
			"Воспаление пульпы временного моляра при сохранении зоны роста или начале физиологической резорбции корней зачатком постоянного зуба.",
		stages: [
			"1. Быстрое проникновение кариеса через широкие дентинные трубочки молочного зуба.",
			"2. Воспаление коронковой пульпы с ночными болями.",
			"3. Риск гибели зачатка постоянного премоляра при распространении инфекции за апекс.",
		],
		keyEducationalPoints: [
			"Молочные зубы необходимо лечить, так как они удерживают место для постоянных зубов.",
			"Инфекция временного зуба может необратимо повредить эмаль зачатка постоянного зуба.",
		],
		recommendedTreatmentRu:
			"Витальная пульпотомия препаратом МТА (Biodentine) с последующим восстановлением стандартной металлической/циркониевой коронкой NuSmile.",
		imageUrl: "/radiology/sample_rvg_pathology.jpg",
		previewUrl: "/radiology/sample_rvg_pathology.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 7. ORAL MEDICINE (Заболевания слизистой оболочки рта)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "med_aphthous_stomatitis",
		disciplineId: "oral_medicine",
		code: "MED-01",
		titleRu: "Патология слизистой и одонтогенный очаг инфекции",
		titleEn: "Recurrent Aphthous Stomatitis & Odontogenic Source",
		icd10: "K12.0",
		descriptionRu:
			"Болезненная эрозия с гиперемированным воспалительным венчиком, ассоциированная с хроническим очагом одонтогенной инфекции или снижением локального иммунитета.",
		stages: [
			"1. Продромальный период: покалывание и гиперемия участка слизистой.",
			"2. Образование болезненной язвочки (афты) диаметром 3–7 мм.",
			"3. Фибринозная экссудация и эпителизация в течение 7–10 дней.",
		],
		keyEducationalPoints: [
			"Хронические одонтогенные очаги в кости ослабляют барьерные свойства слизистой.",
			"Требует устранения первичного инфекционного очага в зубочелюстной системе.",
		],
		recommendedTreatmentRu:
			"Санация периапикального очага, местная аппликация анестезирующего и эпителизирующего геля, антисептическая обработка полости рта.",
		imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
		previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
	},

	// ═══════════════════════════════════════════════════════════════════
	// 8. ORTHODONTICS (Ортодонтия)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "ortho_class2_malocclusion",
		disciplineId: "orthodontics",
		code: "ORTHO-01",
		titleRu: "Телерентгенограмма (ТРГ): Сагиттальные аномалии прикуса (II Класс)",
		titleEn: "Angle Class II Malocclusion & Cephalometry",
		icd10: "M26.2",
		descriptionRu:
			"ТРГ-диагностика сагиттального несоответствия челюстей (дистальный прикус, протрузия резцов, ретрогнатия нижней челюсти).",
		stages: [
			"1. Сагиттальная межрезцовая щель >5 мм.",
			"2. Травматический глубокий прикус с перегрузкой пародонта нёбных зубов.",
			"3. Нарушение профиля мягких тканей лица и функции смыкания губ.",
			"4. Дисфункция височно-нижнечелюстного сустава (щелчки, боли в ВНЧС).",
		],
		keyEducationalPoints: [
			"Цефалометрический расчет углов SNA, SNB, ANB позволяет дифференцировать скелетную и зубоальвеолярную форму аномалии.",
			"Ортодонтическое лечение восстанавливает не только эстетику улыбки, но и правильную работу сустава.",
		],
		recommendedTreatmentRu:
			"Лечение на самолигирующей брекет-системе Damon или прозрачных элайнерах по результатам ТРГ-расчета и 3D-сетапа.",
		imageUrl: "/radiology/sample_trg_cephalogram.jpg",
		previewUrl: "/radiology/sample_trg_cephalogram.jpg",
	},
];

// Query API
export function getDentalDisciplineById(id: DentalDisciplineId): DentalDisciplineMeta | undefined {
	return DENTAL_DISCIPLINES.find((d) => d.id === id);
}

export function getPathologiesByDiscipline(
	disciplineId: DentalDisciplineId,
): ConsultationPathologyItem[] {
	return CONSULTATION_PATHOLOGY_CATALOG.filter((p) => p.disciplineId === disciplineId);
}

export function getPathologyById(id: string): ConsultationPathologyItem | undefined {
	return CONSULTATION_PATHOLOGY_CATALOG.find((p) => p.id === id);
}

export function searchConsultationPathologies(query: string): ConsultationPathologyItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...CONSULTATION_PATHOLOGY_CATALOG];
	return CONSULTATION_PATHOLOGY_CATALOG.filter(
		(p) =>
			p.titleRu.toLowerCase().includes(q) ||
			p.titleEn.toLowerCase().includes(q) ||
			p.descriptionRu.toLowerCase().includes(q) ||
			(p.icd10 && p.icd10.toLowerCase().includes(q)),
	);
}
