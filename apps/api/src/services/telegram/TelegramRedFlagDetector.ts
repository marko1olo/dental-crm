/**
 * TelegramRedFlagDetector.ts
 *
 * Клинический детектор красных флагов и жизнеугрожающих осложнений
 * в сообщениях и послеоперационных анкетах пациентов клиники DENTE.
 *
 * Анализирует 4 критических хирургических синдрома:
 * 1. FEVER_CRITICAL: Температура выше 38.2°C (септический риск, острый остеомиелит).
 * 2. PROLONGED_BLEEDING: Неостанавливающееся кровотечение > 3 часов.
 * 3. NERVE_PARESTHESIA: Онемение губы / подбородка (компрессия n. alveolaris inferior!).
 * 4. LUDWIG_ANGINA_RISK: Плотный отёк шеи / дна полости рта / тризм / дисфагия (угроза ангины Людвига!).
 */

export type RedFlagCode =
	| "FEVER_CRITICAL"
	| "PROLONGED_BLEEDING"
	| "NERVE_PARESTHESIA"
	| "LUDWIG_ANGINA_RISK";

export type RedFlagSeverity = "CRITICAL" | "LIFE_THREATENING";

export type DetectedRedFlag = {
	code: RedFlagCode;
	title: string;
	severity: RedFlagSeverity;
	matchedPatterns: string[];
	clinicalExplanation: string;
	firstAidInstructions: string[];
	actionRequired: string;
};

export type RedFlagEvaluationResult = {
	hasRedFlags: boolean;
	flags: DetectedRedFlag[];
	highestSeverity: RedFlagSeverity | null;
	patientEmergencyAdvice: string;
	doctorAlertSummary: string;
};

export class TelegramRedFlagDetector {
	/**
	 * Анализирует произвольный текст (расшифровка аудио или текстовое сообщение) на красные флаги.
	 */
	static evaluateText(text: string): RedFlagEvaluationResult {
		const flags: DetectedRedFlag[] = [];
		const normalized = text.toLowerCase();

		// 1. Температура выше 38.2°C
		const feverPatterns: string[] = [];
		const tempMatch = normalized.match(/(?:температур[а-яё]*|т(?:емп)?\.?)\s*(?:достигл[а-яё]*|поднял[а-яё]*|равн[а-яё]*|составля[а-яё]*|уже|около|до)?\s*([34]\d(?:[.,]\d)?)/i);
		if (tempMatch && tempMatch[1]) {
			const tempVal = parseFloat(tempMatch[1].replace(",", "."));
			if (tempVal >= 38.2) {
				feverPatterns.push(`температура ${tempVal}°C`);
			}
		}

		if (
			normalized.includes("38.2") ||
			normalized.includes("38,2") ||
			normalized.includes("38.3") ||
			normalized.includes("38,3") ||
			normalized.includes("38.4") ||
			normalized.includes("38,4") ||
			normalized.includes("38.5") ||
			normalized.includes("38,5") ||
			normalized.includes("38.6") ||
			normalized.includes("38.7") ||
			normalized.includes("38.8") ||
			normalized.includes("38.9") ||
			normalized.includes("39") ||
			normalized.includes("39.5") ||
			normalized.includes("39,5") ||
			normalized.includes("40") ||
			/температур[а-яё]*\s+(?:очень\s+)?высок/i.test(normalized) ||
			/жар\b/.test(normalized) && /знобит/.test(normalized)
		) {
			if (feverPatterns.length === 0) {
				feverPatterns.push("высокая температура / лихорадка >= 38.2°C");
			}
		}

		if (feverPatterns.length > 0) {
			flags.push({
				code: "FEVER_CRITICAL",
				title: "Критическая гипертермия (> 38.2°C)",
				severity: "CRITICAL",
				matchedPatterns: feverPatterns,
				clinicalExplanation:
					"Температура тела выше 38.2°C после хирургического вмешательства указывает на выраженную системную воспалительную реакцию, нагноение гематомы или острый гнойно-некротический процесс.",
				firstAidInstructions: [
					"Примите назначенный жаропонижающий препарат (Парацетамол 500 мг или Ибупрофен 400 мг) при отсутствии аллергии.",
					"Обильное теплое (не горячее!) питье без сахара.",
					"КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ щёку, запрещено прикладывать спиртовые компрессы или принимать горячую ванну.",
				],
				actionRequired:
					"Срочная консультация лечащего хирурга; рассмотрение вопроса о назначении/смене антибактериальной терапии.",
			});
		}

		// 2. Неостанавливающееся кровотечение > 3 часов
		const bleedingPatterns: string[] = [];
		const isBleedingMentioned =
			normalized.includes("кров") ||
			normalized.includes("кровит") ||
			normalized.includes("кровотечен");

		const hasProlongedTime =
			/(?:[3-9]|\d{2,})\s*(?:час[а-яё]*|ч\b)/i.test(normalized) ||
			/(?:третий|четвертый|пятый|шестой|несколько)\s+час/i.test(normalized) ||
			normalized.includes("3 час") ||
			normalized.includes("4 час") ||
			normalized.includes("5 час") ||
			normalized.includes("долго") ||
			normalized.includes("непрерывно");

		const isNonStopping =
			normalized.includes("не останавлива") ||
			normalized.includes("не прекраща") ||
			normalized.includes("непрерывно") ||
			normalized.includes("хлещет") ||
			normalized.includes("сочится");

		if (
			(isBleedingMentioned && hasProlongedTime && isNonStopping) ||
			(isBleedingMentioned && hasProlongedTime && normalized.includes("после операции")) ||
			normalized.includes("захлебываюсь кровью") ||
			normalized.includes("полный рот крови") ||
			normalized.includes("сгусток выпал и хлещет") ||
			/кровит\s+непрерывно/.test(normalized)
		) {
			bleedingPatterns.push("непрекращающееся кровотечение > 3 часов");
		}

		if (bleedingPatterns.length > 0) {
			flags.push({
				code: "PROLONGED_BLEEDING",
				title: "Продолжающееся кровотечение из лунки/раны (> 3 часов)",
				severity: "CRITICAL",
				matchedPatterns: bleedingPatterns,
				clinicalExplanation:
					"Длительное непрекращающееся кровотечение после экстракции или имплантации грозит образованием обширной гематомы, инфицированием раны или анемизацией при коагулопатии.",
				firstAidInstructions: [
					"Сверните плотный тампон из стерильного бинта (марли), положите поверх лунки и плотно сомкните челюсти на 20-30 минут.",
					"Приложите сухой холод (лед в полотенце) к щеке снаружи на 15 минут.",
					"Не сплевывайте кровь и слюну (сплевывание создает отрицательное давление и срывает кровяной сгусток), не полощите рот!",
					"Измерьте артериальное давление (при гипертоническом кризе — принять плановый гипотензивный препарат).",
				],
				actionRequired:
					"При неэффективности тампонады в течение 30 минут — немедленный очный визит к дежурному хирургу для гемостаза (губка, швы, коагуляция).",
			});
		}

		// 3. Онемение губы / подбородка (парестезия n. alveolaris inferior)
		const paresthesiaPatterns: string[] = [];
		if (
			(normalized.includes("онемел") || normalized.includes("не чувствую") || normalized.includes("онемение") || normalized.includes("онемевш") || normalized.includes("потеря чувствительности")) &&
			(normalized.includes("губ") || normalized.includes("подбородок") || normalized.includes("подбородка") || normalized.includes("челюст") || normalized.includes("щек"))
		) {
			paresthesiaPatterns.push("онемение губы/подбородка");
		} else if (
			normalized.includes("парестезия") ||
			(normalized.includes("анестезия") && (normalized.includes("не отошла") || normalized.includes("не проходит") || normalized.includes("второй день") || normalized.includes("сутки")))
		) {
			paresthesiaPatterns.push("непроходящая потеря чувствительности (подозрение на парестезию)");
		}

		if (paresthesiaPatterns.length > 0) {
			flags.push({
				code: "NERVE_PARESTHESIA",
				title: "Онемение нижней губы / подбородка (угроза парестезии n. alveolaris inferior)",
				severity: "CRITICAL",
				matchedPatterns: paresthesiaPatterns,
				clinicalExplanation:
					"Стойкое онемение нижней губы и подбородка после имплантации в боковом отделе нижней челюсти или сложного удаления 8-ки указывает на компрессию или травму нижнеальвеолярного нерва. Требуется срочная КЛКТ-диагностика и решение вопроса о репозиции/декомпрессии имплантата в «золотые часы» (до 48 часов)!",
				firstAidInstructions: [
					"Зафиксируйте точную зону отсутствия чувствительности (губа, угол рта, подбородок).",
					"Не трогайте и не массируйте зону операции руками.",
					"Не грейте область челюсти.",
					"Немедленно свяжитесь с оперировавшим хирургом для контрольной прицельной диагностики.",
				],
				actionRequired:
					"Экстренный осмотр хирурга-имплантолога, контрольная КЛКТ челюсти. При механической компрессии нерва имплантатом — выкручивание/ослабление имплантата в течение 24–48 ч для спасения нерва.",
			});
		}

		// 4. Нарастающий плотный отек шеи / дна полости рта (угроза ангины Людвига)
		const ludwigPatterns: string[] = [];
		if (
			(normalized.includes("отек") || normalized.includes("опухл") || normalized.includes("раздул")) &&
			(normalized.includes("ше") || normalized.includes("под челюст") || normalized.includes("дно рта") || normalized.includes("подбородочн"))
		) {
			ludwigPatterns.push("распространение отёка на шею / подчелюстную область");
		}
		if (
			(normalized.includes("трудно глотать") || normalized.includes("больно глотать") || normalized.includes("не могу глотать") || normalized.includes("дисфагия")) &&
			(normalized.includes("отек") || normalized.includes("опух") || normalized.includes("шея") || normalized.includes("челюст"))
		) {
			ludwigPatterns.push("затрудненное глотание при нарастающем отёке");
		}
		if (
			normalized.includes("трудно дышать") ||
			normalized.includes("задыхаюсь") ||
			normalized.includes("не могу дышать") ||
			normalized.includes("не могу открыть рот") ||
			normalized.includes("челюсть свело") ||
			normalized.includes("рот не открывается")
		) {
			ludwigPatterns.push("тризм жевательных мышц / одышка / затруднение дыхания");
		}
		if (normalized.includes("ангина людвига") || normalized.includes("флегмона")) {
			ludwigPatterns.push("прямое указание на флегмонозное осложнение");
		}

		if (ludwigPatterns.length > 0) {
			flags.push({
				code: "LUDWIG_ANGINA_RISK",
				title: "Нарастающий плотный отёк шеи / дна полости рта (риск ангины Людвига / флегмоны)",
				severity: "LIFE_THREATENING",
				matchedPatterns: ludwigPatterns,
				clinicalExplanation:
					"Быстро прогрессирующий плотный двусторонний отёк подчелюстной области, затруднение глотания и открывания рта — грозные признаки флегмоны дна полости рта (ангины Людвига). Высокий риск стеноза гортани, асфиксии и распространения гноя в средостение (медиастинит). ЖИЗНЕУГРОЖАЮЩЕЕ СОСТОЯНИЕ!",
				firstAidInstructions: [
					"СРОЧНО примите вертикальное полусидячее положение (не ложитесь плашмя, чтобы не ухудшать проходимость дыхательных путей)!",
					"КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ шею и щёку!",
					"Если нарастает затруднение дыхания — НЕМЕДЛЕННО вызовите скорую помощь (112 или 103) с формулировкой: «Нарастающий отёк шеи после стоматологической операции, угроза удушья»!",
					"Приготовьте паспорт, полис и выписку из стоматологической клиники.",
				],
				actionRequired:
					"КРИТИЧЕСКИЙ CITO ВЫЗОВ: Экстренная госпитализация в отделение челюстно-лицевой хирургии (ЧЛХ) либо экстренное вскрытие очага дежурным хирургом с дренированием.",
			});
		}

		return this.buildResult(flags);
	}

	/**
	 * Оценивает структурированные данные анкеты послеоперационного мониторинга.
	 */
	static evaluateSurvey(data: {
		tempC?: number | undefined;
		bleedingHours?: number | undefined;
		lipNumbness?: boolean | undefined;
		neckSwelling?: boolean | undefined;
		swallowingPain?: boolean | undefined;
		painScore?: number | undefined;
		feverFlag?: boolean | undefined;
		bleedingFlag?: boolean | undefined;
	}): RedFlagEvaluationResult {
		const flags: DetectedRedFlag[] = [];

		if ((data.tempC !== undefined && data.tempC >= 38.2) || data.feverFlag) {
			flags.push({
				code: "FEVER_CRITICAL",
				title: "Критическая гипертермия (> 38.2°C)",
				severity: "CRITICAL",
				matchedPatterns: [`температура ${data.tempC ?? ">= 38.2"}°C в анкете`],
				clinicalExplanation:
					"Температура тела выше 38.2°C свидетельствует о выраженном воспалительном или гнойном процессе.",
				firstAidInstructions: [
					"Примите парацетамол 500 мг или ибупрофен 400 мг (при отсутствии противопоказаний).",
					"Не грейте место вмешательства.",
					"Обильное теплое питье.",
				],
				actionRequired: "Срочный звонок хирурга, контроль антибиотикотерапии.",
			});
		}

		if ((data.bleedingHours !== undefined && data.bleedingHours >= 3) || data.bleedingFlag) {
			flags.push({
				code: "PROLONGED_BLEEDING",
				title: "Продолжающееся кровотечение (> 3 часов)",
				severity: "CRITICAL",
				matchedPatterns: [`кровотечение ${data.bleedingHours ?? "> 3"} ч в анкете`],
				clinicalExplanation:
					"Длительное кровотечение требует ревизии лунки и гемостатических мероприятий.",
				firstAidInstructions: [
					"Плотно прикусите марлевый тампон на 20-30 минут.",
					"Сухой холод к щеке на 15 минут.",
					"Не полощите рот, не сплевывайте.",
				],
				actionRequired: "Осмотр хирурга для остановки кровотечения.",
			});
		}

		if (data.lipNumbness) {
			flags.push({
				code: "NERVE_PARESTHESIA",
				title: "Онемение нижней губы / подбородка (парестезия n. alveolaris inferior)",
				severity: "CRITICAL",
				matchedPatterns: ["отмечено онемение губы/подбородка в опросе"],
				clinicalExplanation:
					"Возможна травма или компрессия нижнеальвеолярного нерва. Требуется срочная ревизия имплантата в течение 24–48 часов.",
				firstAidInstructions: [
					"Зафиксируйте границы онемения.",
					"Не грейте область вмешательства.",
					"Свяжитесь с оперировавшим хирургом.",
				],
				actionRequired: "Контрольная КЛКТ, консультация хирурга-имплантолога.",
			});
		}

		if (data.neckSwelling || data.swallowingPain) {
			flags.push({
				code: "LUDWIG_ANGINA_RISK",
				title: "Нарастающий отёк шеи / дисфагия (риск ангины Людвига)",
				severity: "LIFE_THREATENING",
				matchedPatterns: [
					data.neckSwelling ? "отёк шеи" : "",
					data.swallowingPain ? "боль/затруднение при глотании" : "",
				].filter(Boolean),
				clinicalExplanation:
					"Плотный отёк шеи и затрудненное глотание — симптомы распространения флегмоны в глубокие клетчаточные пространства шеи. Риск асфиксии!",
				firstAidInstructions: [
					"Примите полусидячее положение, не ложитесь горизонтально!",
					"Не согревайте область шеи и челюсти!",
					"При затруднении дыхания — СРОЧНО вызовите скорую помощь (112)!",
				],
				actionRequired: "Экстренная госпитализация в ЧЛХ отделение.",
			});
		}

		return this.buildResult(flags);
	}

	private static buildResult(flags: DetectedRedFlag[]): RedFlagEvaluationResult {
		const hasRedFlags = flags.length > 0;
		if (!hasRedFlags) {
			return {
				hasRedFlags: false,
				flags: [],
				highestSeverity: null,
				patientEmergencyAdvice: "",
				doctorAlertSummary: "",
			};
		}

		const isLifeThreatening = flags.some((f) => f.severity === "LIFE_THREATENING");
		const highestSeverity: RedFlagSeverity = isLifeThreatening ? "LIFE_THREATENING" : "CRITICAL";

		const patientAdviceLines: string[] = [
			isLifeThreatening
				? "🚨 <b>ВНИМАНИЕ: ЗАФИКСИРОВАН ТРЕВОЖНЫЙ СИГНАЛ ВЫСШЕГО ПРИОРИТЕТА!</b>"
				: "⚠️ <b>ВНИМАНИЕ: ВАШЕ ОБРАЩЕНИЕ ПЕРЕДАНО ДЕЖУРНОМУ ХИРУРГУ!</b>",
			"",
			"Система клинического мониторинга DENTE обнаружила признаки, требующие немедленного врачебного контроля:",
		];

		flags.forEach((f, idx) => {
			patientAdviceLines.push(`${idx + 1}. <b>${f.title}</b>`);
		});

		patientAdviceLines.push("");
		patientAdviceLines.push("<b>Неотложные доврачебные действия прямо сейчас:</b>");

		// Собираем уникальные рекомендации
		const allInstructions = new Set<string>();
		flags.forEach((f) => f.firstAidInstructions.forEach((inst) => allInstructions.add(inst)));
		allInstructions.forEach((inst) => patientAdviceLines.push(`• ${inst}`));

		patientAdviceLines.push("");
		patientAdviceLines.push(
			"Дежурный врач уже получил экстренный вызов и свяжется с вами. Для мгновенной связи нажмите кнопку экстренного вызова ниже:",
		);

		const doctorAlertSummary = [
			isLifeThreatening
				? "🚨 [ЖИЗНЕУГРОЖАЮЩИЙ СИГНАЛ CITO / LIFE_THREATENING]"
				: "⚠️ [КРИТИЧЕСКИЙ АЛЕРТ CITO / POSTOP EMERGENCY]",
			`Выявленные красные флаги (${flags.length}):`,
			flags.map((f) => `• ${f.title} (триггеры: ${f.matchedPatterns.join(", ")})`).join("\n"),
			`Тактика: ${flags.map((f) => f.actionRequired).join("; ")}`,
		].join("\n");

		return {
			hasRedFlags: true,
			flags,
			highestSeverity,
			patientEmergencyAdvice: patientAdviceLines.join("\n"),
			doctorAlertSummary,
		};
	}
}
