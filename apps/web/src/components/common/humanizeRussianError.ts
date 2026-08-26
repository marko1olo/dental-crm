/**
 * ============================================================================
 * HUMANIZE RUSSIAN ERROR (ПЕРЕВОД ТЕХНИЧЕСКИХ ОШИБОК НА ПОНЯТНЫЙ РУССКИЙ ЯЗЫК)
 * "БАБУШКА-PROOF" / Защита медсестры и регистратора от стектрейсов и непонятных кодов
 * ============================================================================
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
	const lower = rawStr.toLowerCase();

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

	// 5. Авторизация и доступ (401 / 403)
	if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("forbidden")) {
		return {
			titleRu: "Сессия сотрудника истекла",
			descriptionRu: "Время безопасной работы под вашим паролем подошло к концу.",
			actionAdviceRu: "Введите свой PIN-код или пароль заново для продолжения работы.",
			rawMessage: rawStr,
		};
	}

	// 6. Просрочка крафт-пакета / СанПиН
	if (lower.includes("expired") || lower.includes("просроч") || lower.includes("breached") || lower.includes("брак")) {
		return {
			titleRu: "Использование крафт-пакета заблокировано СанПиН",
			descriptionRu: "Срок сохранения стерильности инструментов истёк или упаковка повреждена.",
			actionAdviceRu: "Возьмите свежий крафт-пакет из шкафа стерильных материалов. Просроченный пакет направьте на повторную стерилизацию.",
			rawMessage: rawStr,
		};
	}

	// 7. Дублирование номера телефона или карты
	if (lower.includes("duplicate") || lower.includes("уже существует") || lower.includes("unique")) {
		return {
			titleRu: "Пациент с такими данными уже есть в базе",
			descriptionRu: "В клинике уже зарегистрирована карта с таким номером телефона или ФИО.",
			actionAdviceRu: "Воспользуйтесь строкой поиска сверху, чтобы найти существующую карту пациента.",
			rawMessage: rawStr,
		};
	}

	// 8. Общая понятная ошибка
	return {
		titleRu: "Действие не удалось выполнить",
		descriptionRu: "Программа столкнулась с ошибкой: " + (rawStr.length > 120 ? rawStr.slice(0, 117) + "..." : rawStr),
		actionAdviceRu: "Проверьте заполненные поля и попробуйте нажать кнопку еще раз.",
		rawMessage: rawStr,
	};
}
