import assert from "node:assert/strict";
import { test } from "node:test";
import {
	classifyFailedHttpStatus,
	type EgiszEndpointOutcome,
	type EgiszIntegrationStatus,
	type EgiszPanelState,
	type EgiszVisitTransmission,
	readIntegrationStatus,
	readVisitTransmission,
	resolveEgiszCatalogState,
	resolveEgiszPanelState,
	russianServerText,
} from "../components/integrations/egiszAvailability";

/**
 * ЧТО ЭТИ ПРОВЕРКИ ЛОВЯТ
 *
 * До правки EgiszMonitor.tsx:38 читал `if (res.ok)` без ветки else, поэтому ответ 404
 * от POST /api/egisz/send и GET /api/egisz/logs/:id молча проглатывался: панель
 * оставалась в начальном состоянии «Pending», печатала «Данные приема готовы к отправке»
 * и держала кнопку «Отправить в ЕГИСЗ» живой над несуществующим маршрутом. Строка :85
 * подставляла в русский текст серверное поле error, и врач читал «Ошибка: Not Found».
 * EgiszBlankPermissionsWidget.tsx:20-22 читал тело без проверки res.ok и превращал
 * объект ошибки в пустой список, печатая «Правила выгрузки бланков ЕГИСЗ не настроены»
 * над разделом, которого на сервере нет.
 *
 * Тела ответов ниже — не выдумка: они скопированы с живых запросов к работающему
 * серверу 2026-07-28 (см. пакет CC2-egisz-facade-honesty).
 */

/** Настоящее тело 404 от Fastify. setNotFoundHandler в apps/api/src отсутствует. */
const FASTIFY_NOT_FOUND = {
	message: "Route GET:/api/egisz/logs/abc not found",
	error: "Not Found",
	statusCode: 404,
};

/** Настоящий ответ GET /api/clinical/egisz/integration-status на этом сервере. */
const LIVE_INTEGRATION_STATUS = {
	ok: true,
	configured: false,
	frmoStatus: "NOT_CONFIGURED",
	frmrStatus: "NOT_CONFIGURED",
	remdStatus: "NOT_CONFIGURED",
	capabilities: {
		cdaGeneration: true,
		ukepSigning: false,
		remdTransmission: false,
	},
	missingConfiguration: [
		"EGISZ_N3_BASE_URL",
		"EGISZ_N3_GUID",
		"EGISZ_N3_LPU_ID",
		"EGISZ_FRMO_ID",
	],
	checkedAt: "2026-07-28T17:49:03.181Z",
};

const HEALTHY_STATUS: EgiszEndpointOutcome<EgiszIntegrationStatus> = {
	kind: "ok",
	data: {
		configured: true,
		remdTransmission: true,
		ukepSigning: true,
		cdaGeneration: true,
		missingConfiguration: [],
	},
};

const EMPTY_JOURNAL: EgiszEndpointOutcome<EgiszVisitTransmission | null> = {
	kind: "ok",
	data: null,
};

function assertNoLatinOnScreen(state: EgiszPanelState, label: string): void {
	for (const [field, text] of [
		["headline", state.headline],
		["detail", state.detail],
		["transmitBlockedReason", state.transmitBlockedReason],
	] as const) {
		assert.ok(
			!/[A-Za-z]/.test(text),
			`${label}: латиница в поле ${field}: ${JSON.stringify(text)}`,
		);
	}
}

test("404 от журнала выгрузок даёт «раздел недоступен» и запрещает отправку", () => {
	const state = resolveEgiszPanelState({
		statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
		journalOutcome: classifyFailedHttpStatus(404),
	});

	assert.equal(state.kind, "unavailable");
	assert.match(state.headline, /недоступен/);
	assert.equal(state.canTransmit, false);
	assert.notEqual(state.transmitBlockedReason, "");
	// «Повторить» рядом с «сервер не отдаёт этот раздел» — ложь в интерфейсе.
	assert.equal(state.canRetryLoad, false);
	// Отсутствующий маршрут нельзя выдавать за ненастроенную интеграцию.
	assert.doesNotMatch(state.detail, /не настроен/);
	assertNoLatinOnScreen(state, "404");
});

test("405 и 501 читаются так же, как 404: раздела нет", () => {
	for (const httpStatus of [404, 405, 501]) {
		assert.deepEqual(classifyFailedHttpStatus(httpStatus), { kind: "missing" });
	}
	assert.deepEqual(classifyFailedHttpStatus(401), { kind: "unauthorized" });
	assert.deepEqual(classifyFailedHttpStatus(403), { kind: "unauthorized" });
	assert.deepEqual(classifyFailedHttpStatus(500), {
		kind: "server_error",
		httpStatus: 500,
	});
});

test("configured:false даёт «не настроено», имена переменных и запрет отправки", () => {
	const state = resolveEgiszPanelState({
		statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
		journalOutcome: EMPTY_JOURNAL,
	});

	assert.equal(state.kind, "not_configured");
	assert.match(state.headline, /не настроен/);
	assert.equal(state.canTransmit, false);
	assert.notEqual(state.transmitBlockedReason, "");
	assert.deepEqual(state.missingConfiguration, [
		"EGISZ_N3_BASE_URL",
		"EGISZ_N3_GUID",
		"EGISZ_N3_LPU_ID",
		"EGISZ_FRMO_ID",
	]);
	// Панель обязана сказать, что ничего не ушло.
	assert.match(state.detail, /не уходил/);
	assertNoLatinOnScreen(state, "configured:false");
});

test("настроенное подключение без выгрузок даёт «нет данных» и разрешает отправку", () => {
	const state = resolveEgiszPanelState({
		statusOutcome: HEALTHY_STATUS,
		journalOutcome: EMPTY_JOURNAL,
	});

	assert.equal(state.kind, "empty");
	assert.equal(state.canTransmit, true);
	assert.equal(state.transmitBlockedReason, "");
	assertNoLatinOnScreen(state, "empty");
});

test("настроенный шлюз без реализованной передачи не выдаётся за готовность", () => {
	// Если бы админ задал четыре переменные окружения, а remdTransmission остался
	// false, наивная проверка только по configured снова зажгла бы кнопку над 404.
	const state = resolveEgiszPanelState({
		statusOutcome: {
			kind: "ok",
			data: {
				configured: true,
				remdTransmission: false,
				ukepSigning: false,
				cdaGeneration: true,
				missingConfiguration: [],
			},
		},
		journalOutcome: EMPTY_JOURNAL,
	});

	assert.equal(state.kind, "transmission_unavailable");
	assert.equal(state.canTransmit, false);
	assert.notEqual(state.transmitBlockedReason, "");
	assert.match(state.detail, /не уйдёт/);
	assertNoLatinOnScreen(state, "transmission_unavailable");
});

test("три состояния не сливаются: недоступно, не настроено и нет данных различимы", () => {
	const unavailable = resolveEgiszPanelState({
		statusOutcome: classifyFailedHttpStatus(404),
		journalOutcome: classifyFailedHttpStatus(404),
	});
	const notConfigured = resolveEgiszPanelState({
		statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
		journalOutcome: EMPTY_JOURNAL,
	});
	const empty = resolveEgiszPanelState({
		statusOutcome: HEALTHY_STATUS,
		journalOutcome: EMPTY_JOURNAL,
	});

	const kinds = new Set([unavailable.kind, notConfigured.kind, empty.kind]);
	assert.equal(kinds.size, 3);
	const headlines = new Set([
		unavailable.headline,
		notConfigured.headline,
		empty.headline,
	]);
	assert.equal(headlines.size, 3);
});

test("ни одно состояние панели не выносит латиницу на экран", () => {
	const journalStatuses: EgiszVisitTransmission["status"][] = [
		"Pending",
		"Sent",
		"Error",
		"Accepted",
	];
	const cases: { label: string; state: EgiszPanelState }[] = [
		{
			label: "loading",
			state: resolveEgiszPanelState({
				statusOutcome: null,
				journalOutcome: null,
			}),
		},
	];
	for (const httpStatus of [401, 403, 404, 405, 500, 502, 501]) {
		cases.push({
			label: `http ${httpStatus}`,
			state: resolveEgiszPanelState({
				statusOutcome: classifyFailedHttpStatus(httpStatus),
				journalOutcome: classifyFailedHttpStatus(httpStatus),
			}),
		});
	}
	cases.push({
		label: "network",
		state: resolveEgiszPanelState({
			statusOutcome: { kind: "network" },
			journalOutcome: { kind: "network" },
		}),
	});
	cases.push({
		label: "unreadable",
		state: resolveEgiszPanelState({
			statusOutcome: readIntegrationStatus(FASTIFY_NOT_FOUND),
			journalOutcome: EMPTY_JOURNAL,
		}),
	});
	cases.push({
		label: "not_configured",
		state: resolveEgiszPanelState({
			statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
			journalOutcome: EMPTY_JOURNAL,
		}),
	});
	cases.push({
		label: "transmission_unavailable",
		state: resolveEgiszPanelState({
			statusOutcome: {
				kind: "ok",
				data: {
					configured: true,
					remdTransmission: false,
					ukepSigning: false,
					cdaGeneration: true,
					missingConfiguration: [],
				},
			},
			journalOutcome: EMPTY_JOURNAL,
		}),
	});
	cases.push({
		label: "empty",
		state: resolveEgiszPanelState({
			statusOutcome: HEALTHY_STATUS,
			journalOutcome: EMPTY_JOURNAL,
		}),
	});
	for (const status of journalStatuses) {
		cases.push({
			label: `journal ${status}`,
			state: resolveEgiszPanelState({
				statusOutcome: HEALTHY_STATUS,
				journalOutcome: {
					kind: "ok",
					data: {
						status,
						transactionId: "TX-42",
						errorMessage: "Not Found",
						xmlPreview: "<ClinicalDocument/>",
					},
				},
			}),
		});
	}

	assert.ok(cases.length >= 13);
	for (const item of cases) assertNoLatinOnScreen(item.state, item.label);

	// Все состояния перечислены и ни одно не потеряно.
	const seen = new Set(cases.map((item) => item.state.kind));
	for (const expected of [
		"loading",
		"unavailable",
		"unauthorized",
		"network",
		"server_error",
		"unreadable",
		"not_configured",
		"transmission_unavailable",
		"empty",
		"queued",
		"sent",
		"accepted",
		"failed",
	]) {
		assert.ok(
			seen.has(expected as EgiszPanelState["kind"]),
			`нет состояния ${expected}`,
		);
	}
});

test("серверный текст ошибки попадает на экран только если он русский", () => {
	assert.equal(russianServerText("Not Found"), null);
	assert.equal(russianServerText("Ошибка Not Found"), null);
	assert.equal(russianServerText(""), null);
	assert.equal(russianServerText(null), null);
	assert.equal(russianServerText(42), null);
	assert.equal(
		russianServerText("  Документ отклонён: не заполнен диагноз.  "),
		"Документ отклонён: не заполнен диагноз.",
	);

	// Английская причина от сервера заменяется русским объяснением, а не печатается.
	const state = resolveEgiszPanelState({
		statusOutcome: HEALTHY_STATUS,
		journalOutcome: {
			kind: "ok",
			data: {
				status: "Error",
				transactionId: null,
				errorMessage: "Not Found",
				xmlPreview: null,
			},
		},
	});
	assert.equal(state.kind, "failed");
	assert.doesNotMatch(state.detail, /Not Found/);
	assertNoLatinOnScreen(state, "failed с английской причиной");

	const russian = resolveEgiszPanelState({
		statusOutcome: HEALTHY_STATUS,
		journalOutcome: {
			kind: "ok",
			data: {
				status: "Error",
				transactionId: null,
				errorMessage: "Диагноз не заполнен",
				xmlPreview: null,
			},
		},
	});
	assert.equal(russian.detail, "Диагноз не заполнен");
});

test("тело 404 не превращается в configured:false и не подменяется умолчанием", () => {
	const outcome = readIntegrationStatus(FASTIFY_NOT_FOUND);
	assert.equal(outcome.kind, "unreadable");

	const state = resolveEgiszPanelState({
		statusOutcome: outcome,
		journalOutcome: EMPTY_JOURNAL,
	});
	assert.equal(state.kind, "unreadable");
	assert.equal(state.canTransmit, false);
	assert.doesNotMatch(state.detail, /не настроен/);
});

test("живой ответ сервера разбирается без потерь", () => {
	const outcome = readIntegrationStatus(LIVE_INTEGRATION_STATUS);
	assert.equal(outcome.kind, "ok");
	if (outcome.kind !== "ok") return;
	assert.equal(outcome.data.configured, false);
	assert.equal(outcome.data.remdTransmission, false);
	assert.equal(outcome.data.ukepSigning, false);
	assert.equal(outcome.data.cdaGeneration, true);
	assert.equal(outcome.data.missingConfiguration.length, 4);
});

test("предпросмотр СЭМД не выброшен: он доезжает из журнала до состояния панели", () => {
	// Прежняя панель показывала errorDetails.xmlPreview. Выбросить этот путь значило бы
	// удалить работающий элемент вместо починки лжи, поэтому он проверяется отдельно.
	const outcome = readVisitTransmission(
		{
			logs: [
				{
					visitId: "v-1",
					status: "Error",
					errorDetails: {
						message: "Документ отклонён",
						xmlPreview: "<ClinicalDocument xmlns='urn:hl7-org:v3'/>",
					},
				},
			],
		},
		"v-1",
	);
	assert.equal(outcome.kind, "ok");
	if (outcome.kind !== "ok") return;
	assert.equal(
		outcome.data?.xmlPreview,
		"<ClinicalDocument xmlns='urn:hl7-org:v3'/>",
	);

	const state = resolveEgiszPanelState({
		statusOutcome: HEALTHY_STATUS,
		journalOutcome: outcome,
	});
	assert.equal(state.kind, "failed");
	assert.equal(state.xmlPreview, "<ClinicalDocument xmlns='urn:hl7-org:v3'/>");
	// Латиница внутри XML — это разметка документа, а не сообщение пользователю.
	assertNoLatinOnScreen(state, "failed с предпросмотром XML");

	// Отсутствующий предпросмотр остаётся null: выдуманная заглушка здесь была бы
	// подменой неизвестного значения.
	const withoutPreview = readVisitTransmission(
		{ logs: [{ visitId: "v-1", status: "Pending" }] },
		"v-1",
	);
	assert.equal(withoutPreview.kind, "ok");
	if (withoutPreview.kind === "ok")
		assert.equal(withoutPreview.data?.xmlPreview, null);
	assert.equal(
		resolveEgiszPanelState({
			statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
			journalOutcome: classifyFailedHttpStatus(404),
		}).xmlPreview,
		null,
	);
});

test("кнопка включена РОВНО в двух состояниях, и оба требуют подтверждения от сервера", () => {
	// Инвариант всего пакета: canTransmit истинно только там, где сервер сам сказал
	// configured:true и remdTransmission:true. Ни одно состояние неудачи не включает
	// кнопку, и ни одно включённое состояние не несёт причину запрета.
	const enabled: EgiszPanelState["kind"][] = [];
	const states: EgiszPanelState[] = [
		resolveEgiszPanelState({ statusOutcome: null, journalOutcome: null }),
		resolveEgiszPanelState({
			statusOutcome: readIntegrationStatus(LIVE_INTEGRATION_STATUS),
			journalOutcome: EMPTY_JOURNAL,
		}),
	];
	for (const httpStatus of [401, 403, 404, 405, 500, 501, 502]) {
		states.push(
			resolveEgiszPanelState({
				statusOutcome: classifyFailedHttpStatus(httpStatus),
				journalOutcome: classifyFailedHttpStatus(httpStatus),
			}),
		);
		// И перекрёстно: честный статус, но недоступный журнал.
		states.push(
			resolveEgiszPanelState({
				statusOutcome: HEALTHY_STATUS,
				journalOutcome: classifyFailedHttpStatus(httpStatus),
			}),
		);
	}
	states.push(
		resolveEgiszPanelState({
			statusOutcome: { kind: "network" },
			journalOutcome: { kind: "network" },
		}),
		resolveEgiszPanelState({
			statusOutcome: readIntegrationStatus(FASTIFY_NOT_FOUND),
			journalOutcome: EMPTY_JOURNAL,
		}),
		resolveEgiszPanelState({
			statusOutcome: {
				kind: "ok",
				data: {
					configured: true,
					remdTransmission: false,
					ukepSigning: false,
					cdaGeneration: true,
					missingConfiguration: [],
				},
			},
			journalOutcome: EMPTY_JOURNAL,
		}),
		resolveEgiszPanelState({
			statusOutcome: HEALTHY_STATUS,
			journalOutcome: EMPTY_JOURNAL,
		}),
	);
	for (const status of ["Pending", "Sent", "Accepted", "Error"] as const) {
		states.push(
			resolveEgiszPanelState({
				statusOutcome: HEALTHY_STATUS,
				journalOutcome: {
					kind: "ok",
					data: {
						status,
						transactionId: null,
						errorMessage: null,
						xmlPreview: null,
					},
				},
			}),
		);
	}

	for (const state of states) {
		if (state.canTransmit) {
			enabled.push(state.kind);
			// Включённая кнопка не имеет права нести причину запрета.
			assert.equal(
				state.transmitBlockedReason,
				"",
				`состояние ${state.kind} включает кнопку и одновременно печатает причину запрета`,
			);
		} else {
			// Выключенная кнопка обязана объяснить причину рядом с собой.
			assert.notEqual(
				state.transmitBlockedReason,
				"",
				`состояние ${state.kind} выключает кнопку молча`,
			);
		}
	}

	assert.deepEqual([...new Set(enabled)].sort(), ["empty", "failed"]);
	// Ни один 404 не включает кнопку — исходный дефект.
	for (const httpStatus of [404, 405, 501]) {
		assert.equal(
			resolveEgiszPanelState({
				statusOutcome: HEALTHY_STATUS,
				journalOutcome: classifyFailedHttpStatus(httpStatus),
			}).canTransmit,
			false,
		);
	}
});

test("журнал выгрузок читается только по своему приёму", () => {
	const body = {
		logs: [
			{ visitId: "v-1", status: "Accepted", transactionId: "TX-1" },
			{
				visitId: "v-2",
				status: "Error",
				errorDetails: { message: "Отклонено" },
			},
		],
	};
	const mine = readVisitTransmission(body, "v-2");
	assert.equal(mine.kind, "ok");
	if (mine.kind === "ok") {
		assert.equal(mine.data?.status, "Error");
		assert.equal(mine.data?.errorMessage, "Отклонено");
	}

	const foreign = readVisitTransmission(body, "v-9");
	assert.equal(foreign.kind, "ok");
	if (foreign.kind === "ok") assert.equal(foreign.data, null);

	// Неизвестный статус — это неразобранный ответ, а не «готово к отправке».
	const broken = readVisitTransmission(
		{ logs: [{ visitId: "v-1", status: "WAT" }] },
		"v-1",
	);
	assert.equal(broken.kind, "unreadable");
	assert.equal(
		readVisitTransmission(FASTIFY_NOT_FOUND, "v-1").kind,
		"unreadable",
	);
});

test("справочник бланков: отсутствующий раздел больше не выдаётся за ненастроенный", () => {
	const missing = resolveEgiszCatalogState(classifyFailedHttpStatus(404));
	assert.equal(missing.kind, "unavailable");
	assert.match(missing.headline, /недоступен/);
	assert.doesNotMatch(missing.detail, /не задан/);
	// Кнопки «Проверить снова» здесь быть не должно: повтор ничего не изменит.
	assert.equal(missing.canRetryLoad, false);

	const empty = resolveEgiszCatalogState({ kind: "ok", data: [] });
	assert.equal(empty.kind, "empty");
	assert.match(empty.headline, /не заданы/);
	assert.equal(empty.canRetryLoad, true);

	const ready = resolveEgiszCatalogState({ kind: "ok", data: [{}] });
	assert.equal(ready.kind, "ready");

	assert.equal(resolveEgiszCatalogState(null).kind, "loading");
	assert.notEqual(missing.headline, empty.headline);
});

test("ни одно состояние справочника не выносит латиницу на экран", () => {
	const states = [
		resolveEgiszCatalogState(null),
		resolveEgiszCatalogState({ kind: "ok", data: [] }),
		resolveEgiszCatalogState({ kind: "ok", data: [{}] }),
		resolveEgiszCatalogState({ kind: "missing" }),
		resolveEgiszCatalogState({ kind: "unauthorized" }),
		resolveEgiszCatalogState({ kind: "network" }),
		resolveEgiszCatalogState({ kind: "server_error", httpStatus: 500 }),
		resolveEgiszCatalogState({ kind: "unreadable" }),
	];
	assert.equal(new Set(states.map((s) => s.kind)).size, 8);
	for (const state of states) {
		assert.ok(
			!/[A-Za-z]/.test(state.headline),
			`латиница в headline: ${state.headline}`,
		);
		assert.ok(
			!/[A-Za-z]/.test(state.detail),
			`латиница в detail: ${state.detail}`,
		);
	}
});
