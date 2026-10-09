/**
 * triageScreenPresenter.ts
 *
 * Layer 2: Clinical screen presentation layer.
 * Formats Telegram messages and integrates inline keyboard layouts.
 */

import {
	findCrownPreset,
	findImplantPreset,
} from "./presets.js";
import { calculateImplantBudget } from "./triageCostCalculator.js";
import {
	buildAestheticColorKeyboard,
	buildAestheticKeyboard,
	buildAestheticOrthoKeyboard,
	buildAestheticVeneersKeyboard,
	buildBrokenToothKeyboard,
	buildBrokenToothPainKeyboard,
	buildBrokenToothPhotoHintKeyboard,
	buildBrokenToothSharpKeyboard,
	buildCalculatorRootKeyboard,
	buildCariesCalculatorKeyboard,
	buildCitoBookKeyboard,
	buildCrownCalculatorKeyboard,
	buildEmergencyKeyboard,
	buildGeneralLockSuccessKeyboard,
	buildGumsKeyboard,
	buildHumanTakeoverKeyboard,
	buildImplantCrownSelectionKeyboard,
	buildImplantLockSuccessKeyboard,
	buildImplantResultKeyboard,
	buildImplantSelectionKeyboard,
	buildKidsKeyboard,
	buildPhotoIntakeFailedKeyboard,
	buildPhotoIntakeSuccessKeyboard,
	buildRootTriageKeyboard,
	buildWhiteningCalculatorKeyboard,
} from "./triageKeyboardBuilder.js";
import type { TriageScreenResult } from "./types.js";

/**
 * Главное меню интерактивного триажа симптомов.
 */
export function presentRootTriageScreen(): TriageScreenResult {
	const text = [
		"🩺 <b>Клинический экспресс-опросник DENTE</b>",
		"",
		"Что вас беспокоит в данный момент? Выберите подходящий пункт, и бот подскажет правильные доврачебные действия, сориентирует по стоимости и поможет попасть к нужному специалисту без очередей:",
	].join("\n");

	return {
		text,
		replyMarkup: buildRootTriageKeyboard(),
	};
}

/**
 * Ветка: Экстренная острая боль / отёк (CITO).
 */
export function presentEmergencyScreen(): TriageScreenResult {
	const text = [
		"🚨 <b>ЭКСТРЕННАЯ СИТУАЦИЯ (CITO)</b>",
		"",
		"<b>Памятка неотложной доврачебной помощи:</b>",
		"1. 🛑 <b>КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ ЩЕКУ И ДЕСНУ!</b> Тепло (грелки, шарфы, горячие компрессы) ускоряет нагноение и может вызвать флегмону.",
		"2. 💊 <b>Обезболивающее:</b> Примите НПВП (Ибупрофен 400 мг / Кетонал 50 мг / Нимесулид) при отсутствии аллергии и противопоказаний.",
		"3. ❄️ <b>Холодный компресс:</b> Приложите лёд через полотенце к щеке снаружи на 10-15 минут.",
		"4. 🚫 Не кладите таблетки на десну рядом с зубом — это вызывает химический ожог слизистой.",
		"",
		"Принимаем экстренных пациентов без очереди. Нажмите кнопку записи или срочного звонка:",
	].join("\n");

	return {
		text,
		replyMarkup: buildEmergencyKeyboard(),
	};
}

/**
 * Экстренная запись CITO на сегодня.
 */
export function presentCitoBookScreen(): TriageScreenResult {
	const text = [
		"🚨 <b>Ближайшие экстренные слоты CITO</b>",
		"",
		"Дежурный врач готов принять вас по острой боли сегодня.",
		"Для мгновенной фиксации слота нажмите кнопку ниже или позвоните в клинику:",
	].join("\n");

	return {
		text,
		replyMarkup: buildCitoBookKeyboard(),
	};
}

/**
 * Ветка: Откололся зуб / выпала пломба.
 */
export function presentBrokenToothScreen(subStep?: string): TriageScreenResult {
	if (subStep === "sharp") {
		return {
			text: [
				"🦷 <b>Острый край травмирует слизистую</b>",
				"",
				"<b>Временная рекомендация:</b>",
				"• Можно временно закрыть острый край кусочком ортодонтического воска или чистой жевательной резинкой без сахара, чтобы не травмировать язык и щёку.",
				"• Постарайтесь не жевать на эту сторону твердую пищу.",
				"",
				"📸 Вы можете <b>отправить фотографию зуба прямо в этот чат</b> — врач предварительно оценит объем скола перед консультацией.",
			].join("\n"),
			replyMarkup: buildBrokenToothSharpKeyboard(),
		};
	}

	if (subStep === "pain") {
		return {
			text: [
				"⚠️ <b>Боль при накусывании или от холодного/горячего</b>",
				"",
				"Это признак того, что скол оголил дентин или сосудисто-нервный пучок (пульпу зуба).",
				"",
				"<b>Клинический маршрут:</b>",
				"• Необходим осмотр врача-терапевта с диагностическим визиографическим снимком.",
				"• При сохранении жизнеспособности пульпы — восстановление анатомической формы зуба.",
				"• Если поврежден нерв — бережное лечение корневых каналов под операционным микроскопом.",
			].join("\n"),
			replyMarkup: buildBrokenToothPainKeyboard(),
		};
	}

	const text = [
		"🦷 <b>Откололся зуб или выпала пломба</b>",
		"",
		"Уточните характер ощущений, чтобы мы направили вас к нужному специалисту:",
	].join("\n");

	return {
		text,
		replyMarkup: buildBrokenToothKeyboard(),
	};
}

/**
 * Инструкция по фотофиксации скола зуба.
 */
export function presentBrokenToothPhotoHintScreen(): TriageScreenResult {
	const text = [
		"📸 <b>Как правильно сделать снимок зуба:</b>",
		"",
		"1. Включите фонарик на телефоне или подойдите к яркому свету.",
		"2. Слегка отодвиньте щёку или губу пальцем, чтобы зуб был в фокусе.",
		"3. Сделайте 1-2 чётких снимка и просто <b>отправьте их в этот чат как фото</b>.",
		"",
		"Бот сохранит фото в вашей электронной карточке, и врач изучит снимок перед консультацией.",
	].join("\n");

	return {
		text,
		replyMarkup: buildBrokenToothPhotoHintKeyboard(),
	};
}

/**
 * Ветка: Кровоточат десны / запах.
 */
export function presentGumsScreen(): TriageScreenResult {
	const text = [
		"🩸 <b>Здоровье десен и пародонта</b>",
		"",
		"<b>Клинические признаки воспаления:</b>",
		"• <b>Кровь при чистке зубов или еде:</b> признак гингивита из-за наддесневого зубного камня и биопленки.",
		"• <b>Подвижность зубов / оголение шеек:</b> признак пародонтита и убыли костной ткани.",
		"• <b>Неприятный запах:</b> следствие активности анаэробных бактерий в пародонтальных карманах.",
		"",
		"<b>Рекомендованный план:</b>",
		"1. Профессиональная гигиена полости рта (ультразвуковой скейлинг + бережный AirFlow с порошком на основе глицина/эритритола).",
		"2. При необходимости — диагностика глубины карманов и составление пародонтограммы (перио-карты).",
	].join("\n");

	return {
		text,
		replyMarkup: buildGumsKeyboard(),
	};
}

/**
 * Ветка: Эстетика улыбки (виниры, элайнеры, отбеливание).
 */
export function presentAestheticScreen(subStep?: string): TriageScreenResult {
	if (subStep === "color") {
		return {
			text: [
				"✨ <b>Осветление оттенка зубов</b>",
				"",
				"<b>Методы безопасного клинического отбеливания:</b>",
				"• <b>FLASH (Германия):</b> холодный светодиодный спектр, отсутствие нагрева пульпы, минимальная чувствительность.",
				"• <b>Zoom 4 (Philips):</b> осветление до 8 тонов за 1 визит.",
				"• <b>Домашнее отбеливание:</b> индивидуальные каппы с мягким гелем карбамида.",
				"",
				"<i>Перед отбеливанием обязательно проводится профессиональная гигиена полости рта.</i>",
			].join("\n"),
			replyMarkup: buildAestheticColorKeyboard(),
		};
	}

	if (subStep === "veneers") {
		return {
			text: [
				"💎 <b>Керамические виниры E.max</b>",
				"",
				"Идеальное решение для коррекции:",
				"• Формы и длины зубов",
				"• Сколов, старых потемневших пломб",
				"• Диастемических щелей между зубами",
				"• Стойкого дисколорита, не поддающегося отбеливанию",
				"",
				"Толщина винира всего 0.3-0.5 мм с микропрепарированием в пределах эмали.",
			].join("\n"),
			replyMarkup: buildAestheticVeneersKeyboard(),
		};
	}

	if (subStep === "ortho") {
		return {
			text: [
				"📐 <b>Исправление прикуса и скученности</b>",
				"",
				"<b>Современные технологии:</b>",
				"• <b>Элайнеры:</b> прозрачные съемные каппы. Незаметны для окружающих, не мешают гигиене и привычному питанию.",
				"• <b>Брекет-системы:</b> металлические и керамические самолигирующие системы Damon.",
				"",
				"3D-моделирование результата лечения до начала установки!",
			].join("\n"),
			replyMarkup: buildAestheticOrthoKeyboard(),
		};
	}

	const text = [
		"✨ <b>Эстетическая стоматология DENTE</b>",
		"",
		"Что вы хотите улучшить в своей улыбке?",
	].join("\n");

	return {
		text,
		replyMarkup: buildAestheticKeyboard(),
	};
}

/**
 * Ветка: Подготовка ребенка к приёму.
 */
export function presentKidsScreen(): TriageScreenResult {
	const text = [
		"👶 <b>Бесконфликтная подготовка ребенка к визиту</b>",
		"",
		"<b>Золотые правила детских стоматологов DENTE:</b>",
		"1. 🚫 <b>Запретные фразы:</b> Не говорите ребенку «Не бойся!», «Там не больно», «Укола не будет». Детский мозг фокусируется именно на слове «БОЛЬ» и начинает тревожиться.",
		"2. 🎮 <b>Игровая подача:</b> Скажите: «Мы идем познакомиться с доктором, он покажет волшебное кресло-космолет и посчитает твои зубки».",
		"3. ⏰ <b>Время визита:</b> Записывайтесь на утренние часы, когда ребенок выспался и не утомлен после детского сада/школы.",
		"4. 🤝 <b>Первый визит — адаптационный:</b> Никаких сверлений и боли! Ребенок знакомится с врачом, катается на кресле и получает подарок за смелость.",
	].join("\n");

	return {
		text,
		replyMarkup: buildKidsKeyboard(),
	};
}

/**
 * Главный экран калькулятора.
 */
export function presentCalculatorRootScreen(): TriageScreenResult {
	const text = [
		"🧮 <b>Калькулятор стоимости лечения DENTE</b>",
		"",
		"Интерактивный расчет в 3 клика с прозрачной фиксацией цен «под ключ» без скрытых платежей:",
		"Выберите интересующее направление:",
	].join("\n");

	return {
		text,
		replyMarkup: buildCalculatorRootKeyboard(),
	};
}

/**
 * Шаг 1 Имплантации: Выбор системы импланта.
 */
export function presentImplantSystemSelectionScreen(): TriageScreenResult {
	const text = [
		"🔩 <b>Калькулятор имплантации (Шаг 1 из 2)</b>",
		"",
		"Выберите систему имплантата:",
	].join("\n");

	return {
		text,
		replyMarkup: buildImplantSelectionKeyboard(),
	};
}

/**
 * Шаг 2 Имплантации: Выбор коронки.
 */
export function presentImplantCrownSelectionScreen(implantCode: string): TriageScreenResult {
	const imp = findImplantPreset(implantCode);

	const text = [
		"🔩 <b>Калькулятор имплантации (Шаг 2 из 2)</b>",
		"",
		`Выбран имплантат: <b>${imp.brand} (${imp.country})</b> — ${imp.priceRub.toLocaleString("ru-RU")} ₽`,
		"",
		"Теперь выберите тип постоянной коронки на имплант:",
	].join("\n");

	return {
		text,
		replyMarkup: buildImplantCrownSelectionKeyboard(implantCode),
	};
}

/**
 * Итоговый расчет имплантации «под ключ».
 */
export function presentImplantResultScreen(
	implantCode: string,
	crownCode: string,
): TriageScreenResult {
	const budget = calculateImplantBudget(implantCode, crownCode);

	const text = [
		"📋 <b>Итоговая смета имплантации «ПОД КЛЮЧ»</b>",
		"",
		`1. <b>Хирургический этап:</b>`,
		`   • Имплантат ${budget.implant.brand} (${budget.implant.country})`,
		`   • Установка имплантата и анестезия`,
		`   • Формирователь десны и снятие швов`,
		`   • <i>Стоимость: ${budget.surgicalRub.toLocaleString("ru-RU")} ₽</i>`,
		"",
		`2. <b>Ортопедический этап:</b>`,
		`   • Индивидуальный титановый абатмент`,
		`   • Коронка: ${budget.crown.name}`,
		`   • Винтовая фиксация в прикусе`,
		`   • <i>Стоимость: ${budget.orthopedicRub.toLocaleString("ru-RU")} ₽</i>`,
		"",
		`━━━━━━━━━━━━━━━━━━━━`,
		`💰 <b>Итоговый бюджет: ${budget.totalRub.toLocaleString("ru-RU")} ₽</b>`,
		`🛡️ <b>Гарантия: ${budget.warrantyYears}</b>`,
		"",
		"💡 <i>Вы можете зафиксировать этот расчет прямо сейчас и забронировать время консультации хирурга-имплантолога:</i>",
	].join("\n");

	return {
		text,
		replyMarkup: buildImplantResultKeyboard(implantCode, crownCode),
	};
}

/**
 * Экран успешной фиксации расчета имплантации.
 */
export function presentImplantLockSuccessScreen(): TriageScreenResult {
	const text = [
		"✅ <b>Расчет имплантации зафиксирован!</b>",
		"",
		"Смета «под ключ» сохранена за вашим номером. Администратор клиники забронирует за вами спецпредложение при визите.",
		"",
		"Выберите удобный день для диагностического осмотра:",
	].join("\n");

	return {
		text,
		replyMarkup: buildImplantLockSuccessKeyboard(),
	};
}

/**
 * Калькулятор коронок на зубы.
 */
export function presentCrownCalculatorScreen(): TriageScreenResult {
	const text = [
		"👑 <b>Коронки на зубы (протезирование)</b>",
		"",
		"Ориентировочная стоимость изготовления и установки анатомической коронки:",
	].join("\n");

	return {
		text,
		replyMarkup: buildCrownCalculatorKeyboard(),
	};
}

/**
 * Калькулятор лечения кариеса.
 */
export function presentCariesCalculatorScreen(): TriageScreenResult {
	const text = [
		"🦷 <b>Лечение кариеса и реставрация зубов</b>",
		"",
		"В стоимость входит: анестезия, коффердам (изоляция), бережное препарирование, светоотверждаемый наногибридный композит и шлифовка:",
	].join("\n");

	return {
		text,
		replyMarkup: buildCariesCalculatorKeyboard(),
	};
}

/**
 * Калькулятор отбеливания.
 */
export function presentWhiteningCalculatorScreen(): TriageScreenResult {
	const text = [
		"✨ <b>Профессиональное отбеливание зубов</b>",
		"",
		"Выберите технологию:",
	].join("\n");

	return {
		text,
		replyMarkup: buildWhiteningCalculatorKeyboard(),
	};
}

/**
 * Экран фиксации общих расчетов калькулятора.
 */
export function presentGeneralLockSuccessScreen(): TriageScreenResult {
	const text = [
		"✅ <b>Стоимость зафиксирована!</b>",
		"",
		"Предварительный расчет сохранён. Запишитесь на осмотр для подтверждения плана лечения врачом:",
	].join("\n");

	return {
		text,
		replyMarkup: buildGeneralLockSuccessKeyboard(),
	};
}

/**
 * Экран перевода на живого администратора.
 */
export function presentHumanTakeoverScreen(): TriageScreenResult {
	const text = [
		"👨‍💼 <b>Чат переведён на администратора клиники</b>",
		"",
		"Бот временно отключен для этого диалога. Дежурный администратор уже видит ваше обращение и ответит вам прямо в этом чате в течение нескольких минут.",
		"",
		"Напишите ваш вопрос или оставьте контактный номер телефона. Если захотите вернуться к меню бота, нажмите кнопку ниже:",
	].join("\n");

	return {
		text,
		replyMarkup: buildHumanTakeoverKeyboard(),
	};
}

/**
 * Экран подтверждения приёма фотографии.
 */
export function presentPhotoIntakeSuccessScreen(): TriageScreenResult {
	const text = [
		"📸 <b>Фотография успешно получена!</b>",
		"",
		"Снимок безопасно сохранён во входящих материалах клиники DENTE (в защищенном контуре 152-ФЗ / 323-ФЗ без публичного доступа).",
		"Врач ознакомится с вашим снимком перед приёмом.",
		"",
		"Хотите записаться на консультацию или рассчитать предварительный бюджет лечения?",
	].join("\n");

	return {
		text,
		replyMarkup: buildPhotoIntakeSuccessKeyboard(),
	};
}

/**
 * Экран ошибки загрузки фото из Telegram.
 */
export function presentPhotoIntakeErrorScreen(): TriageScreenResult {
	const text =
		"К сожалению, не удалось загрузить снимок из Telegram. Попробуйте отправить фото ещё раз или покажите снимок администратору при визите.";

	return {
		text,
		replyMarkup: buildPhotoIntakeFailedKeyboard(),
	};
}
