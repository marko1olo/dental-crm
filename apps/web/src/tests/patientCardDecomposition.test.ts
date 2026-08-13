import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientAdministrativeForm } from "../components/patient/PatientAdministrativeForm";
import { formatPhoneNumber } from "../utils/inputSanitation";

/**
 * КАРТОЧКУ ПАЦИЕНТА РАСПИЛИЛИ, РАСПИЛ ОТКАТИЛИ, А ПОТОМ ВЕРНУЛИ ПОЛОВИНУ.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/tests/patientCardDecomposition.test.ts
 * (рабочий каталог важен: tsx берёт настройку jsx из apps/web/tsconfig.json,
 * из корня репозитория сборка падает на «React is not defined»).
 *
 * История, которую охраняет этот файл: PR #409 вынес из PatientsView.tsx пять
 * форм, в тот же день их удалили как мёртвый код, а на следующий слепой
 * `chore: sync` вернул ровно две. Одна из вернувшихся (PatientCoreForm) была
 * снимком ДО трёх исправлений и удалена окончательно. Вторая
 * (PatientAdministrativeForm) оказалась надмножеством: 16 полей против 11 в
 * экране, и пять полей нельзя было заполнить ничем, хотя сервер их печатает в
 * документы и читает движком предупреждений расписания. Полтора года такой
 * сироты не заметил ни один гейт: panelsAreMounted.test.ts тогда проверял
 * ПОИМЁННЫЙ список из семи панелей и каталог не обходил. Теперь он обходит всё
 * дерево по переписи разбора — см. комментарий в конце этого файла.
 *
 * Проверяется две вещи, каждая — уже случившийся способ потерять работу:
 *  1. форма реквизитов действительно рисуется и в ней есть ВСЕ поля профиля,
 *     включая те пять, которых на экране не было;
 *  2. экран не держит вторую копию тех же полей (два владельца одного
 *     черновика — это правка, которая доходит до одной копии из двух).
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const read = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");

const patientsView = read("PatientsView.tsx");

/**
 * По значению на каждое поле: если поле выкинут или перевесят на другой ключ
 * черновика, метка пропадёт из разметки. Проверять по подписи недостаточно —
 * подпись может остаться при отвязанном инпуте.
 */
const draft = {
	identityDocument: "метка-паспорт",
	taxpayerInn: "123456789012",
	registrationAddress: "метка-адрес-регистрации",
	residentialAddress: "метка-адрес-проживания",
	insurancePolicyNumber: "метка-полис",
	snils: "метка-снилс",
	legalRepresentativeFullName: "метка-фио-представителя",
	legalRepresentativeRelationship: "метка-кем-приходится",
	legalRepresentativeIdentityDocument: "метка-документ-представителя",
	legalRepresentativePhone: "+7 (912) 345-67-89",
	preferredDocumentRecipient: "метка-получатель-документов",
	preferredAppointmentStart: "09:30",
	preferredAppointmentEnd: "13:45",
	preferredAppointmentNote: "метка-комментарий-к-записи",
	dataProcessingBasisNote: "метка-основание-пдн",
	orthodonticProgress: "",
	loyaltyTier: "standard",
	preferredAppointmentWeekdays: [1, 3],
};

const weekdayOptions = [
	{ label: "Пн", value: 1 },
	{ label: "Вт", value: 2 },
	{ label: "Ср", value: 3 },
	{ label: "Чт", value: 4 },
	{ label: "Пт", value: 5 },
	{ label: "Сб", value: 6 },
	{ label: "Вс", value: 0 },
];

function renderForm(profileDraft: typeof draft): string {
	return renderToStaticMarkup(
		createElement(PatientAdministrativeForm, {
			patientAdministrativeProfileDraft: profileDraft,
			updatePatientAdministrativeProfileDraft: () => {},
			weekdayOptions,
			normalizeOptionalWorkingDaysDraft: (days: number[]) =>
				[...days].sort((a, b) => a - b),
		}),
	);
}

describe("реквизиты пациента рисуются целиком", () => {
	const markup = renderForm(draft);

	it("каждое поле административного профиля дошло до экрана", () => {
		const missing = Object.entries(draft)
			.filter(
				([field]) =>
					field !== "preferredAppointmentWeekdays" &&
					field !== "orthodonticProgress",
			)
			.filter(([, value]) => !markup.includes(String(value)))
			.map(([field]) => field);

		assert.deepEqual(
			missing,
			[],
			`в форме реквизитов нет полей: ${missing.join(", ")}. Такое поле нельзя заполнить через интерфейс, ` +
				"а сервер его печатает в документы и читает движком предупреждений расписания",
		);
	});

	it("пять полей, которых не было ни на одном экране, теперь есть", () => {
		for (const label of [
			"Кому выдавать документы",
			"Основание обработки персональных данных",
			"Удобно приходить с",
			"Удобно приходить до",
			"Комментарий к записи",
		]) {
			assert.ok(
				markup.includes(label),
				`подпись «${label}» пропала — поле снова стало недостижимым`,
			);
		}
	});

	it("подписи общих полей взяты из карточки пациента, а не переименованы при выносе", () => {
		for (const label of [
			"Паспорт / Документ",
			"Полис ДМС / ОМС",
			"ФИО представителя",
			"Кем приходится",
			"Паспорт представителя",
			"Предпочитаемые дни приема",
		]) {
			assert.ok(
				markup.includes(label),
				`подпись «${label}» изменилась при выносе формы. Вынос кода не должен менять то, что видит оператор`,
			);
		}
	});

	it("плейсхолдер документа представителя больше не обещает «сессию»", () => {
		assert.ok(
			!markup.includes("Паспорт / сессия"),
			"вернулся бессмысленный плейсхолдер «Паспорт / сессия»",
		);
		assert.ok(
			markup.includes("Паспорт / доверенность"),
			"плейсхолдер документа представителя потерялся",
		);
	});

	it("удобное окно приема — два раздельных поля времени, а не одно", () => {
		const timeInputs = markup.match(/type="time"/g) ?? [];
		assert.equal(
			timeInputs.length,
			2,
			`полей времени в форме ${timeInputs.length}, а должно быть два. Валидатор реквизитов требует ` +
				"начало и конец парой: при одном поле полупару нельзя ни достроить, ни очистить, и тогда " +
				"кнопка «Сохранить реквизиты» остаётся серой навсегда",
		);
	});

	it("полупара «начало есть, конца нет» показывает оба поля и выход из тупика", () => {
		const halfPair = renderForm({
			...draft,
			preferredAppointmentStart: "09:30",
			preferredAppointmentEnd: "",
		});
		assert.ok(
			halfPair.includes('value="09:30"'),
			"начало окна не отрисовано — очистить его нечем",
		);
		assert.equal(
			(halfPair.match(/type="time"/g) ?? []).length,
			2,
			"конец окна не отрисован — достроить пару нечем, реквизиты пациента остаются несохраняемыми",
		);
		assert.ok(
			halfPair.includes("заполните второе или очистите первое"),
			"пропала подсказка, объясняющая оператору выход из тупика с удобным временем",
		);
	});

	it("телефон представителя приводится к тому же виду, что и телефон пациента", () => {
		assert.equal(formatPhoneNumber("89123456789"), "+7 (912) 345-67-89");
		assert.ok(
			read("components/patient/PatientAdministrativeForm.tsx").includes(
				'updatePatientAdministrativeProfileDraft("legalRepresentativePhone", formatPhoneNumber(event.target.value))',
			),
			"телефон представителя снова пишется сырым: разнобой форматов ломает поиск по номеру и рассылку",
		);
	});
});

describe("карточка пациента не держит вторую копию реквизитов", () => {
	it("экран монтирует вынесенную форму", () => {
		assert.ok(
			patientsView.includes("<PatientAdministrativeForm"),
			"PatientsView.tsx перестал рисовать PatientAdministrativeForm — форма снова сирота, " +
				"а пять её полей снова недостижимы",
		);
	});

	it("в экране не осталось своих инпутов административного профиля", () => {
		const duplicated = [
			"identityDocument",
			"taxpayerInn",
			"registrationAddress",
			"insurancePolicyNumber",
			"legalRepresentativeFullName",
			"preferredAppointmentWeekdays",
		].filter((field) =>
			patientsView.includes(
				`updatePatientAdministrativeProfileDraft("${field}"`,
			),
		);

		assert.deepEqual(
			duplicated,
			[],
			`PatientsView.tsx снова правит поля профиля сам (${duplicated.join(", ")}). Две копии одной формы ` +
				"уже расходились: в одной телефон нормализовался, в другой нет",
		);
	});
});

/*
 * ПОИСК СИРОТ ОТСЮДА УБРАН, И ЭТО НЕ ОСЛАБЛЕНИЕ.
 *
 * Здесь был третий по счёту обход каталогов в поисках несмонтированных файлов:
 * по components/patient и components/plan, с признанием «подключён», если хоть
 * кто-то файл ИМПОРТИРУЕТ. Импорт — не рендер: модуль можно импортировать из
 * мёртвого файла (так и жил AppRouter.tsx) или импортировать и не поставить
 * тегом. Проверка стояла на регулярном выражении по имени модуля, то есть
 * совпадала и на закомментированной строке.
 *
 * Теперь этот инвариант охраняется в одном месте и строже:
 * src/tests/panelsAreMounted.test.ts поверх переписи
 * src/tests/utils/componentReachability.ts. Перепись разбирает все ~314
 * исходников apps/web/src через @babel/parser, идёт от main.tsx только по рёбрам,
 * которые ведут к рендеру, и требует, чтобы компонент кто-то ПОСТАВИЛ ТЕГОМ из
 * достижимого модуля. Оба каталога карточки пациента попадают туда как частный
 * случай — вместе с остальными 190 компонентами, а не вместо них.
 *
 * Причина по ComparativePlannerDashboard.tsx перенесена туда же, в
 * DECLARED_UNMOUNTED, и там она обязана быть непустой и содержательной: тест
 * проверяет саму строку причины, а не факт наличия записи.
 *
 * Ниже остаётся то, чего перепись знать не может: что форма реквизитов
 * действительно РИСУЕТ все свои поля и что экран не держит их вторую копию.
 */
