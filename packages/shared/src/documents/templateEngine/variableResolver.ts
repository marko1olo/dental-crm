import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	rublesToKopecks,
} from "../../money.js";
import { integerToWordsRu, kopecksToWordsRu } from "../../moneyWordsRu.js";
import {
	type DentalFormulaRecordInput,
	generateDentalFormulaBreakdownText,
	renderGraphicalDentalFormulaHtml,
	resolveAllTeethTokens,
} from "../dentalFormulaRenderer.js";
import {
	calculatePatientAgeString,
	extractYearFromDate,
	formatDateDdMmYyyy,
	formatDateFullRussian,
	formatDateRussianDayMonthYear,
	formatInitials,
	formatMoney,
	formatPassportFullString,
} from "./dateAndAgeHelpers.js";
import type {
	InterpolateVariablesOptions,
	TemplateExecutionContext,
} from "./types.js";

/**
 * Строит карту значений всех токенов на основе контекста
 */
export function buildTemplateVariablesMap(
	ctx: TemplateExecutionContext,
): Record<string, string> {
	const map: Record<string, string> = {};

	// Текущая дата
	const curDate = ctx.currentDate ? new Date(ctx.currentDate) : new Date();
	const curDateDdMmYyyy = formatDateDdMmYyyy(curDate);
	const curDateFull = formatDateFullRussian(curDate);
	map["ТекущаяДата"] = curDateDdMmYyyy;
	map["ТекущаяПолнаяДата"] = curDateFull;
	map["ТекущаяДатаПолная"] = curDateFull;

	// Пациент
	const p = ctx.patient ?? {};
	const pFullName =
		p.fullName ??
		[p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
	const pParts = pFullName ? pFullName.trim().split(/\s+/).filter(Boolean) : [];
	const pLastName = p.lastName ?? pParts[0] ?? "";
	const pFirstName = p.firstName ?? pParts[1] ?? "";
	const pMiddleName = p.middleName ?? pParts[2] ?? "";
	const pLastNameUpper = pLastName.toUpperCase();
	const pLastNameUpperFullName = pLastNameUpper
		? [pLastNameUpper, pFirstName, pMiddleName].filter(Boolean).join(" ")
		: pFullName;
	const pInitials = formatInitials(pFullName);

	const pGenderStr =
		p.gender === "male" ||
		p.gender === "муж" ||
		p.gender === "мужской" ||
		p.gender === "Мужской"
			? "Мужской"
			: p.gender === "female" ||
					p.gender === "жен" ||
					p.gender === "женский" ||
					p.gender === "Женский"
				? "Женский"
				: (p.gender ?? "");

	const pBirthDateStr = formatDateDdMmYyyy(p.birthDate);
	const pBirthDateFull = formatDateRussianDayMonthYear(p.birthDate);
	const pBirthYear = extractYearFromDate(p.birthDate);
	const pAgeStr =
		p.age !== undefined && p.age !== null
			? String(p.age)
			: calculatePatientAgeString(p.birthDate);
	const pPassport = p.passport ?? {};
	const pPassportFull = formatPassportFullString(pPassport);

	const pAddress = p.address || p.actualAddress || "";
	const pActualAddress = p.actualAddress || p.address || "";
	const pPhone = p.phone || p.mobilePhone || "";
	const pPhones = [p.mobilePhone || p.phone, p.homePhone]
		.filter(Boolean)
		.join("; ");

	map["Пациент.ФИО"] = pFullName || "";
	map["Пациент.ID"] = p.id !== undefined && p.id !== null ? String(p.id) : "";
	map["Пациент.НомерКарты"] =
		p.cardNumber !== undefined && p.cardNumber !== null
			? String(p.cardNumber)
			: "";
	map["Пациент.НомерМедкарты"] = map["Пациент.НомерКарты"];
	map["Пациент.Фамилия"] = pLastName || "";
	map["Пациент.Имя"] = pFirstName || "";
	map["Пациент.Отчество"] = pMiddleName || "";
	map["Пациент.Пол"] = pGenderStr || "";
	map["Пациент.Адрес"] = pAddress;
	map["Пациент.Телефон"] = pPhone;
	map["Пациент.ИНН"] = p.inn || "";
	map["Пациент.ФамилияИО"] = pInitials;
	map["Пациент.ФИО.Инициалы"] = pInitials;
	map["Пациент.ДеньРождения"] = pBirthDateStr || "";
	map["Пациент.Возраст"] = pAgeStr || "";
	map["Пациент.ФактическийАдрес"] = pActualAddress;
	map["Пациент.Email"] = p.email || "";
	map["Пациент.СНИЛС"] = p.snils || "";
	map["Пациент.Инвалидность"] =
		p.disability !== undefined && p.disability !== null
			? String(p.disability)
			: "нет";
	map["Пациент.Льготы"] =
		p.benefits !== undefined && p.benefits !== null
			? String(p.benefits)
			: "нет";
	map["Пациент.Профессия"] = p.profession || "";
	map["Пациент.ОсобыеОтметки"] = p.specialNotes || "";
	map["Пациент.Полисы"] =
		p.policies || (p.omsPolicy ? `ОМС ${p.omsPolicy}` : "");
	map["Пациент.ПолисОМС"] = p.omsPolicy || "";
	map["Пациент.ПолисДМС"] = p.dmsPolicy || "";
	map["Пациент.Аванс"] =
		p.advance !== undefined && p.advance !== null ? String(p.advance) : "0";
	map["Пациент.Паспорт"] =
		pPassportFull ||
		[pPassport.series, pPassport.number].filter(Boolean).join(" ");
	map["Пациент.ПаспортДанные"] = pPassportFull || "";
	map["Пациент.Паспорт.Номер"] = pPassport.number || "";
	map["Пациент.Паспорт.Серия"] = pPassport.series || "";
	map["Пациент.Паспорт.СерияНомер"] = [pPassport.series, pPassport.number]
		.filter(Boolean)
		.join(" ");
	map["Пациент.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(pPassport.issuedDate);
	map["Пациент.Паспорт.КемВыдан"] = pPassport.issuedBy || "";
	map["Пациент.Паспорт.КодПодразделения"] = pPassport.divisionCode || "";

	// Плоские теги пациента (IDENT / DentalPRO)
	map["ФАМИЛИЯИмяОтчество"] = pLastNameUpperFullName || "";
	map["ФамилияИмяОтчество"] = pFullName || "";
	map["ФамилияИО"] = pInitials || "";
	map["Фамилия"] = pLastName || "";
	map["Имя"] = pFirstName || "";
	map["Отчество"] = pMiddleName || "";
	map["ДатаРождения"] = pBirthDateFull || pBirthDateStr || "";
	map["ГодРождения"] = pBirthYear || "";
	map["Возраст"] = pAgeStr || "";
	map["Пол"] = pGenderStr || "";
	map["Телефоны"] = pPhone || pPhones || "";
	map["МобТелефон"] = p.mobilePhone || pPhone || "";
	map["ДомТелефон"] = p.homePhone || "";
	map["Email"] = p.email || "";
	map["Адрес"] = pActualAddress || pAddress;
	map["АдресРегистрации"] = p.address || pAddress;
	map["ДатаРегистрации"] = formatDateDdMmYyyy(p.registrationDate);
	map["ИНН"] = p.inn || "";
	map["СНИЛС"] = p.snils || "";
	map["ИИН"] = p.iin || "";
	map["МестоРаботы"] = p.workplace || "";
	map["Профессия"] = p.profession || "";
	map["Полисы"] = map["Пациент.Полисы"];
	map["Комментарий"] = p.comment || p.specialNotes || "";
	map["НомерКарты"] = map["Пациент.НомерКарты"];
	map["НомерМедкарты"] = map["Пациент.НомерМедкарты"];
	map["ДатаПервогоПриема"] = formatDateFullRussian(p.firstVisitDate);
	map["ДатаПервогоПриемаЧислом"] = formatDateDdMmYyyy(p.firstVisitDate);
	map["Родитель"] = p.parentName || (ctx.representative?.fullName ?? "");
	map["МестоРождения"] = p.birthPlace || "";
	map["Документ"] = pPassportFull;
	map["Документ.ТипДокумента"] = pPassport.number ? "Паспорт РФ" : "";
	map["Документ.СерияНомер"] = map["Пациент.Паспорт.СерияНомер"];
	map["Документ.СерияНомер.Серия"] = pPassport.series || "";
	map["Документ.СерияНомер.Номер"] = pPassport.number || "";
	map["Документ.Выдан"] = pPassport.number
		? `Выдан: ${formatDateDdMmYyyy(pPassport.issuedDate)}, ${pPassport.issuedBy || ""}, Код подразделения: ${pPassport.divisionCode || ""}`.trim()
		: "";
	map["Документ.Выдан.ДатаВыдачи"] = formatDateDdMmYyyy(pPassport.issuedDate);
	map["Документ.Выдан.КодПодразделения"] = pPassport.divisionCode || "";
	map["Документ.Выдан.КемВыдан"] = pPassport.issuedBy || "";

	// Соматический и аллергологический статус
	const somaticStatusStr =
		p.somaticStatus ||
		"Соматически здоров, хронических заболеваний не выявлено";
	const allergyStatusStr =
		p.allergyStatus ||
		p.specialNotes ||
		"Аллергологический анамнез не отягощен";
	const drugIntoleranceStr =
		p.drugIntolerance || "Непереносимость лекарственных препаратов отрицает";
	map["Пациент.СоматическийСтатус"] = somaticStatusStr;
	map["СоматическийСтатус"] = somaticStatusStr;
	map["Аллергостатус"] = allergyStatusStr;
	map["Аллергии"] = allergyStatusStr;
	map["НепереносимостьПрепаратов"] = drugIntoleranceStr;

	// Законный представитель
	const rep = ctx.representative ?? {};
	const repFullName = rep.fullName || "";
	const repParts = repFullName
		? repFullName.trim().split(/\s+/).filter(Boolean)
		: [];
	const repLastName = repParts[0] ?? "";
	const repFirstName = repParts[1] ?? "";
	const repMiddleName = repParts[2] ?? "";
	const repLastNameUpper = repLastName.toUpperCase();
	const repLastNameUpperFullName = repLastNameUpper
		? [repLastNameUpper, repFirstName, repMiddleName].filter(Boolean).join(" ")
		: repFullName;
	const repInitials = rep.initials || formatInitials(repFullName);
	const repPassport = rep.passport ?? {};
	const repPassportFull = formatPassportFullString(repPassport);
	const repGenderStr =
		rep.gender === "male" || rep.gender === "муж" || rep.gender === "мужской"
			? "мужской"
			: rep.gender === "female" ||
					rep.gender === "жен" ||
					rep.gender === "женский"
				? "женский"
				: (rep.gender ?? "");
	const repBirthDateStr = formatDateDdMmYyyy(rep.birthDate);
	const repBirthDateFull = formatDateRussianDayMonthYear(rep.birthDate);
	const repBirthYear = extractYearFromDate(rep.birthDate);
	const repAgeStr =
		rep.age !== undefined && rep.age !== null
			? String(rep.age)
			: calculatePatientAgeString(rep.birthDate);

	map["Представитель.ФИО"] = repFullName;
	map["Представитель.ФамилияИнициалы"] = repInitials;
	map["Представитель.Телефон"] = rep.phone || rep.mobilePhone || "";
	map["Представитель.Паспорт.Номер"] = repPassport.number || "";
	map["Представитель.Паспорт.Серия"] = repPassport.series || "";
	map["Представитель.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(
		repPassport.issuedDate,
	);
	map["Представитель.Паспорт.КемВыдан"] = repPassport.issuedBy || "";
	map["Представитель.Паспорт.КодПодразделения"] =
		repPassport.divisionCode || "";
	map["Представитель.ДеньРождения"] = repBirthDateStr;
	map["Представитель.Адрес"] = rep.address || "";
	map["Представитель.СНИЛС"] = rep.snils || "";
	map["Представитель.НаОсновании"] =
		rep.basis || (repPassport.number ? "Паспорт" : "");
	map["Представитель.Основание"] = map["Представитель.НаОсновании"];
	map["Представитель.Тип"] = rep.relationType || "";
	map["Представитель.Родство"] = rep.relationType || "";

	// ИДЕНТ-алиасы представителя
	map["Представитель.ФАМИЛИЯИмяОтчество"] = repLastNameUpperFullName;
	map["Представитель.ФамилияИмяОтчество"] = repFullName;
	map["Представитель.ФамилияИО"] = repInitials;
	map["Представитель.Фамилия"] = repLastName;
	map["Представитель.Имя"] = repFirstName;
	map["Представитель.Отчество"] = repMiddleName;
	map["Представитель.ДатаРождения"] = repBirthDateFull || repBirthDateStr;
	map["Представитель.ГодРождения"] = repBirthYear;
	map["Представитель.Возраст"] = repAgeStr;
	map["Представитель.Пол"] = repGenderStr;
	map["Представитель.Телефоны"] =
		[rep.mobilePhone || rep.phone, rep.homePhone].filter(Boolean).join("; ") ||
		rep.phone ||
		"";
	map["Представитель.МобТелефон"] = rep.mobilePhone || rep.phone || "";
	map["Представитель.ДомТелефон"] = rep.homePhone || "";
	map["Представитель.Email"] = rep.email || "";
	map["Представитель.АдресРегистрации"] = rep.address || "";
	map["Представитель.ДатаРегистрации"] = formatDateDdMmYyyy(
		rep.registrationDate,
	);
	map["Представитель.ИНН"] = rep.inn || "";
	map["Представитель.ИИН"] = rep.iin || "";
	map["Представитель.МестоРождения"] = rep.birthPlace || "";
	map["Представитель.Документ"] = repPassportFull;
	map["Представитель.Документ.ТипДокумента"] = repPassport.number
		? "Паспорт РФ"
		: "";
	map["Представитель.Документ.СерияНомер"] = [
		repPassport.series,
		repPassport.number,
	]
		.filter(Boolean)
		.join(" ");
	map["Представитель.Документ.СерияНомер.Серия"] = repPassport.series || "";
	map["Представитель.Документ.СерияНомер.Номер"] = repPassport.number || "";
	map["Представитель.Документ.Выдан"] = repPassport.number
		? `Выдан: ${formatDateDdMmYyyy(repPassport.issuedDate)}, ${repPassport.issuedBy || ""}, Код подразделения: ${repPassport.divisionCode || ""}`.trim()
		: "";
	map["Представитель.Документ.Выдан.ДатаВыдачи"] = formatDateDdMmYyyy(
		repPassport.issuedDate,
	);
	map["Представитель.Документ.Выдан.КодПодразделения"] =
		repPassport.divisionCode || "";
	map["Представитель.Документ.Выдан.КемВыдан"] = repPassport.issuedBy || "";

	// Полномочный представитель (по доверенности)
	const auth = ctx.authorizedPerson ?? {};
	const authFullName = auth.fullName || "";
	const authPassport = auth.passport ?? {};
	map["Полномочный.ФИО"] = authFullName;
	map["Полномочный.ФамилияИнициалы"] =
		auth.initials || formatInitials(authFullName);
	map["Полномочный.Телефон"] = auth.phone || "";
	map["Полномочный.Паспорт.Номер"] = authPassport.number || "";
	map["Полномочный.Паспорт.Серия"] = authPassport.series || "";
	map["Полномочный.Паспорт.ДатаВыдачи"] = formatDateDdMmYyyy(
		authPassport.issuedDate,
	);
	map["Полномочный.Паспорт.КемВыдан"] = authPassport.issuedBy || "";
	map["Полномочный.Паспорт.КодПодразделения"] = authPassport.divisionCode || "";
	map["Полномочный.ДеньРождения"] = formatDateDdMmYyyy(auth.birthDate);
	map["Полномочный.Адрес"] = auth.address || "";
	map["Полномочный.СНИЛС"] = auth.snils || "";

	// Врач последнего приема
	const ld = ctx.lastDoctor ?? {};
	const ldFullName = ld.fullName || "";
	map["ПоследнийПриём.Врач.ФИО"] = ldFullName;
	map["ПоследнийПриём.Врач.ФамилияИнициалы"] =
		ld.initials || formatInitials(ldFullName);
	map["ПоследнийПриём.Врач.Должность"] = ld.position || "";
	map["ПоследнийПриём.Врач.Специальность"] = ld.specialty || "";

	// Администратор
	const adm = ctx.administrator ?? {};
	const admFullName = adm.fullName || "";
	map["Администратор.ФИО"] = admFullName;
	map["Администратор.ФамилияИнициалы"] =
		adm.initials || formatInitials(admFullName);
	map["Администратор.Должность"] = adm.position || "Администратор";
	map["Администратор.Специальность"] = adm.specialty || "Администратор";

	// Активный врач
	const doc = ctx.doctor ?? {};
	const docFullName = doc.fullName || "";
	map["АктивныйВрач.ФИО"] = docFullName;
	map["АктивныйВрач.ФамилияИнициалы"] =
		doc.initials || formatInitials(docFullName);
	map["АктивныйВрач.Должность"] = doc.position || "Врач-стоматолог";
	map["АктивныйВрач.Специальность"] = doc.specialty || "Стоматология";

	map["Врач.ФИО"] = docFullName;
	map["Врач.ФамилияИнициалы"] = map["АктивныйВрач.ФамилияИнициалы"];
	map["Врач.Должность"] = map["АктивныйВрач.Должность"];
	map["Врач.Специальность"] = map["АктивныйВрач.Специальность"];
	map["Врач"] = docFullName;

	// Текущий пользователь (сотрудник, печатающий документ)
	const cu = ctx.currentUser ?? ctx.administrator ?? ctx.doctor ?? {};
	const cuFullName = cu.fullName || admFullName || docFullName || "";
	const cuParts = cuFullName
		? cuFullName.trim().split(/\s+/).filter(Boolean)
		: [];
	const cuLastName = cuParts[0] ?? "";
	const cuFirstName = cuParts[1] ?? "";
	const cuMiddleName = cuParts[2] ?? "";
	const cuLastNameUpper = cuLastName.toUpperCase();
	const cuLastNameUpperFullName = cuLastNameUpper
		? [cuLastNameUpper, cuFirstName, cuMiddleName].filter(Boolean).join(" ")
		: cuFullName;
	const cuInitials = cu.initials || formatInitials(cuFullName);

	map["ТекущийПользователь.Должность"] = cu.position || "Администратор";
	map["ТекущийПользователь.ФАМИЛИЯИмяОтчество"] = cuLastNameUpperFullName;
	map["ТекущийПользователь.ФамилияИмяОтчество"] = cuFullName;
	map["ТекущийПользователь.ФамилияИО"] = cuInitials;
	map["ТекущийПользователь.Фамилия"] = cuLastName;
	map["ТекущийПользователь.Имя"] = cuFirstName;
	map["ТекущийПользователь.Отчество"] = cuMiddleName;

	// Клиника
	const cl = ctx.clinic ?? {};
	const clinicName = cl.name || "";
	const clinicPhone = cl.phone || "";
	const clinicAddress = cl.address || "";
	map["Клиника.Название"] = clinicName;
	map["Клиника.ИНН"] = cl.inn || "";
	map["Клиника.КПП"] = cl.kpp || "";
	map["Клиника.ОГРН"] = cl.ogrn || "";
	map["Клиника.Адрес"] = clinicAddress;
	map["Клиника.Телефон"] = clinicPhone;
	map["Клиника.Лицензия.Номер"] = cl.licenseNumber || "";
	map["Клиника.ЛицензияНомер"] = cl.licenseNumber || "";
	map["Клиника.Лицензия.ДатаВыдачи"] = formatDateDdMmYyyy(cl.licenseIssuedDate);
	map["Клиника.ЛицензияДата"] = formatDateDdMmYyyy(cl.licenseIssuedDate);
	map["Клиника.Лицензия.СрокДействия"] = cl.licenseValidity || "Бессрочно";
	map["Клиника.Лицензия.КемВыдана"] = cl.licenseIssuer || "";
	map["Клиника.ЛицензияОрган"] = cl.licenseIssuer || "";
	map["Клиника.Лицензия"] = cl.licenseNumber
		? `№ ${cl.licenseNumber} от ${formatDateDdMmYyyy(cl.licenseIssuedDate)}${cl.licenseIssuer ? `, выдана: ${cl.licenseIssuer}` : ""}`.trim()
		: "";

	const clinicReqParts = [
		cl.inn ? `ИНН ${cl.inn}` : "",
		cl.kpp ? `КПП ${cl.kpp}` : "",
		cl.ogrn ? `ОГРН ${cl.ogrn}` : "",
		cl.bankName ? `Банк: ${cl.bankName}` : "",
		cl.bik ? `БИК ${cl.bik}` : "",
		cl.checkingAccount ? `Р/с ${cl.checkingAccount}` : "",
		cl.corrAccount ? `К/с ${cl.corrAccount}` : "",
	].filter(Boolean);
	map["Клиника.Реквизиты"] = clinicReqParts.join(", ") || "";

	map["КомпанияНазвание"] = clinicName;
	map["КомпанияТелефон"] = clinicPhone;
	map["КомпанияАдрес"] = clinicAddress;
	map["Логотип"] = cl.logoUrl
		? `<img src="${cl.logoUrl}" alt="Логотип" class="clinic-logo" />`
		: "";

	// Прием
	const app = ctx.appointment ?? {};
	map["Прием.Ид"] =
		app.id !== undefined && app.id !== null ? String(app.id) : "";
	map["Прием.Дата"] = formatDateDdMmYyyy(app.date);
	map["Прием.ПолнаяДата"] = app.fullDate || formatDateFullRussian(app.date);
	map["Прием.Время"] = app.time || "";

	// Склад
	const wh = ctx.warehouse ?? {};
	map["Склад.Название"] = wh.name || "";
	map["Склад.Материалы.Название"] = wh.materialName || "";
	map["Склад.Материалы.МинимальныйПорог"] =
		wh.minThreshold !== undefined && wh.minThreshold !== null
			? String(wh.minThreshold)
			: "";
	map["Склад.Материалы.Остаток"] =
		wh.balance !== undefined && wh.balance !== null ? String(wh.balance) : "";

	// Документ
	const docMeta = ctx.document ?? {};
	map["Документ.ID"] =
		docMeta.id !== undefined && docMeta.id !== null ? String(docMeta.id) : "";
	map["Документ.Номер"] = docMeta.number || "";
	map["Документ.ДатаНачала"] = formatDateDdMmYyyy(docMeta.startDate);
	map["Документ.ДатаОкончания"] = formatDateDdMmYyyy(docMeta.endDate);
	map["Документ.ДатаСоздания"] = formatDateDdMmYyyy(
		docMeta.createdAt || curDate,
	);

	// ─── ФИНАНСОВЫЕ ТОКЕНЫ И ДЕНЬГИ ПРОПИСЬЮ ───
	const fin = ctx.financial ?? {};
	let finKopecks = 0;
	if (fin.amountKopecks !== undefined && fin.amountKopecks !== null) {
		finKopecks = Math.round(Number(fin.amountKopecks));
	} else if (fin.amountRubles !== undefined && fin.amountRubles !== null) {
		finKopecks = rublesToKopecks(fin.amountRubles);
	} else if (
		p.advance !== undefined &&
		p.advance !== null &&
		String(p.advance).trim() !== ""
	) {
		finKopecks = parseKopecks(p.advance);
	}

	const amountWords = kopecksToWordsRu(finKopecks);
	const amountNumeric = kopecksToNumericString(finKopecks);
	const rublesOnly = Math.floor(Math.abs(finKopecks) / 100);
	const rublesWords = integerToWordsRu(rublesOnly);

	const absolute = Math.abs(finKopecks);
	const whole = Math.trunc(absolute / 100);
	const fraction = absolute % 100;
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const formattedRubles = `${finKopecks < 0 ? "-" : ""}${grouped},${String(fraction).padStart(2, "0")} руб.`;
	const formattedFullSumma = `${formatKopecksRu(finKopecks)} (${amountWords})`;

	map["Сумма"] = formattedRubles;
	map["СуммаЧислом"] = amountNumeric;
	map["СуммаПрописью"] = amountWords;
	map["СуммаПрописьюРублей"] = rublesWords;
	map["СуммаПолная"] = formattedFullSumma;

	map["Счет.Сумма"] = formattedRubles;
	map["Счет.СуммаЧислом"] = amountNumeric;
	map["Счет.СуммаПрописью"] = amountWords;
	map["Счет.Номер"] = fin.invoiceNumber || "";
	map["Счет.Дата"] = formatDateDdMmYyyy(fin.invoiceDate || curDate);

	map["Договор.Сумма"] = formatKopecksRu(finKopecks);
	map["Договор.СуммаЧислом"] = amountNumeric;
	map["Договор.СуммаПрописью"] = amountWords;
	map["Договор.Номер"] = fin.contractNumber || docMeta.number || "";
	map["Договор.Дата"] = formatDateDdMmYyyy(
		fin.contractDate || docMeta.startDate || curDate,
	);

	map["Акт.Сумма"] = formatKopecksRu(finKopecks);
	map["Акт.СуммаЧислом"] = amountNumeric;
	map["Акт.СуммаПрописью"] = amountWords;
	map["Акт.Номер"] = fin.actNumber || docMeta.number || "";
	map["Акт.Дата"] = formatDateDdMmYyyy(fin.actDate || curDate);

	// ─── ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ (ЗТЛ) ───
	const lab = ctx.dentalLab ?? {};
	map["Лаборатория.Название"] =
		lab.name || "Зуботехническая лаборатория ЗТЛ-Партнер";
	map["ЗубнойТехник.ФИО"] =
		lab.technicianFullName || "___________________________";
	map["ЗаказНаряд.Цвет"] = lab.colorVita || "A2 / Bleach";
	map["ЗаказНаряд.StlСсылка"] =
		lab.stlUrl || "STL-скан челюстей передан в CAD-систему лаборатории";
	map["ЗаказНаряд.ДатаПримерки"] =
		formatDateDdMmYyyy(lab.fittingDate) || "По согласованию";
	map["ЗаказНаряд.Комментарий"] =
		lab.comments || "Окклюзионные контакты и анатомический микрорельеф";
	map["ЗаказНаряд.Таблица"] = ctx.dentalWorkOrderTableHtml || "";

	// ─── СПРАВКА ФНС И НАЛОГОПЛАТЕЛЬЩИК ───
	const tp = ctx.taxpayer ?? {};
	map["Налогоплательщик.ФИО"] = tp.fullName || pFullName;
	map["Налогоплательщик.ИНН"] = tp.inn || p.inn || "";
	map["Налогоплательщик.СНИЛС"] = tp.snils || p.snils || "";
	map["СправкаФНС.Номер"] = docMeta.number || fin.actNumber || "__________";
	map["СправкаФНС.КодУслуги"] = ctx.fnsServiceCode || "1";
	map["КодУслуги"] = ctx.fnsServiceCode || "1";

	// ─── КЛИНИЧЕСКИЙ ОСМОТР, ДНЕВНИК И ИСТОРИЯ БОЛЕЗНИ ───
	const ce = ctx.clinicalExamination ?? {};
	const examDate = ce.examinationDate || curDate;
	map["ДатаОсмотра"] = formatDateDdMmYyyy(examDate);
	map["ДатаЛечения"] = formatDateDdMmYyyy(examDate);
	map["ДатаИВремяЛечения"] = ce.treatmentDateTime
		? `${formatDateDdMmYyyy(ce.treatmentDateTime)} ${formatDateDdMmYyyy(ce.treatmentDateTime) ? new Date(ce.treatmentDateTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}`.trim()
		: curDateDdMmYyyy;
	map["ФамилияИОВрача"] =
		ce.doctorInitials ||
		formatInitials(ce.doctorFullName) ||
		map["АктивныйВрач.ФамилияИнициалы"] ||
		"";
	map["Диагноз"] = ce.diagnosis || "";
	map["Жалобы"] = ce.complaints || "";
	map["Анамнез"] = ce.anamnesis || "";
	map["ПеренесенныеЗаболевания"] = ce.pastDiseases || "";
	map["РазвитиеЗаболевания"] = ce.diseaseHistory || "";
	map["ВнешнийОсмотр"] = ce.externalExam || "";
	map["Прикус"] = ce.bite || "Ортогнатический";
	map["СостояниеСлизистой"] =
		ce.mucousCondition ||
		"Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена, десневые сосочки без признаков воспаления";
	map["Рентген"] = ce.xray || "";
	map["Объективно"] = ce.objective || "";
	map["Лечение"] = ce.treatment || "";
	map["Рекомендации"] = ce.recommendations || "";

	// ─── ЗУБНАЯ ФОРМУЛА И ОДОНТОГРАММА ───
	const formulaBreakdown = generateDentalFormulaBreakdownText(
		ctx.dentalFormula,
	);
	map["ЗубнаяФормула.Расшифровка"] = formulaBreakdown;
	map["ЗубнаяФормула.Текст"] = formulaBreakdown;
	map["ЗубнаяФормула.Прописью"] = formulaBreakdown;

	const formulaHtml = renderGraphicalDentalFormulaHtml({
		dentalFormula: ctx.dentalFormula as DentalFormulaRecordInput,
	});
	map["ПервичныйОсмотр.ЗубнаяФормула"] = formulaHtml;
	map["ЗубнаяФормула"] = formulaHtml;

	// Токены отдельных зубов: {18}, {18т}, ...
	const teethTokens = resolveAllTeethTokens(ctx.dentalFormula);
	for (const [tKey, tVal] of Object.entries(teethTokens)) {
		map[tKey] = tVal;
	}

	// ─── ПЛАН ЛЕЧЕНИЯ И АКТ (ТАБЛИЦЫ) ───
	map["ПланЛечения.Таблица"] =
		ctx.treatmentPlanTableHtml ||
		'<table class="treatment-plan-table"><thead><tr><th>№</th><th>Код</th><th>Наименование услуги</th><th>Зуб</th><th>Кол-во</th><th>Сумма, руб.</th></tr></thead><tbody><tr><td colspan="6" style="text-align: center; color: #666;">Комплексный план лечения согласован с пациентом</td></tr></tbody></table>';
	map["ПланЛечения.ТаблицаПоЗубам"] = ctx.treatmentPlanToothTableHtml || "";
	map["ПланЛечения.СрокДействия"] = docMeta.endDate
		? formatDateDdMmYyyy(docMeta.endDate)
		: "30 календарных дней";
	map["Акт.ТаблицаУслуг"] = ctx.actServicesTableHtml || "";
	map["ТаблицаУслуг"] = ctx.actServicesTableHtml || "";

	return map;
}

/**
 * Каноническая функция интерполяции переменных формата {{variable_name}}
 * из контекста. Автоматически форматирует числовые переменные денег через formatMoney.
 */
export function interpolateVariables(
	templateString: string,
	context: Record<string, unknown> = {},
	options: InterpolateVariablesOptions = {},
): string {
	if (!templateString) return "";
	const preserveUnresolved = options.preserveUnresolved ?? true;
	const emptyPlaceholder = options.emptyPlaceholder ?? "";

	return templateString.replace(
		/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g,
		(match, varName) => {
			const val = context[varName];
			if (val === undefined || val === null) {
				return preserveUnresolved ? match : emptyPlaceholder;
			}
			if (
				typeof val === "number" &&
				(varName.includes("amount") ||
					varName.includes("price") ||
					varName.includes("total") ||
					varName.includes("balance"))
			) {
				return formatMoney(val);
			}
			return String(val);
		},
	);
}

/**
 * Канонический алиас для интерполяции шаблонов сообщений (Мандаты 8s, 8j)
 */
export function interpolateMessageTemplate(
	templateString: string,
	context: Record<string, unknown> = {},
	options: InterpolateVariablesOptions = {},
): string {
	return interpolateVariables(templateString, context, options);
}
