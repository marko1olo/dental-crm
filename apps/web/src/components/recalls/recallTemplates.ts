/**
 * Omnichannel Communication Templates & 1-Click Booking Link Generator (DOMAIN: RECALLS)
 *
 * Персонализированные шаблоны для WhatsApp, Telegram, SMS и телефонных скриптов администратора.
 * Соответствует ФЗ «О рекламе» ст. 18 ч. 1, принципам клинической деонтологии и юридическим стандартам клиники.
 */

import {
	RECALL_CYCLE_CATALOG,
	type PatientRecallCandidate,
	type RecallCycleType,
} from "./recallEngine";

export interface RecallTemplateVariables {
	readonly patientFirstName: string;
	readonly patientFullName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly serviceName: string;
	readonly monthsSince: number | string;
	readonly bookingUrl: string;
	readonly dueDateFormatted: string;
	readonly phone: string;
}

export interface RecallScriptObjection {
	readonly id: string;
	readonly title: string;
	readonly patientPhrase: string;
	readonly clinicalRationale: string;
	readonly suggestedResponse: string;
	readonly psychologicalTip: string;
}

export interface RecallCallingScript {
	readonly cycleType: RecallCycleType;
	readonly title: string;
	readonly greeting: string;
	readonly clinicalContext: string;
	readonly callToAction: string;
	readonly objections: readonly RecallScriptObjection[];
}

/**
 * Извлечение имени пациента из полного ФИО («Иванов Иван Иванович» -> «Иван»).
 */
export function extractFirstName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	// В русской традиции обычно «Фамилия Имя Отчество», берем Имя (индекс 1)
	if (parts.length >= 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

/**
 * Очистка номера телефона от пробелов, скобок и дефисов для ссылки wa.me / tel.
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string {
	if (!phone) return "";
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("8") && digits.length === 11) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

/**
 * Генерация 1-Click ссылки для онлайн-записи пациента на профилактику.
 */
export function generate1ClickBookingLink(options: {
	readonly baseUrl?: string | undefined;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly cycleType?: RecallCycleType | undefined;
	readonly campaign?: string | undefined;
	readonly source?: string | undefined;
}): string {
	const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, "") : "";
	const path = `${base}/booking`;
	const params = new URLSearchParams();

	params.set("patient_id", options.patientId);
	if (options.doctorId) {
		params.set("doctor_id", options.doctorId);
	}
	if (options.serviceCode) {
		params.set("service", options.serviceCode);
	}
	if (options.cycleType) {
		params.set("recall_cycle", options.cycleType);
	}
	params.set("source", options.source ?? "recall_prophylaxis");
	params.set("utm_campaign", options.campaign ?? "patient_recall_engine");

	return `${path}?${params.toString()}`;
}

/**
 * Подстановка переменных в текст шаблона ({{PATIENT_FIRST_NAME}}, {{DOCTOR_NAME}} и т.д.).
 */
export function interpolateRecallTemplate(
	template: string,
	variables: RecallTemplateVariables,
): string {
	return template
		.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, variables.patientFirstName)
		.replace(/\{\{PATIENT_FULL_NAME\}\}/g, variables.patientFullName)
		.replace(/\{\{DOCTOR_NAME\}\}/g, variables.doctorName)
		.replace(/\{\{CLINIC_NAME\}\}/g, variables.clinicName)
		.replace(/\{\{SERVICE_NAME\}\}/g, variables.serviceName)
		.replace(/\{\{MONTHS_SINCE\}\}/g, String(variables.monthsSince))
		.replace(/\{\{BOOKING_URL\}\}/g, variables.bookingUrl)
		.replace(/\{\{DUE_DATE\}\}/g, variables.dueDateFormatted)
		.replace(/\{\{PHONE\}\}/g, variables.phone);
}

/**
 * Базовые шаблоны сообщений по клиническим циклам для WhatsApp.
 */
const WHATSAPP_TEMPLATES: Record<RecallCycleType, string> = {
	caries_high_risk:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Стоматология «{{CLINIC_NAME}}» беспокоится о здоровье Ваших зубов. " +
		"Прошло {{MONTHS_SINCE}} мес. с прошлого лечения у доктора {{DOCTOR_NAME}}. " +
		"Для защиты эмали и сохранения гарантии на реставрации Вам рекомендована плановая ремотерапия и осмотр.\n\n" +
		"📅 Выбрать удобное время в 1 клик:\n{{BOOKING_URL}}\n\n" +
		"Или просто ответьте на это сообщение, и мы подберем слот!",

	periodontal_maintenance:
		"Добрый день, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Ваш пародонтолог {{DOCTOR_NAME}} напоминает: " +
		"прошло {{MONTHS_SINCE}} мес. с курса пародонтальной терапии. " +
		"Чтобы не допустить воспаления десен и рецидива глубины карманов, важно провести поддерживающую гигиену.\n\n" +
		"🌿 Записаться онлайн:\n{{BOOKING_URL}}\n\n" +
		"Ждем Вас!",

	implant_monitoring:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"«{{CLINIC_NAME}}» заботится о Вашей улыбке. " +
		"Прошло {{MONTHS_SINCE}} мес. с момента установки коронок на имплантатах. " +
		"Доктор {{DOCTOR_NAME}} ждет Вас на контрольный рентген-осмотр и специализированную гигиену имплантов для сохранения бессрочной гарантии.\n\n" +
		"🦷 Запись к доктору в 1 клик:\n{{BOOKING_URL}}",

	orthodontic_retention:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Ваш ортодонт {{DOCTOR_NAME}} приглашает на плановый контроль ретейнеров и капп (прошло {{MONTHS_SINCE}} мес.). " +
		"Это необходимо для идеального сохранения ровного положения зубов и правильного прикуса.\n\n" +
		"✨ Онлайн-запись:\n{{BOOKING_URL}}",

	standard_prophylaxis:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Прошло 6 месяцев с Вашего последнего визита в клинику «{{CLINIC_NAME}}». " +
		"Доктор {{DOCTOR_NAME}} рекомендует пройти плановый профилактический осмотр и гигиену Air-Flow для сохранения здоровья зубов и гарантии.\n\n" +
		"✨ Записаться онлайн без звонков:\n{{BOOKING_URL}}\n\n" +
		"Будем рады видеть Вас!",

	pediatric_fluoridation:
		"Здравствуйте! Стоматология «{{CLINIC_NAME}}». " +
		"Прошло 3 месяца с последнего осмотра маленького пациента {{PATIENT_FIRST_NAME}}. " +
		"Детский доктор {{DOCTOR_NAME}} приглашает на минерализацию эмали и веселый урок гигиены, чтобы зубки оставались крепкими и здоровыми!\n\n" +
		"🎈 Записаться онлайн:\n{{BOOKING_URL}}",
};

/**
 * Короткие шаблоны сообщений для SMS (лимит длины, без эмодзи).
 */
const SMS_TEMPLATES: Record<RecallCycleType, string> = {
	caries_high_risk:
		"{{PATIENT_FIRST_NAME}}, пора на осмотр и фторирование зубов (прошло {{MONTHS_SINCE}} мес). {{CLINIC_NAME}}. Запись: {{BOOKING_URL}}",
	periodontal_maintenance:
		"{{PATIENT_FIRST_NAME}}, подошел срок пародонтологического контроля в {{CLINIC_NAME}}. Запись к врачу {{DOCTOR_NAME}}: {{BOOKING_URL}}",
	implant_monitoring:
		"{{PATIENT_FIRST_NAME}}, приглашаем на плановый рентген-контроль имплантов и гарантийный осмотр. {{CLINIC_NAME}}: {{BOOKING_URL}}",
	orthodontic_retention:
		"{{PATIENT_FIRST_NAME}}, подошел срок проверки ретейнеров у ортодонта {{DOCTOR_NAME}}. Запись: {{BOOKING_URL}}",
	standard_prophylaxis:
		"{{PATIENT_FIRST_NAME}}, прошло полгода с осмотра в {{CLINIC_NAME}}. Пора на профгигиену для сохранения гарантии: {{BOOKING_URL}}",
	pediatric_fluoridation:
		"Осмотр и фторирование зубов для {{PATIENT_FIRST_NAME}} в {{CLINIC_NAME}}. Запись: {{BOOKING_URL}}",
};

/**
 * Генерация готового сообщения для WhatsApp.
 */
export function generateWhatsAppRecallMessage(
	candidate: PatientRecallCandidate,
	options: {
		readonly clinicName?: string | undefined;
		readonly baseUrl?: string | undefined;
	} = {},
): string {
	const clinicName = options.clinicName || "DENTE Clinic";
	const doctorName = candidate.attendingDoctorName || "Ваш лечащий врач";
	const firstName = extractFirstName(candidate.fullName);
	const monthsSince = candidate.daysOverdue >= 0
		? Math.max(1, Math.round(candidate.daysOverdue / 30) + (RECALL_CYCLE_CATALOG[candidate.cycleType]?.defaultIntervalMonths ?? 6))
		: RECALL_CYCLE_CATALOG[candidate.cycleType]?.defaultIntervalMonths ?? 6;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		campaign: `recall_${candidate.cycleType}`,
		source: "whatsapp",
	});

	const template = WHATSAPP_TEMPLATES[candidate.cycleType] || WHATSAPP_TEMPLATES.standard_prophylaxis;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: RECALL_CYCLE_CATALOG[candidate.cycleType]?.title ?? "Профгигиена",
		monthsSince,
		bookingUrl,
		dueDateFormatted: candidate.dueDate,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}

/**
 * Генерация готового сообщения для Telegram.
 */
export function generateTelegramRecallMessage(
	candidate: PatientRecallCandidate,
	options: {
		readonly clinicName?: string | undefined;
		readonly baseUrl?: string | undefined;
	} = {},
): string {
	// WhatsApp и Telegram используют насыщенный текст с эмодзи
	return generateWhatsAppRecallMessage(candidate, options);
}

/**
 * Генерация компактного SMS-сообщения.
 */
export function generateSmsRecallMessage(
	candidate: PatientRecallCandidate,
	options: {
		readonly clinicName?: string | undefined;
		readonly baseUrl?: string | undefined;
	} = {},
): string {
	const clinicName = options.clinicName || "DENTE";
	const doctorName = candidate.attendingDoctorName || "Врач";
	const firstName = extractFirstName(candidate.fullName);
	const monthsSince = candidate.daysOverdue >= 0
		? Math.max(1, Math.round(candidate.daysOverdue / 30) + (RECALL_CYCLE_CATALOG[candidate.cycleType]?.defaultIntervalMonths ?? 6))
		: RECALL_CYCLE_CATALOG[candidate.cycleType]?.defaultIntervalMonths ?? 6;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		campaign: `recall_sms_${candidate.cycleType}`,
		source: "sms",
	});

	const template = SMS_TEMPLATES[candidate.cycleType] || SMS_TEMPLATES.standard_prophylaxis;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: RECALL_CYCLE_CATALOG[candidate.cycleType]?.shortTitle ?? "Профгигиена",
		monthsSince,
		bookingUrl,
		dueDateFormatted: candidate.dueDate,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}

/**
 * Построение прямой ссылки wa.me для отправки в 1 клик.
 */
export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
	const cleanPhone = sanitizePhoneNumber(phone);
	const encodedText = encodeURIComponent(text);
	return cleanPhone
		? `https://wa.me/${cleanPhone}?text=${encodedText}`
		: `https://wa.me/?text=${encodedText}`;
}

/**
 * Каталог клинических скриптов обзвона для администратора с разбором частых возражений.
 */
export const CLINICAL_CALLING_SCRIPTS: Readonly<Record<RecallCycleType, RecallCallingScript>> = {
	standard_prophylaxis: {
		cycleType: "standard_prophylaxis",
		title: "Плановый полугодовой осмотр и профессиональная гигиена",
		greeting:
			"«Добрый день, {{PATIENT_FIRST_NAME}}! Меня зовут [Имя], клиника «{{CLINIC_NAME}}». " +
			"Я звоню по поручению Вашего лечащего доктора {{DOCTOR_NAME}}.»",
		clinicalContext:
			"«Доктор смотрел карту: прошло уже полгода с Вашего предыдущего визита. " +
			"У Вас подошел плановый срок диспансерного осмотра и профгигиены Air-Flow. " +
			"Это занимает всего 40 минут и позволяет сохранить гарантию на все выполненные работы.»",
		callToAction:
			"«Вам удобнее подойти в первой половине дня или ближе к вечеру? Могу предложить четверг в 11:00 или субботу в 14:30.»",
		objections: [
			{
				id: "no_pain",
				title: "«У меня ничего не болит, зачем идти?»",
				patientPhrase: "«Спасибо, но меня сейчас ничего не беспокоит, зубы не болят.»",
				clinicalRationale:
					"Скрытый апроксимальный кариес и пародонтальные карманы развиваются абсолютно безболезненно вплоть до поражения нерва (пульпита).",
				suggestedResponse:
					"«{{PATIENT_FIRST_NAME}}, это замечательно, что ничего не болит! Как раз цель профилактики — не допустить боли. " +
					"Кариес между зубами и зубной камень под десной начинаются незаметно, и когда появляется боль, лечение обходится в 4–5 раз дороже. " +
					"Доктор проведет быстрый осмотр и бережную чистку, чтобы Вы были уверены в здоровье зубов еще на полгода вперед.»",
				psychologicalTip: "Подтвердить радость за пациента, перевести фокус с лечения на экономию денег и сохранение здоровья.",
			},
			{
				id: "expensive",
				title: "«Сейчас нет денег / дорого»",
				patientPhrase: "«Сейчас не до этого по финансам, дороговато.»",
				clinicalRationale:
					"Стоимость профгигиены (5–7 тыс. руб.) несопоставима со стоимостью лечения пульпита (25–35 тыс. руб.) или коронки (40–60 тыс. руб.).",
				suggestedResponse:
					"«Прекрасно Вас понимаю. Именно поэтому доктор {{DOCTOR_NAME}} рекомендует гигиену: регулярная чистка предотвращает разрушение зубов и защищает Вас от трат на сложное лечение. Кроме того, для наших постоянных пациентов действует фиксация стоимости.»",
				psychologicalTip: "Показать математическую выгоду профилактики по сравнению со срочным лечением.",
			},
			{
				id: "no_time",
				title: "«Нет времени / очень занят»",
				patientPhrase: "«У меня сейчас завал на работе, абсолютно нет времени.»",
				clinicalRationale:
					"Процедура стандартизирована и занимает 40-45 минут. Есть ранние утренние и вечерние слоты.",
				suggestedResponse:
					"«Понимаю Ваш плотный график! Процедура длится всего 40 минут. Мы можем подобрать раннее утро перед работой (в 8:30) или вечернее время после 19:30, либо субботу. В какой день недели Вам комфортнее?»",
				psychologicalTip: "Предложить выбор из двух конкретных вариантов (выбор без выбора).",
			},
			{
				id: "other_clinic",
				title: "«Лечусь в другом месте / переехал»",
				patientPhrase: "«Я уже хожу в другую клинику / переехал в другой район.»",
				clinicalRationale:
					"Сохранение лояльности, предложение экспорта снимков КТ/рентгена.",
				suggestedResponse:
					"«Поняла Вас, {{PATIENT_FIRST_NAME}}. Спасибо большое за обратную связь! Если Вам понадобятся Ваши снимки или выписка из карты, мы с радостью отправим их на Вашу электронную почту. Крепкого Вам здоровья и красивой улыбки!»",
				psychologicalTip: "Оставить максимально теплое и профессиональное впечатление без навязчивости.",
			},
		],
	},
	caries_high_risk: {
		cycleType: "caries_high_risk",
		title: "Высокий кариесогенный риск (3 мес.)",
		greeting:
			"«Здравствуйте, {{PATIENT_FIRST_NAME}}! Клиника «{{CLINIC_NAME}}», доктор {{DOCTOR_NAME}} просил связаться с Вами.»",
		clinicalContext:
			"«Прошло 3 месяца после сложного лечения кариеса. Доктор установил специальный 3-месячный интервал контроля, чтобы оценить минерализацию эмали и провести укрепляющее фторирование.»",
		callToAction:
			"«Давайте запишемся на контрольный 20-минутный прием к доктору {{DOCTOR_NAME}} на этой неделе?»",
		objections: [
			{
				id: "plomb_holds",
				title: "«Пломба стоит хорошо, не мешает»",
				patientPhrase: "«Пломба на месте, ничего не чувствую.»",
				clinicalRationale: "Необходим контроль краевого прилегания и предотвращение вторичного кариеса.",
				suggestedResponse:
					"«Отлично! Но доктор оценивает микроскопическое краевое прилегание пломбы специальным зондом и наносит фтор-лак на соседние участки. Это гарантия того, что под пломбой не появится вторичный кариес.»",
				psychologicalTip: "Сделать акцент на долговечности реставрации.",
			},
		],
	},
	periodontal_maintenance: {
		cycleType: "periodontal_maintenance",
		title: "Поддерживающая пародонтальная терапия (3-4 мес.)",
		greeting:
			"«Добрый день, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}», Ваш пародонтолог {{DOCTOR_NAME}} передает привет.»",
		clinicalContext:
			"«Прошло 3 месяца после курса лечения десен. Для закрепления результата и предотвращения углубления пародонтальных карманов доктор ждет Вас на плановую поддерживающую процедуру.»",
		callToAction:
			"«Когда Вам удобнее подойти: в будни или в выходные?»",
		objections: [
			{
				id: "gums_not_bleeding",
				title: "«Десны больше не кровоточат»",
				patientPhrase: "«Кровоточивость прошла, десны не болят.»",
				clinicalRationale: "Пародонтит — хронический процесс, остановка рецессии кости требует регулярной очистки поддесневых зон каждые 3-4 месяца.",
				suggestedResponse:
					"«Это прекрасный клинический результат! Чтобы сохранить десны плотными и не допустить убыли костной ткани вокруг корней, поддерживающую чистку Vector важно делать строго раз в 3–4 месяца. Доктор просил не пропускать этот этап.»",
				psychologicalTip: "Подчеркнуть важность удержания стабильной ремиссии.",
			},
		],
	},
	implant_monitoring: {
		cycleType: "implant_monitoring",
		title: "Контроль остеоинтеграции и имплантатов (4-6 мес.)",
		greeting:
			"«Здравствуйте, {{PATIENT_FIRST_NAME}}! «{{CLINIC_NAME}}», звоню по поводу диспансерного осмотра Ваших имплантатов.»",
		clinicalContext:
			"«Подошел срок контрольного рентген-снимка и специализированной очистки абатментов у доктора {{DOCTOR_NAME}}. Это обязательный пункт для сохранения пожизненной гарантии производителя на имплантаты.»",
		callToAction:
			"«Запишемся на удобный день: есть свободное время в среду в 15:00 или в пятницу в 18:00?»",
		objections: [
			{
				id: "implants_solid",
				title: "«Импланты стоят как родные»",
				patientPhrase: "«Импланты не беспокоят, жую отлично.»",
				clinicalRationale: "Периимплантит и убыль кости протекают без боли, контроль возможен только рентгенологически.",
				suggestedResponse:
					"«Мы очень рады! Но вокруг имплантата нет нервных окончаний, и убыль кости протекает без боли. На снимке доктор проверит уровень костной ткани с точностью до десятых долей миллиметра и обновит гарантийный сертификат.»",
				psychologicalTip: "Апеллировать к гарантийным обязательствам и защите инвестиций в здоровье.",
			},
		],
	},
	orthodontic_retention: {
		cycleType: "orthodontic_retention",
		title: "Ортодонтический ретенционный контроль",
		greeting:
			"«Здравствуйте, {{PATIENT_FIRST_NAME}}! Клиника «{{CLINIC_NAME}}», звоню от Вашего ортодонта {{DOCTOR_NAME}}.»",
		clinicalContext:
			"«Подошел срок проверки ретейнеров и ночной каппы. Доктору необходимо убедиться, что зубы сохраняют идеальное положение, а клей ретейнера не отклеился.»",
		callToAction:
			"«Прием займет всего 15 минут. В какой день недели Вам удобнее подойти?»",
		objections: [
			{
				id: "retainer_ok",
				title: "«Ретейнер на месте, зубы ровные»",
				patientPhrase: "«Вроде проволочка держится, зубы ровные.»",
				clinicalRationale: "Микроотклеивание на одном зубе приводит к смещению зуба за 2-3 недели.",
				suggestedResponse:
					"«Микроотклеивание от одного зуба языком не ощущается, но зуб может начать смещаться. Доктор проверит фиксацию каждого зуба и полимеризует контакт, чтобы сохранить идеальный результат Вашего ортодонтического лечения.»",
				psychologicalTip: "Напомнить о длительном пути к ровным зубам, который нельзя потерять.",
			},
		],
	},
	pediatric_fluoridation: {
		cycleType: "pediatric_fluoridation",
		title: "Детская профилактика и минерализация",
		greeting:
			"«Добрый день! Стоматология «{{CLINIC_NAME}}», детский доктор {{DOCTOR_NAME}} просил пригласить {{PATIENT_FIRST_NAME}} на плановую минерализацию.»",
		clinicalContext:
			"«У деток эмаль еще созревает, поэтому раз в 3 месяца мы наносим защитный минеральный гель и проверяем герметизацию фиссур, чтобы предотвратить появление дырочек.»",
		callToAction:
			"«В какой день после садика/школы Вам удобнее прийти?»",
		objections: [
			{
				id: "milk_teeth",
				title: "«Это же молочные зубы, сами выпадут»",
				patientPhrase: "«Зачем лечить/мазать молочные зубы, если они временные?»",
				clinicalRationale: "Кариес молочного зуба поражает зачаток постоянного зуба, вызывая гипоплазию и пороки развития.",
				suggestedResponse:
					"«Молочные зубы держат место для постоянных. Если под молочным зубом начнется воспаление, может пострадать зачаток постоянного зуба. Простая безболезненная минерализация гелем со вкусом клубники защитит зубки и сформирует у ребенка позитивное отношение к стоматологу без страха.»",
				psychologicalTip: "Успокоить родителя, подчеркнуть безболезненный игровой формат визита.",
			},
		],
	},
};
