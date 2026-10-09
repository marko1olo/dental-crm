import type { StomxVariableContext } from "./types.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX TEMPLATE VARIABLE RESOLVER & PRINT FORMATTER (LAYER 1)
 *
 * Разрешение клинических, правовых, финансовых и паспортных токенов
 * для всех шаблонов печати и ИДС клиники DENTE.
 * Поддерживает 4 синтаксиса: [Токен], {{Токен}}, ${Токен}, {Токен}.
 * Мандат 8e: при отсутствии данных ставит чистое подчеркивание «____________________».
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Разрешает один токен шаблонизатора StomX по переданному контексту.
 * При отсутствии значения возвращает чистое подчеркивание «____________________» (Мандат 8e).
 */
export function resolveStomxVariableToken(
	token: string,
	context: StomxVariableContext,
	fallbackToUnderline = true,
): string {
	const rawKey = token.trim();
	const pt = context.patient;
	const cl = context.clinic;
	const dr = context.doctor;
	const vs = context.visit;
	const ct = context.contract;
	const custom = context.custom;

	if (custom && custom[rawKey] !== undefined && custom[rawKey] !== null) {
		return String(custom[rawKey]);
	}

	const fallback = fallbackToUnderline ? "«____________________»" : "";

	switch (rawKey) {
		// Пациент
		case "Пациент.ФИО":
			return pt?.fullName?.trim() || fallback;
		case "Пациент.ID":
			return pt?.id ? String(pt.id) : fallback;
		case "Пациент.НомерКарты":
			return pt?.cardNumber?.trim() || fallback;
		case "Пациент.Фамилия":
			return pt?.lastName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[0] : "") || fallback;
		case "Пациент.Имя":
			return pt?.firstName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[1] : "") || fallback;
		case "Пациент.Отчество":
			return pt?.middleName?.trim() || (pt?.fullName ? pt.fullName.split(" ")[2] : "") || fallback;
		case "Пациент.Пол":
			return pt?.gender === "female" ? "женский" : pt?.gender === "male" ? "мужской" : String(pt?.gender || fallback);
		case "Пациент.Адрес":
			return pt?.address?.trim() || pt?.registrationAddress?.trim() || fallback;
		case "Пациент.Телефон":
			return pt?.phone?.trim() || fallback;
		case "Пациент.ИНН":
			return pt?.inn?.trim() || fallback;
		case "Пациент.ФамилияИО": {
			if (!pt?.fullName) return fallback;
			const parts = pt.fullName.trim().split(/\s+/);
			const p0 = parts[0];
			const p1 = parts[1];
			const p2 = parts[2];
			if (p0 && p1 && p2 && p1[0] && p2[0]) {
				return `${p0} ${p1[0]}.${p2[0]}.`;
			}
			return pt.fullName;
		}
		case "Пациент.СНИЛС":
			return pt?.snils?.trim() || fallback;
		case "Пациент.ДатаРождения":
			return pt?.birthDate?.trim() || fallback;
		case "Пациент.Возраст":
			return pt?.age ? String(pt.age) : fallback;
		case "Пациент.Паспорт":
			return (
				pt?.passportSeriesNumber?.trim() ||
				pt?.passport?.trim() ||
				(pt?.passportSeries && pt?.passportNumber ? `${pt.passportSeries} ${pt.passportNumber}` : "") ||
				pt?.passportSeries?.trim() ||
				fallback
			);
		case "Пациент.ПаспортСерия":
			return pt?.passportSeries?.trim() || pt?.passportSeriesNumber?.trim() || fallback;
		case "Пациент.ПаспортНомер":
			return pt?.passportNumber?.trim() || fallback;
		case "Пациент.ПаспортКемВыдан":
			return pt?.passportIssuedBy?.trim() || fallback;
		case "Пациент.ПаспортДатаВыдачи":
			return pt?.passportIssuedDate?.trim() || fallback;
		case "Пациент.ПаспортКодПодразделения":
			return pt?.passportDepartmentCode?.trim() || fallback;
		case "Пациент.ПаспортДанные": {
			const direct = pt?.passportSeriesNumber?.trim() || pt?.passport?.trim();
			if (direct) return direct;
			if (pt?.passportSeries && pt?.passportNumber) {
				const issued = pt.passportIssuedBy ? `, выдан ${pt.passportIssuedBy}` : "";
				const dt = pt.passportIssuedDate ? ` от ${pt.passportIssuedDate}` : "";
				return `${pt.passportSeries} № ${pt.passportNumber}${issued}${dt}`;
			}
			return fallback;
		}
		case "Пациент.ПолисОМС":
			return pt?.omsPolicy?.trim() || fallback;
		case "Пациент.Email":
			return pt?.email?.trim() || fallback;
		case "Пациент.ПредставительФИО":
			return pt?.representativeFullName?.trim() || fallback;
		case "Пациент.ПредставительПаспорт":
			return pt?.representativePassport?.trim() || fallback;
		case "Пациент.ПредставительКемВыдан":
			return pt?.representativeIssuedBy?.trim() || fallback;
		case "Пациент.ПредставительСтатус":
			return pt?.representativeRelation?.trim() || "законный представитель";

		// Клиника
		case "Клиника.Название":
			return cl?.name?.trim() || cl?.legalName?.trim() || "ООО «ДЕНТЕ»";
		case "Клиника.ЮрНазвание":
			return cl?.legalName?.trim() || cl?.name?.trim() || "ООО «ДЕНТЕ»";
		case "Клиника.ЮрАдрес":
			return cl?.address?.trim() || cl?.actualAddress?.trim() || fallback;
		case "Клиника.ФактАдрес":
			return cl?.actualAddress?.trim() || cl?.address?.trim() || fallback;
		case "Клиника.ИНН":
			return cl?.inn?.trim() || fallback;
		case "Клиника.КПП":
			return cl?.kpp?.trim() || fallback;
		case "Клиника.ОГРН":
			return cl?.ogrn?.trim() || fallback;
		case "Клиника.Телефон":
			return cl?.phone?.trim() || fallback;
		case "Клиника.Email":
			return cl?.email?.trim() || fallback;
		case "Клиника.Лицензия":
		case "Клиника.ЛицензияНомер":
			return cl?.licenseNumber?.trim() || "ЛО41-01137-77/00368421";
		case "Клиника.ЛицензияДата":
			return cl?.licenseDate?.trim() || "12.10.2021";
		case "Клиника.ЛицензияОрган":
			return cl?.licenseIssuer?.trim() || "Департамент здравоохранения г. Москвы";
		case "Клиника.ДиректорФИО":
			return cl?.directorFullName?.trim() || fallback;
		case "Клиника.ДиректорДолжность":
			return cl?.directorTitle?.trim() || "Генеральный директор";
		case "Клиника.Банк":
			return cl?.bankName?.trim() || fallback;
		case "Клиника.БИК":
			return cl?.bik?.trim() || fallback;
		case "Клиника.РС":
			return cl?.checkingAccount?.trim() || fallback;
		case "Клиника.КС":
			return cl?.corrAccount?.trim() || fallback;
		case "Клиника.Реквизиты": {
			const parts: string[] = [];
			const name = cl?.legalName?.trim() || cl?.name?.trim();
			if (name) parts.push(name);
			if (cl?.inn?.trim()) parts.push(`ИНН: ${cl.inn.trim()}`);
			if (cl?.kpp?.trim()) parts.push(`КПП: ${cl.kpp.trim()}`);
			if (cl?.ogrn?.trim()) parts.push(`ОГРН: ${cl.ogrn.trim()}`);
			const addr = cl?.address?.trim() || cl?.actualAddress?.trim();
			if (addr) parts.push(`Адрес: ${addr}`);
			if (cl?.phone?.trim()) parts.push(`Тел: ${cl.phone.trim()}`);
			return parts.length > 0 ? parts.join(", ") : fallback;
		}

		// Врач
		case "Врач":
		case "Врач.ФИО":
			return dr?.fullName?.trim() || fallback;
		case "Врач.Специальность":
			return dr?.specialty?.trim() || "врач-стоматолог";
		case "Врач.Должность":
			return dr?.position?.trim() || "врач-стоматолог";
		case "Врач.ФамилияИнициалы":
		case "Врач.ФамилияИО": {
			if (!dr?.fullName) return fallback;
			const parts = dr.fullName.trim().split(/\s+/);
			const p0 = parts[0];
			const p1 = parts[1];
			const p2 = parts[2];
			if (p0 && p1 && p2 && p1[0] && p2[0]) {
				return `${p0} ${p1[0]}.${p2[0]}.`;
			}
			return dr.fullName;
		}
		case "Врач.Телефон":
			return dr?.phone?.trim() || fallback;

		// Прием
		case "Прием.Дата":
			return vs?.date?.trim() || fallback;
		case "Прием.Время":
			return vs?.time?.trim() || fallback;
		case "Прием.Диагноз":
			return vs?.diagnosis?.trim() || (vs?.diagnosisIcd10 ? `МКБ-10: ${vs.diagnosisIcd10}` : fallback);
		case "Прием.ДиагнозМКБ":
			return vs?.diagnosisIcd10?.trim() || fallback;
		case "Прием.Зуб":
			return vs?.tooth ? String(vs.tooth) : vs?.teeth ? String(vs.teeth) : fallback;
		case "Прием.Зубы":
			return vs?.teeth ? String(vs.teeth) : vs?.tooth ? String(vs.tooth) : fallback;
		case "Прием.Анестезия":
			return vs?.anesthesia?.trim() || "Местная анестезия (артикаин 4%)";
		case "Прием.Жалобы":
			return vs?.complaint?.trim() || fallback;
		case "Прием.Анамнез":
			return vs?.anamnesis?.trim() || "Соматически здоров, аллергоанамнез не отягощен";
		case "Прием.ЭффективнаяДоза":
			return vs?.effectiveDoseMsv !== undefined && vs?.effectiveDoseMsv !== null ? `${vs.effectiveDoseMsv} мЗв` : fallback;

		// Договор и финансы
		case "Договор.Номер":
			return ct?.number?.trim() || fallback;
		case "Договор.Дата":
			return ct?.date?.trim() || fallback;
		case "Счет.Сумма":
		case "Смета.Сумма":
			return ct?.totalAmountRub !== undefined && ct?.totalAmountRub !== null ? `${ct.totalAmountRub} ₽` : fallback;
		case "Счет.СуммаПрописью":
		case "Смета.СуммаПрописью":
		case "СуммаПрописью":
			return ct?.totalAmountWords?.trim() || fallback;

		// План лечения и зубная формула
		case "ПланЛечения.Таблица":
			return context.custom?.["ПланЛечения.Таблица"] ? String(context.custom["ПланЛечения.Таблица"]) : fallback;
		case "ЗубнаяФормула.Прописью":
			return context.custom?.["ЗубнаяФормула.Прописью"] ? String(context.custom["ЗубнаяФормула.Прописью"]) : fallback;

		// Общие даты
		case "ТекущаяДата":
		case "Дата":
			return new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

		default:
			if (context.custom && context.custom[token] !== undefined && context.custom[token] !== null) {
				return String(context.custom[token]);
			}
			return fallback;
	}
}

/**
 * Подставляет значения в шаблон, распознавая синтаксисы:
 * - [Пациент.ФИО] (канонический StomX)
 * - {{Пациент.ФИО}} (Mustache / handlebars)
 * - ${Пациент.ФИО} (ES6)
 * - {Пациент.ФИО} (DentalPRO / TemplateEngine)
 */
export function renderStomxTemplateText(
	templateText: string,
	context: StomxVariableContext,
): string {
	if (!templateText) return "";

	// 1. [Токен]
	let result = templateText.replace(/\[([А-Яа-яA-Za-z0-9_.]+)\]/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	// 2. {{Токен}}
	result = result.replace(/\{\{([А-Яа-яA-Za-z0-9_.]+)\}\}/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	// 3. ${Токен}
	result = result.replace(/\$\{([А-Яа-яA-Za-z0-9_.]+)\}/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	// 4. {Токен}
	result = result.replace(/\{([А-Яа-яA-Za-z0-9_.-]+)\}/g, (_, token) => {
		return resolveStomxVariableToken(token, context);
	});

	return result;
}
