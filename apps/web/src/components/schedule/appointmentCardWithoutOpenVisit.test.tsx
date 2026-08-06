import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Dashboard, Visit } from "@dental/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentCard, type AppointmentCardProps } from "./AppointmentCard";

/**
 * СТОРОЖ: КАРТОЧКА РАСПИСАНИЯ ОБЯЗАНА РИСОВАТЬСЯ, КОГДА ОТКРЫТОГО ПРИЁМА НЕТ.
 *
 * ЧТО БЫЛО. `AppointmentCard` разыменовывала `dashboard.activeVisit.appointmentId`
 * без `?.` в двух местах — в списке выбора пациента и в наборе плашек-пациентов
 * (строки 222 и 241 до правки). Пока сервер подставлял в `activeVisit` заготовку
 * с нулевым идентификатором, это работало: заготовка — объект, поле у неё есть.
 *
 * ЧЕМ ЭТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Заготовка и была дефектом: сводка называла
 * администратору приём, которого в базе не существует. Убрать заготовку и
 * ответить честным `activeVisit: null` было НЕЛЬЗЯ ровно из-за этих двух строк:
 * первое же нажатие «Настроить» на записи роняло отрисовку карточки, а вместе с
 * ней и весь экран расписания — администратор за стойкой не мог перенести
 * запись, потому что экран падал.
 *
 * ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ. Карточка в режиме правки рисуется при `activeVisit: null`
 * в ОБОИХ своих ветках выбора пациента, и выбор пациента при этом НЕ заблокирован:
 * приёма нет — значит закреплять пациента нечем. Плюс рабочий путь: когда приём
 * открыт по ЭТОЙ записи, выбор пациента заблокирован, как и раньше.
 *
 * ЗАПУСК: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/components/schedule/appointmentCardWithoutOpenVisit.test.tsx
 */

const APPOINTMENT_ID = "3f6f2a1e-1111-4b22-8c33-000000000001";
const OTHER_APPOINTMENT_ID = "3f6f2a1e-1111-4b22-8c33-000000000002";
const PATIENT_ID = "3f6f2a1e-2222-4b22-8c33-000000000001";
const VISIT_ID = "3f6f2a1e-3333-4b22-8c33-000000000001";
const ORGANIZATION_ID = "3f6f2a1e-4444-4b22-8c33-000000000001";

const appointment: Appointment = {
	id: APPOINTMENT_ID,
	organizationId: ORGANIZATION_ID,
	patientId: PATIENT_ID,
	doctorUserId: null,
	assistantUserId: null,
	chairId: null,
	startsAt: "2026-05-12T09:00:00+04:00",
	endsAt: "2026-05-12T09:30:00+04:00",
	status: "planned",
	reason: "Осмотр",
	comment: null,
} as Appointment;

/**
 * Приведение здесь ОДНО и оно осознанное: `Dashboard` — это тридцать одно поле,
 * а карточка читает пять (`clinicSettings.profile`, `clinicSettings.staff`,
 * `clinicSettings.chairs`, `patients`, `activeVisit`). Собирать остальные
 * двадцать шесть значило бы описать в тесте весь контракт сводки и получить
 * фикстуру, которая краснеет от любой правки в чужом поле. Это приведение
 * фикстуры теста, а не обход слабого контракта у потребителя.
 */
/**
 * `Visit | null` названо здесь явно, а не через `Dashboard["activeVisit"]`, чтобы
 * файл собирался и ДО правки контракта, и после: этот же тест служит проверкой
 * покраснения, а проверка покраснения, которая сама не компилируется на старом
 * контракте, ничего не доказывает.
 */
type ActiveVisitProp = Visit | null;

function dashboardWith(activeVisit: ActiveVisitProp): Dashboard {
	return {
		clinicSettings: {
			profile: { timezone: "Europe/Samara", mode: "solo_doctor" },
			staff: [],
			chairs: [],
		},
		patients: [
			{ id: PATIENT_ID, fullName: "Плашкина Мария Ивановна", status: "active" },
		],
		activeVisit,
	} as unknown as Dashboard;
}

const openVisitOnThisAppointment: Visit = {
	id: VISIT_ID,
	organizationId: ORGANIZATION_ID,
	patientId: PATIENT_ID,
	appointmentId: APPOINTMENT_ID,
	status: "draft",
	revision: 1,
	complaint: "скол пломбы 46",
	anamnesis: null,
	objectiveStatus: null,
	diagnosis: null,
	treatmentPlan: null,
	doctorSummary: null,
	createdAt: "2026-05-12T08:00:00+04:00",
	updatedAt: "2026-05-12T08:00:00+04:00",
};

function propsFor(
	activeVisit: ActiveVisitProp,
	useManualSelects: boolean,
): AppointmentCardProps {
	return {
		appointment,
		dashboard: dashboardWith(activeVisit),
		visibleScheduleSuggestions: [],
		appointmentReadinessById: new Map(),
		// Без приведения: приведение здесь СКРЫЛО мою же опечатку «in_progress»
		// вместо настоящего члена перечисления «in_treatment».
		appointmentLabels: {
			planned: "Запланирован",
			confirmed: "Подтвержден",
			arrived: "Пришел",
			in_treatment: "На приеме",
			completed: "Завершен",
			cancelled: "Отменен",
			no_show: "Не пришел",
		},
		appointmentDraft: {
			startsAt: appointment.startsAt,
			endsAt: appointment.endsAt,
			patientId: PATIENT_ID,
			doctorUserId: "",
			assistantUserId: "",
			chairId: "",
			status: "planned",
			reason: "Осмотр",
			comment: "",
		},
		appointmentSaveState: "idle",
		appointmentSaveError: null,
		appointmentDirty: false,
		appointmentEditing: true,
		appointmentHasOpenVisit: activeVisit?.appointmentId === appointment.id,
		appointmentActiveVisitStatusLocked: false,
		appointmentMissingSteps: [],
		appointmentReadyToSave: true,
		openScheduleSuggestion: () => {},
		formatTime: (value) => value.slice(11, 16),
		patientName: (patients, patientId) =>
			patients.find((patient) => patient.id === patientId)?.fullName ??
			"Пациент не выбран",
		openAppointmentEditor: () => {},
		repeatAppointment: () => {},
		closeAppointmentEditor: () => {},
		updateAppointmentScheduleDraft: () => {},
		saveAppointmentSchedule: async () => true,
		normalizedAppointmentStatus: (value) => value as Appointment["status"],
		toDateTimeLocalValue: (value) => value.slice(0, 16),
		fromDateTimeLocalValue: (value) => value,
		useManualSelects,
		activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>([
			"completed",
		]),
	};
}

function render(
	activeVisit: ActiveVisitProp,
	useManualSelects: boolean,
): string {
	return renderToStaticMarkup(
		createElement(AppointmentCard, propsFor(activeVisit, useManualSelects)),
	);
}

describe("AppointmentCard: открытого приёма нет", () => {
	it("ветка списка выбора пациента рисуется без открытого приёма и не блокирует выбор", () => {
		const markup = render(null, true);

		assert.match(
			markup,
			/<select/,
			"Ветка ручного списка пациентов не отрисовалась вовсе — сравнивать «заблокирован ли выбор» не с чем.",
		);
		const select = markup.slice(
			markup.indexOf("<select"),
			markup.indexOf("</select>"),
		);
		assert.ok(
			!select.includes("disabled"),
			"Выбор пациента заблокирован, хотя открытого приёма в клинике нет. Блокировка означает «пациент " +
				`закреплён за открытым приёмом» — закреплять нечем. Разметка списка: ${select}`,
		);
	});

	it("ветка плашек-пациентов рисуется без открытого приёма и не блокирует выбор", () => {
		const markup = render(null, false);

		assert.match(
			markup,
			/quick-chip/,
			"Ветка плашек не отрисовалась: проверка блокировки плашки пациента ни о чём.",
		);
		const chip = markup.slice(
			markup.indexOf('class="quick-chip'),
			markup.indexOf("</button>", markup.indexOf('class="quick-chip')),
		);
		assert.ok(
			!chip.includes("disabled"),
			`Плашка выбора пациента заблокирована без открытого приёма: ${chip}`,
		);
	});

	it("рабочий путь: приём открыт по ЭТОЙ записи — выбор пациента заблокирован", () => {
		const withSelect = render(openVisitOnThisAppointment, true);
		const select = withSelect.slice(
			withSelect.indexOf("<select"),
			withSelect.indexOf("</select>"),
		);
		assert.ok(
			select.includes("disabled"),
			"По записи открыт приём, а выбор пациента свободен. Тогда администратор переставит пациента под " +
				`уже начатое лечение, и запись о лечении уедет чужому человеку. Разметка: ${select}`,
		);

		const withChips = render(openVisitOnThisAppointment, false);
		const chipStart = withChips.indexOf('class="quick-chip');
		const chip = withChips.slice(
			chipStart,
			withChips.indexOf("</button>", chipStart),
		);
		assert.ok(
			chip.includes("disabled"),
			`Плашка пациента не заблокирована при открытом приёме: ${chip}`,
		);
	});

	it("приём открыт по ДРУГОЙ записи — эта запись выбор пациента не блокирует", () => {
		const markup = render(
			{ ...openVisitOnThisAppointment, appointmentId: OTHER_APPOINTMENT_ID },
			true,
		);
		const select = markup.slice(
			markup.indexOf("<select"),
			markup.indexOf("</select>"),
		);
		assert.ok(
			!select.includes("disabled"),
			`Запись заблокирована приёмом, который открыт по другой записи: ${select}`,
		);
	});
});
