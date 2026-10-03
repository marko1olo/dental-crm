/**
 * DENTE CRM — EzDent-i Consultation Pathology & Educational Library
 * Canonical 8 Dental Disciplines and clinical sample cases for chairside patient consultation.
 *
 * Grounded in:
 * - Vatech EzDent-i Screenshot 25 (Consultation Split View) & Screenshot 26 (Category Dropdown)
 * - docs/vatech_research/10_EZDENT_REAL_UI_TELEGRAM_SCREENSHOTS_AUDIT.md (§2.9)
 * - docs/vatech_research/12_EZDENT_CONSULTATION_AND_REPORT_ENGINE.md (§2.2)
 *
 * Invariants: Zero Mocks; Strict Typing; Offline SVG schematics for robust presentation.
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
	readonly previewSvg: string; // Clean vector clinical schematic
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
		descriptionRu: "Культевые вкладки, коронки из диоксида циркония, виниры E.max, мостовидные и бюгельные протезы.",
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
		descriptionRu: "Этапы установки имплантата, остеоинтеграция, костная пластика GBR, открытый и закрытый синус-лифтинг.",
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

// Helper to generate crisp SVG clinical schematics for offline chairside demonstration
function createSvgDataUri(innerSvg: string): string {
	const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%" style="background:#090d16;">${innerSvg}</svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}

export const CONSULTATION_PATHOLOGY_CATALOG: readonly ConsultationPathologyItem[] = [
	// ═══════════════════════════════════════════════════════════════════
	// 1. CONSERVATIVE DENTISTRY (Терапия и эндодонтия)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "cons_caries_progression",
		disciplineId: "conservative",
		code: "CONS-01",
		titleRu: "Стадии кариозного процесса (Пятно → Эмаль → Дентин)",
		titleEn: "Dental Caries Progression",
		icd10: "K02.1",
		descriptionRu:
			"Прогрессирование деминерализации твердых тканей зуба от стадии белого пятна до глубокого кариеса с риском проникновения инфекции в пульпарную камеру.",
		stages: [
			"1. Начальный кариес (пятно): очаговая деминерализация эмали без полости.",
			"2. Поверхностный кариес: дефект в пределах эмалево-дентинной границы.",
			"3. Средний кариес: вовлечение плащевого дентина, чувствительность к сладкому/холодному.",
			"4. Глубокий кариес: тонкий слой околопульпарного дентина над сосудисто-нервным пучком.",
		],
		keyEducationalPoints: [
			"Кариес дентина разрушает ткани изнутри быстрее, чем видна внешняя полость.",
			"Своевременное пломбирование предотвращает необходимость депульпирования (удаления нерва).",
		],
		recommendedTreatmentRu: "Препарирование полости с сохранением жизнеспособности пульпы, композитная реставрация светового отверждения с адгезивным протоколом IV/VII поколения.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#10b981" font-size="14" font-weight="bold" font-family="sans-serif">КАРИЕС: ДИНАМИКА РАЗРУШЕНИЯ</text>
			<!-- Tooth crown -->
			<path d="M 120 70 Q 200 40 280 70 Q 300 130 270 200 Q 230 260 200 270 Q 170 260 130 200 Q 100 130 120 70 Z" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
			<!-- Pulp chamber -->
			<path d="M 170 120 Q 200 90 230 120 Q 220 180 205 250 Q 195 250 180 180 Z" fill="#ef4444" opacity="0.85"/>
			<text x="200" y="160" fill="#ffffff" font-size="10" text-anchor="middle" font-family="sans-serif">Пульпа</text>
			<!-- Caries lesion into dentin -->
			<path d="M 230 75 Q 260 90 240 125 Q 215 110 230 75 Z" fill="#78350f" stroke="#f59e0b" stroke-width="2"/>
			<circle cx="235" cy="105" r="4" fill="#ef4444"/>
			<!-- Annotations -->
			<line x1="250" y1="100" x2="330" y2="100" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3"/>
			<text x="335" y="104" fill="#fbbf24" font-size="11" font-family="sans-serif">Кариозная полость</text>
			<text x="335" y="118" fill="#94a3b8" font-size="9" font-family="sans-serif">(риск пульпита)</text>
		`),
	},
	{
		id: "cons_root_canal_obturation",
		disciplineId: "conservative",
		code: "CONS-02",
		titleRu: "Обтурация корневых каналов (Гуттаперча + Силер)",
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
		recommendedTreatmentRu: "Эндодонтическое лечение с применением операционного микроскопа и ультразвуковой активацией антисептика, контрольная RVG-визиография.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#10b981" font-size="14" font-weight="bold" font-family="sans-serif">ОБТУРАЦИЯ КОРНЕВЫХ КАНАЛОВ</text>
			<!-- Molar roots -->
			<path d="M 120 80 Q 200 60 280 80 L 265 140 Q 285 240 250 270 Q 235 240 220 160 Q 200 160 180 160 Q 165 240 150 270 Q 115 240 135 140 Z" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
			<!-- Obturated root canals in bright pink gutta-percha -->
			<path d="M 152 265 Q 162 210 178 145 L 186 145 Q 170 210 156 265 Z" fill="#ec4899" stroke="#f472b6" stroke-width="1.5"/>
			<path d="M 248 265 Q 238 210 222 145 L 214 145 Q 230 210 244 265 Z" fill="#ec4899" stroke="#f472b6" stroke-width="1.5"/>
			<circle cx="152" cy="268" r="3" fill="#00C853"/>
			<circle cx="248" cy="268" r="3" fill="#00C853"/>
			<!-- Apex labels -->
			<line x1="255" y1="268" x2="310" y2="268" stroke="#00C853" stroke-width="1.5"/>
			<text x="315" y="272" fill="#4ade80" font-size="10" font-family="sans-serif">Апекс 100%</text>
			<text x="315" y="160" fill="#f472b6" font-size="10" font-family="sans-serif">Гуттаперча + Силер</text>
		`),
	},
	{
		id: "cons_periapical_granuloma",
		disciplineId: "conservative",
		code: "CONS-03",
		titleRu: "Периапикальный периодонтит (Гранулема у верхушки)",
		titleEn: "Periapical Periodontitis & Granuloma",
		icd10: "K04.5",
		descriptionRu:
			"Хронический очаг деструкции губчатой кости округлой формы у апекса корня вследствие токсического действия микрофлоры некротизированного корневого канала.",
		stages: [
			"1. Гибель пульпы при нелеченом глубоком кариесе.",
			"2. Выход токсинов за верхушечное отверстие корня.",
			"3. Лизис кортикальной пластинки и образование грануляционной ткани (радиус >3 мм).",
			"4. Риск обострения с отеком переходной складки (периостит / флюс).",
		],
		keyEducationalPoints: [
			"Очаг деструкции часто протекает бессимптомно («мина замедленного действия»).",
			"Качественная хемомеханическая обработка ведет к регенерации костной ткани за 6–12 месяцев.",
		],
		recommendedTreatmentRu: "Повторное эндодонтическое лечение с временной обтурацией пастой на основе гидроксида кальция Ca(OH)2 на 14–21 день, контроль костной репарации на КТ через 6 мес.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#ef4444" font-size="14" font-weight="bold" font-family="sans-serif">ПЕРИАПИКАЛЬНЫЙ ОЧАГ (ГРАНУЛЕМА)</text>
			<!-- Root -->
			<path d="M 170 60 L 230 60 L 215 220 Q 200 240 185 220 Z" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
			<!-- Infected canal -->
			<line x1="200" y1="70" x2="200" y2="230" stroke="#78350f" stroke-width="4"/>
			<!-- Periapical destruction halo -->
			<circle cx="200" cy="245" r="26" fill="rgba(239, 68, 68, 0.35)" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,3"/>
			<circle cx="200" cy="245" r="14" fill="#ef4444" opacity="0.6"/>
			<!-- Annotations -->
			<line x1="230" y1="245" x2="310" y2="245" stroke="#ef4444" stroke-width="1.5"/>
			<text x="315" y="242" fill="#f87171" font-size="11" font-weight="bold" font-family="sans-serif">Очаг деструкции</text>
			<text x="315" y="256" fill="#94a3b8" font-size="9" font-family="sans-serif">Ø 4.5 мм в кости</text>
		`),
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
			"2. Изготовление разборной/неразборной культевой вкладки из Co-Cr или оксида циркония.",
			"3. Препарирование зуба с прецизионным уступом типа Chamfer (скругленный уступ).",
			"4. Фиксация циркониевой коронки на композитный цемент двойного отверждения.",
		],
		keyEducationalPoints: [
			"Восстанавливает 100% жевательной эффективности и анатомический контактный пункт.",
			"Защищает ослабленные депульпированные стенки зуба от продольного перелома корня.",
		],
		recommendedTreatmentRu: "Изготовление культевой вкладки Co-Cr + цельнофрезерованная коронка ZrO2 Multi-Layer по технологии CAD/CAM.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#06b6d4" font-size="14" font-weight="bold" font-family="sans-serif">ЦИРКОНИЕВАЯ КОРОНКА (ZrO2)</text>
			<!-- Natural root in bone -->
			<path d="M 160 140 L 240 140 L 220 270 Q 200 285 180 270 Z" fill="#334155" stroke="#64748b" stroke-width="2"/>
			<!-- Cast post inside canal -->
			<path d="M 180 140 L 220 140 L 208 220 L 192 220 Z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1.5"/>
			<rect x="175" y="115" width="50" height="25" rx="3" fill="#cbd5e1"/>
			<!-- Zirconia Crown -->
			<path d="M 150 70 Q 200 45 250 70 Q 265 115 255 145 L 145 145 Q 135 115 150 70 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2.5"/>
			<text x="200" y="95" fill="#0369a1" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">ZrO2 Коронка</text>
			<!-- Margin Chamfer -->
			<circle cx="145" cy="145" r="4" fill="#38bdf8"/>
			<circle cx="255" cy="145" r="4" fill="#38bdf8"/>
			<text x="270" y="148" fill="#38bdf8" font-size="10" font-family="sans-serif">Круговой уступ</text>
		`),
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
		recommendedTreatmentRu: "Эстетическая реабилитация фронтального отдела 6–10 винирами E.max с сохранением витальности зубов.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#06b6d4" font-size="14" font-weight="bold" font-family="sans-serif">КЕРАМИЧЕСКИЙ ВИНИР E.MAX</text>
			<!-- Incisor profile -->
			<path d="M 170 70 Q 230 80 230 160 L 215 270 Q 195 280 185 270 L 170 160 Z" fill="#334155" stroke="#64748b" stroke-width="2"/>
			<!-- Thin facial veneer layer -->
			<path d="M 166 70 Q 155 100 156 160 L 168 160 Q 166 100 174 70 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
			<!-- Thickness label -->
			<line x1="130" y1="110" x2="160" y2="110" stroke="#0284c7" stroke-width="1.5"/>
			<text x="50" y="114" fill="#38bdf8" font-size="10" font-family="sans-serif">Толщина 0.3-0.5 мм</text>
			<text x="200" y="200" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">Живой зуб сохранен</text>
		`),
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
		recommendedTreatmentRu: "Закрытый кюретаж пародонтальных карманов зоной аппарата Vector / Gracey кюретами, фотодинамическая терапия, противовоспалительный курс.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#f59e0b" font-size="14" font-weight="bold" font-family="sans-serif">ПАРОДОНТИТ: УБЫЛЬ КОСТНОЙ ТКАНИ</text>
			<!-- Normal bone line vs Resorbed bone line -->
			<line x1="80" y1="120" x2="320" y2="120" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3"/>
			<text x="250" y="115" fill="#34d399" font-size="9" font-family="sans-serif">Нормальный уровень кости</text>
			<!-- Actual resorbed bone level -->
			<path d="M 80 180 Q 140 190 200 185 Q 260 180 320 185 L 320 290 L 80 290 Z" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
			<!-- Tooth roots -->
			<path d="M 160 80 L 240 80 L 220 260 Q 200 270 180 260 Z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
			<!-- Subgingival Calculus -->
			<polygon points="155,140 162,150 157,160 150,150" fill="#f59e0b"/>
			<!-- Pocket depth measurement -->
			<line x1="140" y1="120" x2="140" y2="185" stroke="#ef4444" stroke-width="2"/>
			<text x="90" y="155" fill="#ef4444" font-size="10" font-weight="bold" font-family="sans-serif">Карман 5 мм</text>
		`),
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
			"2. Атравматичное формирование костного ложа с ирригацией физраствором.",
			"3. Вкручивание имплантата с торком 35–45 Н·см и установка заглушки/формирователя десны.",
			"4. Остеоинтеграция: фиксация индивидуального абатмента и коронки с винтовой шахтой.",
		],
		keyEducationalPoints: [
			"Имплантат предотвращает атрофию челюстной кости, распределяя нагрузку естественным образом.",
			"Соседние здоровые зубы не обтачиваются под мостовидный протез.",
		],
		recommendedTreatmentRu: "Установка дентального имплантата (Osstem/Dentium/Straumann), пластика мягких тканей десневым трансплантатом, циркониевая коронка.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#8b5cf6" font-size="14" font-weight="bold" font-family="sans-serif">ДЕНТАЛЬНЫЙ ИМПЛАНТАТ В КОСТИ</text>
			<!-- Alveolar bone block -->
			<rect x="100" y="110" width="200" height="170" rx="8" fill="#1e293b" stroke="#475569" stroke-width="2"/>
			<!-- Titanium implant body with threads -->
			<path d="M 180 110 L 220 110 L 214 230 Q 200 245 186 230 Z" fill="#64748b" stroke="#cbd5e1" stroke-width="2"/>
			<line x1="181" y1="130" x2="219" y2="130" stroke="#cbd5e1" stroke-width="2"/>
			<line x1="183" y1="150" x2="217" y2="150" stroke="#cbd5e1" stroke-width="2"/>
			<line x1="185" y1="170" x2="215" y2="170" stroke="#cbd5e1" stroke-width="2"/>
			<line x1="187" y1="190" x2="213" y2="190" stroke="#cbd5e1" stroke-width="2"/>
			<!-- Abutment and Crown -->
			<polygon points="186,110 214,110 220,80 180,80" fill="#94a3b8"/>
			<path d="M 160 50 Q 200 35 240 50 Q 250 80 240 85 L 160 85 Q 150 80 160 50 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
			<text x="200" y="65" fill="#0369a1" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">Коронка</text>
			<text x="310" y="180" fill="#a78bfa" font-size="10" font-family="sans-serif">Остеоинтеграция</text>
			<line x1="220" y1="175" x2="305" y2="175" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="2,2"/>
		`),
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
		recommendedTreatmentRu: "Открытый/закрытый синус-лифтинг с одновременной или отсроченной установкой имплантатов через 4–6 месяцев.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#8b5cf6" font-size="14" font-weight="bold" font-family="sans-serif">СИНУС-ЛИФТИНГ (ГАЙМОРОВА ПАЗУХА)</text>
			<!-- Maxillary sinus cavity -->
			<path d="M 80 80 Q 200 130 320 80 L 320 250 L 80 250 Z" fill="#1e293b"/>
			<!-- Bone graft volume -->
			<path d="M 120 160 Q 200 135 280 160 L 280 230 L 120 230 Z" fill="#d97706" opacity="0.6"/>
			<!-- Implant traversing native bone and graft -->
			<rect x="185" y="145" width="30" height="95" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
			<text x="200" y="115" fill="#60a5fa" font-size="11" text-anchor="middle" font-family="sans-serif">Гайморова пазуха</text>
			<text x="200" y="215" fill="#fef3c7" font-size="9" text-anchor="middle" font-family="sans-serif">Костный трансплантат</text>
		`),
	},

	// ═══════════════════════════════════════════════════════════════════
	// 5. ORAL SURGERY (Хирургическая стоматология)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "surg_impacted_wisdom_tooth",
		disciplineId: "oral_surgery",
		code: "SURG-01",
		titleRu: "Ретенированный дистопированный третий моляр (Зуб 3.8 / 4.8)",
		titleEn: "Impacted Third Molar (Wisdom Tooth)",
		icd10: "K01.1",
		descriptionRu:
			"Горизонтальное или мезиальное залегание непрорезавшегося зуба мудрости с упором коронки в шейку 7-го зуба и опасной близостью к нижнечелюстному каналу.",
		stages: [
			"1. Сдавление корней соседнего 7-го зуба с развитием резорбции и кариеса корня.",
			"2. Формирование перикоронального воспалительного кармана (перикоронит).",
			"3. Риск образования фолликулярной кисты вокруг коронки 8-го зуба.",
			"4. Смещение фронтальных зубов и скученность из-за давления зубного ряда.",
		],
		keyEducationalPoints: [
			"Зуб мудрости упирается в корень соседнего жизненно важного зуба, разрушая его.",
			"Близость к мандибулярному нерву требует точного контроля на КЛКТ перед удалением.",
		],
		recommendedTreatmentRu: "Атравматичное удаление ретинированного зуба с сегментацией коронки пьезотомом под местной проводниковой анестезией.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#ef4444" font-size="14" font-weight="bold" font-family="sans-serif">РЕТИНИРОВАННЫЙ ЗУБ МУДРОСТИ (8-КА)</text>
			<!-- Normal 7th molar -->
			<path d="M 120 70 L 180 70 L 170 210 Q 150 220 130 210 Z" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
			<!-- Horizontally impacted 8th molar hitting the 7th -->
			<g transform="rotate(75, 230, 160)">
				<path d="M 200 120 L 260 120 L 250 240 Q 230 250 210 240 Z" fill="#7f1d1d" stroke="#ef4444" stroke-width="2.5"/>
			</g>
			<!-- Mandibular nerve canal -->
			<path d="M 80 250 Q 200 240 340 255" stroke="#f59e0b" stroke-width="5" fill="none"/>
			<text x="240" y="275" fill="#fbbf24" font-size="10" font-family="sans-serif">Нижнечелюстной нерв</text>
			<!-- Danger contact arrow -->
			<circle cx="178" cy="140" r="10" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,2"/>
			<text x="260" y="110" fill="#fca5a5" font-size="10" font-family="sans-serif">Упор в 7-й зуб</text>
		`),
	},

	// ═══════════════════════════════════════════════════════════════════
	// 6. PEDODONTICS (Детская стоматология)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "pedo_physiologic_resorption",
		disciplineId: "pedodontics",
		code: "PEDO-01",
		titleRu: "Физиологическая смена молочных зубов и зачатки постоянных",
		titleEn: "Primary Tooth Resorption & Permanent Tooth Germ",
		icd10: "K00.6",
		descriptionRu:
			"Естественное рассасывание корней временных (молочных) зубов под давлением растущего фолликула постоянного зуба в сменном прикусе.",
		stages: [
			"1. Рост зачатка постоянного зуба между корнями молочного.",
			"2. Равномерное рассасывание корней молочного зуба остеокластами.",
			"3. Физиологическое выпадение коронки молочного зуба без травмы.",
			"4. Прорезывание постоянного зуба на освободившееся место.",
		],
		keyEducationalPoints: [
			"Преждевременное удаление молочного зуба без удерживателя места ведет к блокированию постоянного.",
			"Инфекция на корне молочного зуба может повредить эмаль зачатка постоянного зуба.",
		],
		recommendedTreatmentRu: "Контроль ортопанорамного снимка (ОПТГ), санация молочных зубов, при раннем удалении — установка удерживателя пространства (Space Maintainer).",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#ec4899" font-size="14" font-weight="bold" font-family="sans-serif">СМЕНА ПРИКУСА: МОЛОЧНЫЙ И ПОСТОЯННЫЙ</text>
			<!-- Primary tooth with resorbed roots -->
			<path d="M 160 50 L 220 50 L 210 120 L 170 120 Z" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
			<text x="190" y="80" fill="#ffffff" font-size="9" text-anchor="middle" font-family="sans-serif">Молочный</text>
			<!-- Permanent tooth germ below -->
			<circle cx="190" cy="200" r="35" fill="#831843" stroke="#ec4899" stroke-width="2"/>
			<text x="190" y="204" fill="#fbcfe8" font-size="9" text-anchor="middle" font-family="sans-serif">Зачаток</text>
			<text x="245" y="195" fill="#f472b6" font-size="10" font-family="sans-serif">Постоянный зуб</text>
			<line x1="225" y1="195" x2="240" y2="195" stroke="#f472b6" stroke-width="1.5"/>
		`),
	},

	// ═══════════════════════════════════════════════════════════════════
	// 7. ORAL MEDICINE (Заболевания слизистой оболочки рта)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "med_aphthous_stomatitis",
		disciplineId: "oral_medicine",
		code: "MED-01",
		titleRu: "Рецидивирующий афтозный стоматит слизистой",
		titleEn: "Recurrent Aphthous Stomatitis",
		icd10: "K12.0",
		descriptionRu:
			"Болезненная эрозия круглой или овальной формы с гиперемированным воспалительным венчиком и фибринозным желтовато-белым налетом в центре.",
		stages: [
			"1. Продромальный период: покалывание и гиперемия участка слизистой.",
			"2. Образование болезненной язвочки (афты) диаметром 3–7 мм.",
			"3. Фибринозная экссудация и эпителизация в течение 7–10 дней.",
		],
		keyEducationalPoints: [
			"Связано со снижением местного иммунитета, дефицитом железа/витаминов B или микротравмами.",
			"Исключает раздражающую острую пищу, требует антисептической обработки.",
		],
		recommendedTreatmentRu: "Местная анестезия гелем с лидокаином, антисептические полоскания (хлоргексидин 0.05%), эпителизирующие мази (Солкосерил/Асепта).",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#14b8a6" font-size="14" font-weight="bold" font-family="sans-serif">АФТОЗНЫЙ СТОМАТИТ: ЭРОЗИЯ СЛИЗИСТОЙ</text>
			<!-- Oral mucosa background -->
			<rect x="60" y="70" width="280" height="180" rx="12" fill="#881337" opacity="0.6"/>
			<!-- Aphthous ulcer: Red halo + Yellow fibrinous center -->
			<circle cx="200" cy="160" r="45" fill="#be123c"/>
			<circle cx="200" cy="160" r="30" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
			<text x="200" y="164" fill="#713f12" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">Фибрин</text>
			<text x="270" y="140" fill="#fda4af" font-size="10" font-family="sans-serif">Венчик гиперемии</text>
			<line x1="240" y1="145" x2="265" y2="140" stroke="#fda4af" stroke-width="1.5"/>
		`),
	},

	// ═══════════════════════════════════════════════════════════════════
	// 8. ORTHODONTICS (Ортодонтия)
	// ═══════════════════════════════════════════════════════════════════
	{
		id: "ortho_class2_malocclusion",
		disciplineId: "orthodontics",
		code: "ORTHO-01",
		titleRu: "Дистальный прикус (Класс II по Энглю): Протрузия резцов",
		titleEn: "Angle Class II Malocclusion",
		icd10: "M26.2",
		descriptionRu:
			"Аномалия соотношения зубных рядов, при которой мезиально-щечный бугор первого моляра верхней челюсти смыкается впереди межбугорковой фиссуры первого моляра нижней челюсти.",
		stages: [
			"1. Сагиттальная щель между резцами >5 мм.",
			"2. Травматический глубокий прикус с повреждением нёбной десны.",
			"3. Нарушение профиля лица (ретрогения, скошенный подбородок).",
			"4. Перегрузка височно-нижнечелюстного сустава (ВНЧС).",
		],
		keyEducationalPoints: [
			"Неправильный прикус вызывает патологическую стираемость зубов и дисфункцию ВНЧС.",
			"Брекет-система или элайнеры нормализуют профиль лица и осанку.",
		],
		recommendedTreatmentRu: "Ортодонтическое лечение на самолигирующей брекет-системе Damon или серии прозрачных капп (элайнеров) с последующей ретенцией.",
		previewSvg: createSvgDataUri(`
			<rect width="400" height="300" fill="#0b1120"/>
			<text x="20" y="30" fill="#3b82f6" font-size="14" font-weight="bold" font-family="sans-serif">ДИСТАЛЬНЫЙ ПРИКУС (II КЛАСС ЭНГЛЯ)</text>
			<!-- Upper incisor jutting forward -->
			<path d="M 120 70 L 170 70 L 210 160 L 170 160 Z" fill="#334155" stroke="#60a5fa" stroke-width="2"/>
			<!-- Lower incisor set back -->
			<path d="M 120 230 L 160 230 L 150 150 L 120 150 Z" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
			<!-- Overjet measurement line -->
			<line x1="210" y1="160" x2="150" y2="160" stroke="#f59e0b" stroke-width="2.5"/>
			<text x="180" y="180" fill="#fbbf24" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">Сагиттальная щель 6 мм</text>
		`),
	},
];

// Query API
export function getDentalDisciplineById(id: DentalDisciplineId): DentalDisciplineMeta | undefined {
	return DENTAL_DISCIPLINES.find((d) => d.id === id);
}

export function getPathologiesByDiscipline(disciplineId: DentalDisciplineId): ConsultationPathologyItem[] {
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
