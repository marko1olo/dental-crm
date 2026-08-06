/**
 * websocketBroker.test.ts — изоляция клиник в живых обновлениях.
 *
 * До включения эндпоинта /api/ws/schedule брокер был мёртвым кодом:
 * wsBroker.addClient не вызывался ниоткуда, набор клиентов всегда был пуст,
 * и все 27 вызовов broadcast* рассылали сообщения в пустоту. Покрытия у
 * него не было вовсе.
 *
 * Теперь через брокер идут реальные данные клиник — балансы семейных
 * кошельков, записи расписания, сообщения инбокса. Здесь проверяется
 * главное свойство: сообщение одной организации не должно попасть к
 * клиенту другой. Если тест падает — вернулась утечка между клиниками.
 */

import assert from "node:assert";
import test from "node:test";
import { wsBroker } from "../services/websocketBroker.js";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const PATIENT_1 = "aaaaaaaa-0000-0000-0000-000000000001";
const PATIENT_2 = "bbbbbbbb-0000-0000-0000-000000000002";

const WS_OPEN = 1;
const WS_CLOSED = 3;

type FakeSocket = {
	readyState: number;
	sent: string[];
	on: (event: string, cb: () => void) => void;
	send: (data: string) => void;
	fireClose: () => void;
};

/**
 * Заглушка сокета с тем минимумом, который использует брокер: readyState,
 * send и подписка на close/error.
 */
function fakeSocket(): FakeSocket {
	const handlers: Record<string, Array<() => void>> = {};
	return {
		readyState: WS_OPEN,
		sent: [],
		on(event, cb) {
			(handlers[event] ||= []).push(cb);
		},
		send(data) {
			this.sent.push(data);
		},
		fireClose() {
			for (const cb of handlers.close ?? []) cb();
		},
	};
}

function addClient(
	socket: FakeSocket,
	organizationId: string,
	patientId?: string,
) {
	wsBroker.addClient(socket as never, organizationId, patientId);
}

function types(socket: FakeSocket): string[] {
	return socket.sent.map((raw) => {
		try {
			return (JSON.parse(raw) as { type?: string }).type ?? "?";
		} catch {
			return raw;
		}
	});
}

test("broadcastToOrganization не доставляет сообщения в чужую клинику", () => {
	const a = fakeSocket();
	const b = fakeSocket();
	addClient(a, ORG_A);
	addClient(b, ORG_B);

	try {
		wsBroker.broadcastToOrganization(ORG_A, {
			type: "FAMILY_BALANCE_UPDATED",
			payload: { balance: "100.00" },
		});

		assert.deepStrictEqual(
			types(a),
			["FAMILY_BALANCE_UPDATED"],
			"своя клиника сообщение не получила",
		);
		assert.deepStrictEqual(types(b), [], "сообщение утекло в чужую клинику");
	} finally {
		a.fireClose();
		b.fireClose();
	}
});

test("broadcastToPatient доставляет только подписке на этого пациента этой клиники", () => {
	const samePatient = fakeSocket();
	const otherPatient = fakeSocket();
	const samePatientOtherOrg = fakeSocket();
	const noPatient = fakeSocket();

	addClient(samePatient, ORG_A, PATIENT_1);
	addClient(otherPatient, ORG_A, PATIENT_2);
	addClient(samePatientOtherOrg, ORG_B, PATIENT_1);
	addClient(noPatient, ORG_A);

	try {
		wsBroker.broadcastToPatient(ORG_A, PATIENT_1, {
			type: "UPDATE_ODONTOGRAM",
			payload: {},
		});

		assert.deepStrictEqual(types(samePatient), ["UPDATE_ODONTOGRAM"]);
		assert.deepStrictEqual(
			types(otherPatient),
			[],
			"сообщение ушло к другому пациенту той же клиники",
		);
		assert.deepStrictEqual(
			types(samePatientOtherOrg),
			[],
			"сообщение ушло в чужую клинику по совпадению patientId",
		);
		assert.deepStrictEqual(
			types(noPatient),
			[],
			"сообщение ушло подписке без пациента",
		);
	} finally {
		for (const s of [samePatient, otherPatient, samePatientOtherOrg, noPatient])
			s.fireClose();
	}
});

test("закрытый клиент удаляется из рассылки", () => {
	const socket = fakeSocket();
	addClient(socket, ORG_A);
	socket.fireClose();

	wsBroker.broadcastToOrganization(ORG_A, {
		type: "APPOINTMENT_CREATED",
		payload: {},
	});

	assert.deepStrictEqual(
		types(socket),
		[],
		"закрытый сокет продолжает получать сообщения",
	);
});

test("сообщение не отправляется в сокет, который ещё не открыт или уже закрывается", () => {
	const socket = fakeSocket();
	socket.readyState = WS_CLOSED;
	addClient(socket, ORG_A);

	try {
		wsBroker.broadcastToOrganization(ORG_A, {
			type: "APPOINTMENT_UPDATED",
			payload: {},
		});
		assert.deepStrictEqual(types(socket), [], "запись в неоткрытый сокет");
	} finally {
		socket.fireClose();
	}
});

test("несколько клиентов одной клиники получают сообщение каждый", () => {
	const first = fakeSocket();
	const second = fakeSocket();
	addClient(first, ORG_A);
	addClient(second, ORG_A);

	try {
		wsBroker.broadcastToOrganization(ORG_A, {
			type: "APPOINTMENT_CREATED",
			payload: { appointmentId: "x" },
		});

		assert.deepStrictEqual(types(first), ["APPOINTMENT_CREATED"]);
		assert.deepStrictEqual(types(second), ["APPOINTMENT_CREATED"]);
	} finally {
		first.fireClose();
		second.fireClose();
	}
});
