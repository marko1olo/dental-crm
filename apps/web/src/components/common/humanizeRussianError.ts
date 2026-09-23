/**
 * ============================================================================
 * HUMANIZE RUSSIAN ERROR (ПЕРЕВОД ТЕХНИЧЕСКИХ ОШИБОК НА ПОНЯТНЫЙ РУССКИЙ ЯЗЫК)
 * "БАБУШКА-PROOF" / Защита медсестры и регистратора от стектрейсов и непонятных кодов
 * ============================================================================
 * Мандат 8v: Полная ликвидация крафт-пакетного заражения.
 * Специфические ошибки СанПиН/стерилизации срабатывают ТОЛЬКО при явном наличии
 * слов 'kraft', 'крафт', 'стерилизац', 'steril'.
 * Ошибки сессии (jwt expired, token expired, session expired) и скидок/акций
 * изолированы в собственные понятные сообщения.
 * Мандат 8e: Автономия врача и администратора, ноль ложных блокировок.
 */

export interface HumanizedError {
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly actionAdviceRu: string;
	readonly rawMessage?: string | undefined;
}

export function humanizeRussianError(error: unknown): HumanizedError {
	if (!error) {
		return {
			titleRu: "Произошла непредвиденная заминка",
			descriptionRu: "Действие не завершено, но программа продолжает работать.",
			actionAdviceRu: "Попробуйте повторить действие через несколько секунд.",
		};
	}

	const rawStr = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
	const lower = rawStr.toLowerCase().replace(/ё/g, "е");

	// 1. Сеть и подключение
	if (
		lower.includes("failed to fetch") ||
		lower.includes("networkerror") ||
		lower.includes("econnrefused") ||
		lower.includes("offline") ||
		lower.includes("net::err_internet_disconnected")
	) {
		return {
			titleRu: "Временная потеря связи с сервером клиники",
			descriptionRu: "Компьютер потерял связь с базой данных клиники или интернет-соединением.",
			actionAdviceRu: "Проверьте сетевой провод и нажмите кнопку ещё раз. Все введённые данные сохранены в черновике.",
			rawMessage: rawStr,
		};
	}

	// 2. Ошибки ККТ / Фискального регистратора 54-ФЗ
	if (
		lower.includes("kkt") ||
		lower.includes("fiscal") ||
		lower.includes("atol") ||
		lower.includes("штрих") ||
		lower.includes("paper_out") ||
		lower.includes("чековая лента")
	) {
		if (lower.includes("paper") || lower.includes("лент")) {
			return {
				titleRu: "Закончилась кассовая лента",
				descriptionRu: "В фискальном регистраторе закончилась термобумага для чеков.",
				actionAdviceRu: "Откройте крышку кассового аппарата, вставьте новый рулон ленты и нажмите «Повторить печать».",
				rawMessage: rawStr,
			};
		}
		return {
			titleRu: "Кассовый аппарат временно недоступен",
			descriptionRu: "Программа не смогла отправить команду на фискальный регистратор.",
			actionAdviceRu: "Проверьте, включен ли кассовый аппарат в розетку и подключен ли провод USB. Чек сохранен в очереди автоповтора.",
			rawMessage: rawStr,
		};
	}

	// 3. Конфликты расписания / Врач или кресло заняты (409 Conflict)
	if (
		lower.includes("conflict") ||
		lower.includes("409") ||
		lower.includes("overlap") ||
		lower.includes("накладка") ||
		lower.includes("уже занят")
	) {
		return {
			titleRu: "Выбранное время уже занято",
			descriptionRu: "У выбранного врача или кресла в это время уже стоит другой приём.",
			actionAdviceRu: "Пожалуйста, выберите соседнее свободное время в расписании или другого врача.",
			rawMessage: rawStr,
		};
	}

	// 4. Пациент в черном списке / Блокировка
	if (
		lower.includes("blacklist") ||
		lower.includes("черный список") ||
		lower.includes("blocked") ||
		lower.includes("заблокирован")
	) {
		return {
			titleRu: "Пациент находится в списке ограничений",
			descriptionRu: "Запись данного пациента требует согласования с руководством клиники.",
			actionAdviceRu: "Обратитесь к старшему администратору или управляющему перед созданием записи.",
			rawMessage: rawStr,
		};
	}

	// 5. Авторизация, сессия сотрудника и токены доступа (401 / 403 / JWT / Expired Token)
	// Мандат 8v: Ошибки истечения токенов/сессии не должны перехватываться общим словом 'expired'
	const isSessionAuthError =
		lower.includes("401") ||
		lower.includes("403") ||
		lower.includes("unauthorized") ||
		lower.includes("forbidden") ||
		lower.includes("jwt") ||
		lower.includes("session expired") ||
		lower.includes("session has expired") ||
		lower.includes("token expired") ||
		lower.includes("token is expired") ||
		lower.includes("expired token") ||
		lower.includes("token_expired") ||
		lower.includes("tokenexpired") ||
		(lower.includes("сесси") && (lower.includes("истек") || lower.includes("заверш") || lower.includes("просроч"))) ||
		(lower.includes("токен") && (lower.includes("истек") || lower.includes("просроч") || lower.includes("недействительн")));

	if (isSessionAuthError) {
		return {
			titleRu: "Сессия сотрудника истекла",
			descriptionRu: "Время безопасной работы под вашим паролем или токеном авторизации подошло к концу.",
			actionAdviceRu: "Введите свой PIN-код или пароль заново для продолжения работы. Введённые данные не потеряны.",
			rawMessage: rawStr,
		};
	}

	// 6. Скидки, промокоды, купоны и акции (Discounts & Promo Codes)
	// Мандат 8e: Автономия врача по скидкам
	const isDiscountOrPromo =
		lower.includes("discount") ||
		lower.includes("скидк") ||
		lower.includes("coupon") ||
		lower.includes("купон") ||
		lower.includes("promo") ||
		lower.includes("промокод");

	if (
		isDiscountOrPromo &&
		(lower.includes("expired") ||
			lower.includes("просроч") ||
			lower.includes("истек") ||
			lower.includes("invalid") ||
			lower.includes("недействительн") ||
			lower.includes("not found") ||
			lower.includes("не найден"))
	) {
		return {
			titleRu: "Срок действия скидки или промокода истёк",
			descriptionRu: "Указанная скидка, купон или специальное предложение больше не действуют.",
			actionAdviceRu: "Примените стандартный прайс или установите согласованную скидку вручную по праву врача (Мандат 8e).",
			rawMessage: rawStr,
		};
	}

	// 7. Стерилизация и крафт-пакеты (СанПиН 3.3686-21)
	// Мандат 8v: Строго изолированная детекция — ТОЛЬКО если в тексте ошибки ЯВНО фигурирует kraft или стерилизац
	const isKraftOrSterilization =
		lower.includes("kraft") ||
		lower.includes("крафт") ||
		lower.includes("стерилизац") ||
		lower.includes("steril");

	if (
		isKraftOrSterilization &&
		(lower.includes("expired") ||
			lower.includes("просроч") ||
			lower.includes("истек") ||
			lower.includes("breach") ||
			lower.includes("брак") ||
			lower.includes("поврежд") ||
			lower.includes("нарушен") ||
			lower.includes("герметичн") ||
			lower.includes("индикатор") ||
			lower.includes("санпин") ||
			lower.includes("sanpin"))
	) {
		return {
			titleRu: "Использование крафт-пакета заблокировано СанПиН",
			descriptionRu: "Срок сохранения стерильности инструментов истёк или упаковка повреждена.",
			actionAdviceRu: "Возьмите свежий крафт-пакет из шкафа стерильных материалов. Просроченный пакет направьте на повторную стерилизацию.",
			rawMessage: rawStr,
		};
	}

	// 8. Склад и материальные запасы (Warehouse Soft Overdraft per Mandate 8e)
	if (
		(lower.includes("stock") || lower.includes("склад") || lower.includes("inventory") || lower.includes("остат")) &&
		(lower.includes("insufficient") || lower.includes("недостаточно") || lower.includes("out of stock") || lower.includes("закончил"))
	) {
		return {
			titleRu: "Недостаточно материала на складе",
			descriptionRu: "Текущий остаток по позиции меньше списываемого количества.",
			actionAdviceRu: "Приём не блокируется: операция зафиксирована с мягким овердрафтом (Мандат 8e). Оформите приходную накладную.",
			rawMessage: rawStr,
		};
	}

	// 9. ЗТЛ и лабораторные наряды (Зуботехническая лаборатория / Брак или переделка)
	if (
		(lower.includes("ztl") || lower.includes("зтл") || lower.includes("лаборатор") || lower.includes("наряд") || lower.includes("протез")) &&
		(lower.includes("брак") || lower.includes("дефект") || lower.includes("передел"))
	) {
		return {
			titleRu: "Зафиксирован дефект лабораторного изделия",
			descriptionRu: "По наряду ЗТЛ выявлено несоответствие или производственный брак.",
			actionAdviceRu: "Оформите акт гарантийной переделки в 1 клик без блокировки приёма пациента (Мандат 8e).",
			rawMessage: rawStr,
		};
	}

	// 10. Планы лечения и предварительные сметы
	if (
		(lower.includes("plan") || lower.includes("смет") || lower.includes("treatment_plan")) &&
		(lower.includes("expired") || lower.includes("просроч") || lower.includes("истек"))
	) {
		return {
			titleRu: "Срок действия предварительной сметы истёк",
			descriptionRu: "С момента составления плана лечения прошло более 30 дней.",
			actionAdviceRu: "Оказание услуг и оплата не блокируются (Мандат 8e). При необходимости актуализируйте цены в 1 клик.",
			rawMessage: rawStr,
		};
	}

	// 11. Дублирование номера телефона или карты
	if (lower.includes("duplicate") || lower.includes("уже существует") || lower.includes("unique")) {
		return {
			titleRu: "Пациент с такими данными уже есть в базе",
			descriptionRu: "В клинике уже зарегистрирована карта с таким номером телефона или ФИО.",
			actionAdviceRu: "Воспользуйтесь строкой поиска сверху, чтобы найти существующую карту пациента.",
			rawMessage: rawStr,
		};
	}

	// 12. Валидация форм и полей (Zod / Input Validation)
	if (
		lower.includes("validation") ||
		lower.includes("валидац") ||
		lower.includes("zoderror") ||
		lower.includes("invalid input")
	) {
		return {
			titleRu: "Проверьте заполненные поля",
			descriptionRu: "Одно или несколько полей формы содержат неверные данные или пропущены.",
			actionAdviceRu: "Исправьте отмеченные поля и повторите сохранение.",
			rawMessage: rawStr,
		};
	}

	// 13. Общее истечение срока действия (Generic Expired — никогда не крафт-пакет!)
	if (lower.includes("expired") || lower.includes("просроч") || lower.includes("истек срок")) {
		return {
			titleRu: "Срок действия операции истёк",
			descriptionRu: "Время ожидания ответа или срок действия текущего запроса истекли.",
			actionAdviceRu: "Повторите действие или обновите страницу. Все черновики сохранены.",
			rawMessage: rawStr,
		};
	}

	// 14. Общая понятная ошибка
	return {
		titleRu: "Действие не удалось выполнить",
		descriptionRu: "Программа столкнулась с ошибкой: " + (rawStr.length > 120 ? rawStr.slice(0, 117) + "..." : rawStr),
		actionAdviceRu: "Проверьте заполненные поля и попробуйте нажать кнопку еще раз.",
		rawMessage: rawStr,
	};
}
