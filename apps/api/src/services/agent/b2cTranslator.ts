/**
 * b2cTranslator.ts — B2C Medical Treatment Translator for Dentalpin Agentic Core.
 *
 * Translates clinical dental terminology and Ministry of Health Order 804n nomenclature codes
 * into transparent, encouraging, patient-friendly Russian for the PWA patient mobile roadmap.
 *
 * Complies with:
 * - Order of the Ministry of Health of the Russian Federation No. 804n
 * - Federal Law No. 323-FZ (Right to accessible health information)
 * - Anti-jargon clinical communication standards (DENTE patient experience)
 */

import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../clinical/Icd10ClinicalValidator.js";

// ─── INTERFACES ─────────────────────────────────────────────────────────────

export interface B2cPlanItemInput {
	readonly code?: string | null | undefined;
	readonly title: string;
	readonly category?: string | null | undefined;
	readonly toothCode?: number | string | null | undefined;
	readonly quantity?: number | null | undefined;
}

export interface PatientTreatmentStep {
	readonly stepName: string;
	readonly patientDescription: string;
	readonly clinicalTerm?: string | undefined;
	readonly nomenclatureCode?: string | undefined;
	readonly toothLocalization?: string | undefined;
	readonly category?: string | undefined;
	readonly estimatedVisits?: number | undefined;
	readonly tipsForPatient?: string | undefined;
}

export interface B2cNomenclatureEntry {
	readonly code: string;
	readonly defaultStepName: string;
	readonly patientDescription: string;
	readonly category: string;
	readonly estimatedVisits: number;
	readonly tipsForPatient: string;
}

// ─── 804N NOMENCLATURE TRANSLATION DICTIONARY ──────────────────────────────

export const B2C_NOMENCLATURE_MAP: Readonly<Record<string, B2cNomenclatureEntry>> = {
	"A16.07.001": {
		code: "A16.07.001",
		defaultStepName: "Бережное удаление зуба",
		patientDescription:
			"Аккуратное и безболезненное удаление зуба под надежной современной анестезией. Врач обработает лунку антисептическим средством и при необходимости наложит рассасывающиеся швы для быстрого и комфортного заживления десны.",
		category: "Хирургия",
		estimatedVisits: 1,
		tipsForPatient:
			"В течение 2 часов воздержитесь от приема пищи и горячих напитков. Не полощите интенсивно полость рта в первые сутки, чтобы сохранить защитный кровяной сгусток.",
	},
	"A16.07.002": {
		code: "A16.07.002",
		defaultStepName: "Лечение кариеса и восстановление зуба пломбой",
		patientDescription:
			"Деликатное очищение зуба от кариозных поражений под местным обезболиванием и послойное восстановление анатомической формы зуба премиальным светоотверждаемым нанокомпозитом. Пломба полируется до зеркального блеска и полностью сливается с естественным цветом вашей эмали.",
		category: "Терапия",
		estimatedVisits: 1,
		tipsForPatient:
			"Материал затвердевает моментально под воздействием специальной лампы, поэтому пить воду можно сразу. Рекомендуется воздержаться от приема красящих продуктов (кофе, ягоды, свекла) в течение первых 24 часов.",
	},
	"A16.07.003": {
		code: "A16.07.003",
		defaultStepName: "Микропротезирование керамической вкладкой",
		patientDescription:
			"Высокоточное восстановление сильно разрушенного зуба индивидуальной керамической вкладкой, изготовленной в зуботехнической лаборатории. В отличие от обычной пломбы, вкладка идеально повторяет естественные бугры зуба и служит более 15 лет.",
		category: "Ортопедия",
		estimatedVisits: 2,
		tipsForPatient:
			"Процедура проходит в 2 визита: цифровое сканирование или снятие слепка на первом приеме, и надежная фиксация готовой вкладки на втором.",
	},
	"A16.07.004": {
		code: "A16.07.004",
		defaultStepName: "Установка защитной коронки на зуб",
		patientDescription:
			"Покрытие зуба сверхпрочной анатомической коронкой из безметалловой керамики E.max или диоксида циркония. Коронка защищает ослабленный зуб от раскалывания при жевании, полностью восстанавливает правильный прикус и безупречную эстетику улыбки.",
		category: "Ортопедия",
		estimatedVisits: 2,
		tipsForPatient:
			"На время изготовления постоянной коронки вам установят эстетичную временную защиту, поэтому зуб не будет реагировать на температурные раздражители.",
	},
	"A16.07.005": {
		code: "A16.07.005",
		defaultStepName: "Установка эстетического керамического винира",
		patientDescription:
			"Фиксация тончайшей керамической накладки на переднюю поверхность зуба. Винир устраняет сколы, микротрещины, неровности и стойкое потемнение эмали, создавая гармоничную «голливудскую» улыбку без агрессивной обточки зуба.",
		category: "Ортопедия",
		estimatedVisits: 2,
		tipsForPatient:
			"Керамика винира не впитывает пищевые красители (чай, кофе, красное вино) и сохраняет безупречный блеск на протяжении десятилетий.",
	},
	"A16.07.008": {
		code: "A16.07.008",
		defaultStepName: "Лечение и пломбирование корневых каналов (эндодонтия)",
		patientDescription:
			"Ювелирная очистка и антисептическая обработка корневых каналов зуба под операционным микроскопом с трехмерной герметизацией горячей гуттаперчей. Процедура полностью устраняет воспаление у верхушки корня (пульпит, периодонтит) и спасает зуб от удаления.",
		category: "Терапия",
		estimatedVisits: 1,
		tipsForPatient:
			"После лечения корневых каналов зуб может оставаться чувствительным при накусывании в течение 2–4 дней. Это естественная реакция окружающих тканей на заживление.",
	},
	"A16.07.019": {
		code: "A16.07.019",
		defaultStepName: "Шинирование подвижных зубов",
		patientDescription:
			"Надежное скрепление подвижных зубов тонкой высокопрочной стекловолоконной лентой с внутренней стороны. Процедура стабилизирует зубной ряд, равномерно распределяет жевательную нагрузку и предотвращает выпадение зубов при пародонтите.",
		category: "Пародонтология",
		estimatedVisits: 1,
		tipsForPatient:
			"Шина абсолютно незаметна при разговоре и улыбке. Рекомендуется использовать специальные ершики и ирригатор для гигиены межзубных промежутков.",
	},
	"A16.07.025": {
		code: "A16.07.025",
		defaultStepName: "Комплексное лечение десен и пародонта",
		patientDescription:
			"Глубокая бережная очистка поддесневых карманов и медикаментозная обработка тканей десны. Процедура устраняет кровоточивость, неприятный запах изо рта и купирует воспалительный процесс вокруг корней зубов.",
		category: "Пародонтология",
		estimatedVisits: 1,
		tipsForPatient:
			"Используйте мягкую зубную щетку и назначенный доктором антисептический ополаскиватель в течение первых 7 дней после процедуры.",
	},
	"A16.07.041": {
		code: "A16.07.041",
		defaultStepName: "Наращивание костной ткани (остеопластика)",
		patientDescription:
			"Хирургическая процедура увеличения объема и плотности челюстной кости с применением биосовместимых костных материалов и защитной коллагеновой мембраны. Создает надежный прочный фундамент для последующей пожизненной стабильности дентального имплантата.",
		category: "Хирургия",
		estimatedVisits: 1,
		tipsForPatient:
			"После процедуры прикладывайте холодный компресс к щеке с интервалами по 10 минут. Избегайте физических нагрузок, бани и сауны в течение 10–14 дней.",
	},
	"A16.07.048": {
		code: "A16.07.048",
		defaultStepName: "Ортодонтическое выравнивание зубного ряда и прикуса",
		patientDescription:
			"Установка индивидуально подобранной ортодонтической аппаратуры (брекет-системы или набора прозрачных кап-элайнеров) для мягкого и физиологичного перемещения зубов в правильное анатомическое положение.",
		category: "Ортодонтия",
		estimatedVisits: 1,
		tipsForPatient:
			"Привыкание к аппаратуре занимает от 3 до 7 дней. Соблюдайте рекомендации по гигиене с использованием специальных ортодонтических щеток.",
	},
	"A16.07.050": {
		code: "A16.07.050",
		defaultStepName: "Профессиональное осветление эмали (отбеливание зубов)",
		patientDescription:
			"Клиническое аппаратное отбеливание зубов с применением щадящего геля, активируемого холодным светом специальной лампы. Осветляет эмаль на 6–10 тонов по шкале VITA с последующим нанесением укрепляющего минерального состава.",
		category: "Гигиена",
		estimatedVisits: 1,
		tipsForPatient:
			"Соблюдайте «белую диету» (исключите чай, кофе, шоколад, томаты, красное вино и табачный дым) в течение первых 48 часов для закрепления максимального эффекта.",
	},
	"A16.07.051": {
		code: "A16.07.051",
		defaultStepName: "Комплексная профессиональная гигиена полости рта",
		patientDescription:
			"Трехэтапная гигиена: ультразвуковое удаление твердого зубного камня, мягкое очищение пигментированного налета водно-воздушной струей AirFlow с мелкодисперсным порошком и полировка зубов реминерализирующей пастой.",
		category: "Гигиена",
		estimatedVisits: 1,
		tipsForPatient:
			"Рекомендуется заменить старую зубную щетку на новую в день проведения чистки и повторять процедуру каждые 6 месяцев.",
	},
	"A16.07.054": {
		code: "A16.07.054",
		defaultStepName: "Установка дентального имплантата (искусственного корня)",
		patientDescription:
			"Высокоточная установка титанового биосовместимого имплантата в костную ткань челюсти. Имплантат полностью заменяет утраченный естественный корень зуба и обеспечивает пожизненную опору для будущей керамической коронки.",
		category: "Имплантация",
		estimatedVisits: 1,
		tipsForPatient:
			"Операция проходит абсолютно комфортно и безболезненно под глубокой местной анестезией. Принимайте назначенные врачом противовоспалительные препараты строго по графику.",
	},
	"A16.07.055": {
		code: "A16.07.055",
		defaultStepName: "Синус-лифтинг (поднятие дна гайморовой пазухи)",
		patientDescription:
			"Бережное микрохирургическое поднятие слизистой оболочки дна гайморовой пазухи на верхней челюсти и заполнение пространства остеопластическим материалом для создания достаточной высоты кости под установку имплантата.",
		category: "Хирургия",
		estimatedVisits: 1,
		tipsForPatient:
			"В течение первых 2 недель избегайте резкого сморкания, перелетов на самолете, глубоких погружений в воду и пейте напитки без использования трубочки.",
	},
	"A16.07.091": {
		code: "A16.07.091",
		defaultStepName: "Снятие старой коронки",
		patientDescription:
			"Деликатное снятие изношенной или негерметичной искусственной коронки с зуба с помощью ультразвукового или микроинструментального распила без повреждения подлежащих тканей опорного зуба.",
		category: "Ортопедия",
		estimatedVisits: 1,
		tipsForPatient:
			"После снятия старой коронки доктор проведет ревизию культи зуба и подготовит ее к изготовлению новой герметичной конструкции.",
	},
	"B01.065.001": {
		code: "B01.065.001",
		defaultStepName: "Первичный осмотр и комплексная консультация врача",
		patientDescription:
			"Всесторонний осмотр полости рта, оценка состояния десен, прикуса и ранее установленных конструкций. Врач составляет фотопротокол, анализирует рентгеновские снимки и формирует прозрачный пошаговый план лечения.",
		category: "Консультация",
		estimatedVisits: 1,
		tipsForPatient:
			"Подготовьте все интересующие вас вопросы по здоровью и эстетике улыбки — доктор подробно ответит на каждый из них.",
	},
	"A06.07.007": {
		code: "A06.07.007",
		defaultStepName: "Цифровая рентген-диагностика / 3D КЛКТ",
		patientDescription:
			"Высокоточная конусно-лучевая компьютерная томография (3D КЛКТ) или прицельный цифровой снимок с минимальной дозой излучения для детального изучения анатомии корней, каналов и костной ткани челюсти.",
		category: "Диагностика",
		estimatedVisits: 1,
		tipsForPatient:
			"Перед проведением томографии снимите металлические украшения, серьги, цепочки и съемные зубные протезы.",
	},
};

// ─── ANATOMICAL TOOTH LOCALIZATION HELPER ──────────────────────────────────

export function formatFdiToothLocalization(toothCode: number | string | null | undefined): string {
	if (toothCode === undefined || toothCode === null) {
		return "Полость рта / общий этап";
	}

	const num = typeof toothCode === "number" ? toothCode : Number.parseInt(String(toothCode).trim(), 10);
	if (Number.isNaN(num)) {
		return String(toothCode);
	}

	if (!VALID_FDI_PERMANENT_TEETH.has(num) && !VALID_FDI_PRIMARY_TEETH.has(num)) {
		return `Зуб ${num}`;
	}

	// Permanent teeth FDI quadrant mapping
	const permanentMap: Record<number, string> = {
		// Quadrant 1 (Upper Right)
		18: "Зуб 18 (верхний правый третий моляр / зуб мудрости)",
		17: "Зуб 17 (верхний правый второй моляр)",
		16: "Зуб 16 (верхний правый первый моляр)",
		15: "Зуб 15 (верхний правый второй премоляр)",
		14: "Зуб 14 (верхний правый первый премоляр)",
		13: "Зуб 13 (верхний правый клык — зона улыбки)",
		12: "Зуб 12 (верхний правый боковой резец — зона улыбки)",
		11: "Зуб 11 (верхний правый центральный резец — зона улыбки)",

		// Quadrant 2 (Upper Left)
		21: "Зуб 21 (верхний левый центральный резец — зона улыбки)",
		22: "Зуб 22 (верхний левый боковой резец — зона улыбки)",
		23: "Зуб 23 (верхний левый клык — зона улыбки)",
		24: "Зуб 24 (верхний левый первый премоляр)",
		25: "Зуб 25 (верхний левый второй премоляр)",
		26: "Зуб 26 (верхний левый первый моляр)",
		27: "Зуб 27 (верхний левый второй моляр)",
		28: "Зуб 28 (верхний левый третий моляр / зуб мудрости)",

		// Quadrant 3 (Lower Left)
		31: "Зуб 31 (нижний левый центральный резец)",
		32: "Зуб 32 (нижний левый боковой резец)",
		33: "Зуб 33 (нижний левый клык)",
		34: "Зуб 34 (нижний левый первый премоляр)",
		35: "Зуб 35 (нижний левый второй премоляр)",
		36: "Зуб 36 (нижний левый первый моляр)",
		37: "Зуб 37 (нижний левый второй моляр)",
		38: "Зуб 38 (нижний левый третий моляр / зуб мудрости)",

		// Quadrant 4 (Lower Right)
		41: "Зуб 41 (нижний правый центральный резец)",
		42: "Зуб 42 (нижний правый боковой резец)",
		43: "Зуб 43 (нижний правый клык)",
		44: "Зуб 44 (нижний правый первый премоляр)",
		45: "Зуб 45 (нижний правый второй премоляр)",
		46: "Зуб 46 (нижний правый первый моляр)",
		47: "Зуб 47 (нижний правый второй моляр)",
		48: "Зуб 48 (нижний правый третий моляр / зуб мудрости)",
	};

	if (permanentMap[num]) {
		return permanentMap[num];
	}

	if (VALID_FDI_PRIMARY_TEETH.has(num)) {
		return `Временный (молочный) зуб ${num}`;
	}

	return `Зуб ${num}`;
}

// ─── HEURISTIC CLINICAL TITLE TRANSLATOR ────────────────────────────────────

export function translateClinicalTermToB2c(title: string, category?: string | null): {
	stepName: string;
	patientDescription: string;
	tipsForPatient: string;
} {
	const t = title.toLowerCase();

	// 1. Consultations, checkups, and diagnostic examinations
	if (
		t.includes("консульт") ||
		t.includes("осмотр") ||
		t.includes("диагностик") ||
		t.includes("рентген") ||
		t.includes("клкт") ||
		t.includes("прицельн") ||
		t.includes("снимок") ||
		t.includes("визиограф") ||
		t.includes("фотопротокол")
	) {
		return {
			stepName: "Консультация и клиническая диагностика",
			patientDescription:
				"Детальная оценка состояния зубов и десен, анализ снимков и согласование комфортного пошагового плана лечения.",
			tipsForPatient: "Обсудите с врачом все пожелания по срокам, материалам и бюджету лечения.",
		};
	}

	// 2. Removal of old crowns, prosthetics, and suture removal (MUST be evaluated before crown installation keywords)
	const isRemovalVerb =
		t.includes("снятие") ||
		t.includes("удален") ||
		t.includes("демонтаж") ||
		t.includes("распил") ||
		t.includes("извлечен");

	if (isRemovalVerb && (t.includes("шв") || t.includes("шов"))) {
		return {
			stepName: "Снятие послеоперационных швов",
			patientDescription:
				"Безболезненное и аккуратное снятие швов после заживления десны с последующей антисептической обработкой тканей.",
			tipsForPatient: "Процедура занимает всего несколько минут и приносит мгновенное облегчение.",
		};
	}

	if (
		isRemovalVerb &&
		(t.includes("коронк") ||
			t.includes("протез") ||
			t.includes("мостовидн") ||
			t.includes("конструкц") ||
			t.includes("штифт") ||
			t.includes("вкладк"))
	) {
		return {
			stepName: "Снятие старой ортопедической конструкции",
			patientDescription:
				"Деликатное снятие изношенной или негерметичной коронки/протеза с зуба без повреждения подлежащих тканей опорного зуба.",
			tipsForPatient: "После снятия конструкции врач оценит состояние культи зуба для подготовки к новой реставрации.",
		};
	}

	// 3. Extractions and tooth removal (MUST be evaluated before implant/crown keywords)
	if (
		t.includes("удален") ||
		t.includes("экстракц") ||
		t.includes("резекц") ||
		t.includes("гемисекц") ||
		t.includes("ретинирован") ||
		t.includes("дистопирован")
	) {
		return {
			stepName: "Бережное удаление зуба",
			patientDescription:
				"Безболезненное удаление зуба с применением современных анестетиков и бережным сохранением костных стенок лунки.",
			tipsForPatient: "Не полощите рот в первые 24 часа, чтобы не вымыть защитный кровяной сгусток из лунки.",
		};
	}

	// 4. Anesthesia
	if (
		t.includes("анестези") ||
		t.includes("инфильтрац") ||
		t.includes("проводников") ||
		t.includes("обезболиван")
	) {
		return {
			stepName: "Местная анестезия и обезболивание",
			patientDescription:
				"Мягкое и глубокое обезболивание рабочей зоны премиальным анестетиком для 100% комфорта и отсутствия любых болезненных ощущений.",
			tipsForPatient: "Онемение проходит самостоятельно через 1.5–3 часа. Избегайте прикусывания губ и щек во время действия анестетика.",
		};
	}

	// 5. Sinus lift, bone grafting, and membranes (A16.07.055)
	if (
		t.includes("синус") ||
		t.includes("костн") ||
		t.includes("остеопластик") ||
		t.includes("мембран") ||
		t.includes("аугментац")
	) {
		return {
			stepName: "Наращивание костной ткани (синус-лифтинг / остеопластика)",
			patientDescription:
				"Хирургическая процедура увеличения объема и плотности челюстной кости для создания надежного фундамента под установку дентального имплантата.",
			tipsForPatient: "Избегайте физических нагрузок, перелетов на самолете и перегрева в течение первых 10–14 дней.",
		};
	}

	// 6. Implant installations
	if (
		t.includes("имплант") ||
		t.includes("имплантац") ||
		t.includes("абатмент") ||
		t.includes("формировател")
	) {
		return {
			stepName: "Установка дентального имплантата",
			patientDescription:
				"Хирургическая установка надежного титанового имплантата для восстановления отсутствующего зуба. Процедура проводится под современной анестезией и обеспечивает полноценное приживление.",
			tipsForPatient: "Следуйте рекомендациям врача по приему медикаментов и гигиене полости рта в первые дни.",
		};
	}

	// 7. Crowns, bridges, and prosthetics
	if (
		t.includes("коронк") ||
		t.includes("протез") ||
		t.includes("мостовидн") ||
		t.includes("бюгель") ||
		t.includes("культев")
	) {
		return {
			stepName: "Установка ортопедической коронки / протеза",
			patientDescription:
				"Фиксация анатомической керамической или циркониевой коронки для восстановления формы, прочности и естественной эстетики зуба.",
			tipsForPatient: "На время ожидания постоянной конструкции вам будет установлена временная защитная коронка.",
		};
	}

	// 8. Veneers and inlays
	if (t.includes("винир") || t.includes("люминир") || t.includes("вкладк")) {
		return {
			stepName: "Установка эстетического винира / керамической вкладки",
			patientDescription:
				"Установка тонкой керамической накладки на переднюю поверхность зуба для создания гармоничной формы и красивого цвета улыбки.",
			tipsForPatient: "Керамический винир не меняет цвет со временем и обеспечивает естественный блеск.",
		};
	}

	// 9. Endodontics (Root canals)
	if (
		t.includes("пульпит") ||
		t.includes("периодонтит") ||
		t.includes("канал") ||
		t.includes("эндодонт") ||
		t.includes("распломбиров")
	) {
		return {
			stepName: "Лечение корневых каналов зуба (эндодонтия)",
			patientDescription:
				"Качественная очистка, антисептическая обработка и трехмерная пломбировка корневых каналов зуба для устранения очага воспаления.",
			tipsForPatient: "В первые 2–3 дня возможна умеренная чувствительность при накусывании, которая постепенно проходит.",
		};
	}

	// 10. Caries and composite restorations
	if (
		t.includes("кариес") ||
		t.includes("пломб") ||
		t.includes("реставрац") ||
		t.includes("нанокомпозит")
	) {
		return {
			stepName: "Лечение кариеса и реставрация зуба",
			patientDescription:
				"Бережное удаление пораженных тканей зуба и восстановление его естественной анатомии эстетичным светоотверждаемым пломбировочным материалом.",
			tipsForPatient: "Материал полностью полимеризован, однако рекомендуется избегать красящих продуктов в первые сутки.",
		};
	}

	// 11. Periodontics and gum therapy
	if (
		t.includes("пародонт") ||
		t.includes("десн") ||
		t.includes("кюретаж") ||
		t.includes("гингивит") ||
		t.includes("шинирован")
	) {
		return {
			stepName: "Комплексное лечение десен и пародонта",
			patientDescription:
				"Глубокая бережная очистка десневых карманов и медикаментозная обработка тканей десны для устранения воспаления и кровоточивости.",
			tipsForPatient: "Используйте мягкую щетку и назначенный антисептический ополаскиватель.",
		};
	}

	// 12. Hygiene and professional cleaning
	if (
		t.includes("гигиен") ||
		t.includes("чистк") ||
		t.includes("air flow") ||
		t.includes("airflow") ||
		t.includes("ультразвук")
	) {
		return {
			stepName: "Комплексная профессиональная гигиена",
			patientDescription:
				"Удаление твердого зубного камня ультразвуком, устранение пигментированного налета водно-воздушной струей AirFlow и реминерализация эмали.",
			tipsForPatient: "Замените зубную щетку на новую и соблюдайте регулярную гигиену каждые 6 месяцев.",
		};
	}

	// 13. Whitening
	if (
		t.includes("отбеливан") ||
		t.includes("zoom") ||
		t.includes("flash") ||
		t.includes("осветлен")
	) {
		return {
			stepName: "Профессиональное отбеливание зубов",
			patientDescription:
				"Клиническое осветление эмали зубов на несколько тонов с применением безопасного геля и активирующего холодного света.",
			tipsForPatient: "Соблюдайте «белую диету» в течение 48 часов после процедуры.",
		};
	}

	// 14. Orthodontics
	if (
		t.includes("брекет") ||
		t.includes("элайнер") ||
		t.includes("прикус") ||
		t.includes("ортодонт") ||
		t.includes("капп")
	) {
		return {
			stepName: "Ортодонтическое лечение и исправление прикуса",
			patientDescription:
				"Плавное и физиологичное перемещение зубов в правильное положение с помощью современной брекет-системы или прозрачных кап.",
			tipsForPatient: "Посещайте плановые активации аппаратуры в соответствии с графиком врача-ортодонта.",
		};
	}

	// Fallback description based on category or raw title
	const cleanTitle = title.trim();
	const cat = category || "Стоматологическая помощь";
	return {
		stepName: cleanTitle,
		patientDescription: `Медицинская процедура в категории «${cat}». Выполняется опытным специалистом клиники DENTE в комфортных условиях с соблюдением международных стандартов безопасности.`,
		tipsForPatient: "Следуйте персональным указаниям вашего лечащего врача.",
	};
}

// ─── MAIN B2C TRANSLATION ENGINE ───────────────────────────────────────────

/**
 * Translates a treatment plan or list of clinical procedures into clear, accessible Russian for patients.
 */
export async function translateTreatmentPlanToPatientLanguage(
	items: Array<{
		code?: string | null | undefined;
		title: string;
		category?: string | null | undefined;
		toothCode?: number | string | null | undefined;
		quantity?: number | null | undefined;
	}>,
): Promise<Array<{ stepName: string; patientDescription: string }>> {
	const result: Array<{ stepName: string; patientDescription: string }> = [];

	for (const item of items) {
		const rawCode = item.code?.trim();
		const rawTitle = item.title?.trim() || "Медицинская услуга";
		const toothLoc = formatFdiToothLocalization(item.toothCode);

		let stepName: string;
		let patientDescription: string;

		// 1. Check exact 804n code map
		if (rawCode && B2C_NOMENCLATURE_MAP[rawCode]) {
			const entry = B2C_NOMENCLATURE_MAP[rawCode];
			stepName = item.toothCode !== undefined && item.toothCode !== null
				? `${entry.defaultStepName} — ${toothLoc}`
				: entry.defaultStepName;
			patientDescription = entry.patientDescription;
		} else {
			// 2. Fallback to heuristic clinical terminology translator
			const heur = translateClinicalTermToB2c(rawTitle, item.category);
			stepName = item.toothCode !== undefined && item.toothCode !== null
				? `${heur.stepName} — ${toothLoc}`
				: heur.stepName;
			patientDescription = heur.patientDescription;
		}

		result.push({
			stepName,
			patientDescription,
		});
	}

	return result;
}

/**
 * Translates an item into a rich step structure including tips, category, and visit estimates.
 */
export function translateTreatmentItemToRichStep(item: B2cPlanItemInput): PatientTreatmentStep {
	const rawCode = item.code?.trim();
	const rawTitle = item.title?.trim() || "Медицинская услуга";
	const toothLoc = formatFdiToothLocalization(item.toothCode);

	if (rawCode && B2C_NOMENCLATURE_MAP[rawCode]) {
		const entry = B2C_NOMENCLATURE_MAP[rawCode];
		const stepName = item.toothCode !== undefined && item.toothCode !== null
			? `${entry.defaultStepName} — ${toothLoc}`
			: entry.defaultStepName;

		return {
			stepName,
			patientDescription: entry.patientDescription,
			clinicalTerm: rawTitle,
			nomenclatureCode: entry.code,
			toothLocalization: toothLoc,
			category: entry.category,
			estimatedVisits: entry.estimatedVisits,
			tipsForPatient: entry.tipsForPatient,
		};
	}

	const heur = translateClinicalTermToB2c(rawTitle, item.category);
	const stepName = item.toothCode !== undefined && item.toothCode !== null
		? `${heur.stepName} — ${toothLoc}`
		: heur.stepName;

	return {
		stepName,
		patientDescription: heur.patientDescription,
		clinicalTerm: rawTitle,
		nomenclatureCode: rawCode ?? undefined,
		toothLocalization: toothLoc,
		category: item.category ?? undefined,
		estimatedVisits: 1,
		tipsForPatient: heur.tipsForPatient,
	};
}
