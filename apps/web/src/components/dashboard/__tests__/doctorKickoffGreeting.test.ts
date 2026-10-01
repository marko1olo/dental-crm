import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	DoctorKickoffWidget,
	formatDailyKickoffSummary,
	formatDoctorGreeting,
	formatNetworkStatusInfo,
	getKickoffTimeGreeting,
} from "../DoctorKickoffWidget";

describe("Doctor Kickoff & Daily Greeting Suite", () => {
	describe("1. Time of Day Greetings", () => {
		it("returns 'Доброе утро' for morning hours (05:00 - 11:59)", () => {
			assert.equal(getKickoffTimeGreeting(5), "Доброе утро");
			assert.equal(getKickoffTimeGreeting(8), "Доброе утро");
			assert.equal(getKickoffTimeGreeting(11), "Доброе утро");
		});

		it("returns 'Добрый день' for daytime hours (12:00 - 17:59)", () => {
			assert.equal(getKickoffTimeGreeting(12), "Добрый день");
			assert.equal(getKickoffTimeGreeting(14), "Добрый день");
			assert.equal(getKickoffTimeGreeting(17), "Добрый день");
		});

		it("returns 'Добрый вечер' for evening hours (18:00 - 22:59)", () => {
			assert.equal(getKickoffTimeGreeting(18), "Добрый вечер");
			assert.equal(getKickoffTimeGreeting(20), "Добрый вечер");
			assert.equal(getKickoffTimeGreeting(22), "Добрый вечер");
		});

		it("returns 'Доброй ночи' for night hours (23:00 - 04:59)", () => {
			assert.equal(getKickoffTimeGreeting(23), "Доброй ночи");
			assert.equal(getKickoffTimeGreeting(1), "Доброй ночи");
			assert.equal(getKickoffTimeGreeting(4), "Доброй ночи");
		});
	});

	describe("2. Personalized Doctor Greeting", () => {
		it("formats greeting with doctor name", () => {
			const res = formatDoctorGreeting("Барабаш С.В.", 9);
			assert.equal(res, "Доброе утро, доктор Барабаш С.В.!");
		});

		it("cleans duplicate prefixes like 'д-р' or 'доктор'", () => {
			const res1 = formatDoctorGreeting("д-р Смирнова", 14);
			assert.equal(res1, "Добрый день, доктор Смирнова!");

			const res2 = formatDoctorGreeting("доктор Петров", 19);
			assert.equal(res2, "Добрый вечер, доктор Петров!");
		});

		it("falls back gracefully when doctor name is not passed", () => {
			const res = formatDoctorGreeting("", 10);
			assert.equal(res, "Доброе утро, доктор!");
		});
	});

	describe("3. Daily Kickoff Summary & Russian Pluralization", () => {
		it("formats exact user spec for 4 patients, open shift, and ready cash", () => {
			const summary = formatDailyKickoffSummary({
				appointmentsCount: 4,
				isShiftOpen: true,
				isCashReady: true,
			});
			assert.equal(
				summary,
				"На сегодня запланировано 4 пациента, смена открыта, касса готова.",
			);
		});

		it("handles singular 1 пациент properly", () => {
			const summary = formatDailyKickoffSummary({
				appointmentsCount: 1,
				isShiftOpen: true,
				isCashReady: true,
			});
			assert.equal(
				summary,
				"На сегодня запланировано 1 пациент, смена открыта, касса готова.",
			);
		});

		it("handles plural 5 пациентов properly", () => {
			const summary = formatDailyKickoffSummary({
				appointmentsCount: 5,
				isShiftOpen: true,
				isCashReady: true,
			});
			assert.equal(
				summary,
				"На сегодня запланировано 5 пациентов, смена открыта, касса готова.",
			);
		});

		it("handles closed shift and pending cash statuses cleanly", () => {
			const summary = formatDailyKickoffSummary({
				appointmentsCount: 0,
				isShiftOpen: false,
				isCashReady: false,
			});
			assert.equal(
				summary,
				"На сегодня запланировано 0 пациентов, смена ожидает открытия, касса не открыта.",
			);
		});
	});

	describe("4. Network Status Telemetry (Quiet Telemetry / Mandate 8d)", () => {
		it("returns online badge info when connected", () => {
			const info = formatNetworkStatusInfo(false);
			assert.equal(info.statusText, "🟢 Сервер подключен");
			assert.equal(info.badgeType, "online");
			assert.ok(info.ariaLabel.includes("Сервер подключен"));
		});

		it("returns offline / LAN autonomy badge when disconnected", () => {
			const info = formatNetworkStatusInfo(true);
			assert.equal(info.statusText, "📡 Автономный режим (Локальная сеть)");
			assert.equal(info.badgeType, "offline");
			assert.ok(info.ariaLabel.includes("Автономный режим"));
		});
	});

	describe("5. SSR Component Markup & Accessibility", () => {
		it("renders DoctorKickoffWidget without crashing and produces accessible HTML", () => {
			const html = renderToString(
				React.createElement(DoctorKickoffWidget, {
					doctorName: "Барабаш С.В.",
					appointmentsCount: 4,
					isShiftOpen: true,
					isCashReady: true,
					isOffline: false,
				}),
			);

			assert.ok(html.includes("doctor-kickoff-widget"));
			assert.ok(html.includes("Барабаш С.В."));
			assert.ok(html.includes("4 пациента"));
			assert.ok(html.includes("смена открыта"));
			assert.ok(html.includes("касса готова"));
			assert.ok(html.includes("Сервер подключен"));
			assert.ok(html.includes("telemetry-online"));
		});

		it("renders autonomous offline mode badge when isOffline=true", () => {
			const html = renderToString(
				React.createElement(DoctorKickoffWidget, {
					doctorName: "Иванов И.И.",
					appointmentsCount: 2,
					isShiftOpen: false,
					isCashReady: true,
					isOffline: true,
				}),
			);

			assert.ok(html.includes("telemetry-offline"));
			assert.ok(html.includes("Автономный режим (Локальная сеть)"));
			assert.ok(html.includes("2 пациента"));
		});
	});
});
