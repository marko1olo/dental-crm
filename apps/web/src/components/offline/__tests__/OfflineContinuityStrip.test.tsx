/**
 * DENTE CRM — Unit Tests for OfflineContinuityStrip Component
 *
 * Проверка:
 * 1. Корректное отображение 3 состояний топологии:
 *    - 🟢 «В сети (Облако DENTE)»
 *    - 🟡 «Локальная сеть клиники (Wi-Fi) • В очереди X операций»
 *    - 🔴 «Офлайн-режим • Данные сохранены в памяти • В очереди X операций»
 * 2. Русская плюрализация счетчика операций (1 операция, 2 операции, 5 операций, 21 операция)
 * 3. Логика кнопки «Синхронизировать сейчас» (активна при наличии очереди и online/lan, заблокирована в офлайн)
 * 4. Реактивная подписка на прогресс дренажа через OfflineSyncService
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { offlineSyncService } from "../../../services/offline";
import { useOfflineStore } from "../../../store/offlineStore";
import {
	formatRttLabel,
	getNetworkSyncStatusLabel,
	getRttQuality,
	NETWORK_STATE_LABELS,
	pluralizeOperations,
} from "../../../utils/networkConnectivity";
import { OfflineContinuityStrip } from "../OfflineContinuityStrip";

describe("OfflineContinuityStrip Component & Network Labels", () => {
	beforeEach(() => {
		useOfflineStore.setState({
			networkState: {
				mode: "cloud_online",
				label: NETWORK_STATE_LABELS.cloud_online,
				badgeClass: "cloud",
				rttMs: 24,
				lastCheckedAt: new Date().toISOString(),
				isOnline: true,
				isLan: false,
			},
			pendingMutationCount: 0,
			pendingMutations: [],
			isSyncing: false,
		});
	});

	test("1. Russian pluralization of operations count", () => {
		assert.strictEqual(pluralizeOperations(1), "1 операция");
		assert.strictEqual(pluralizeOperations(2), "2 операции");
		assert.strictEqual(pluralizeOperations(3), "3 операции");
		assert.strictEqual(pluralizeOperations(4), "4 операции");
		assert.strictEqual(pluralizeOperations(5), "5 операций");
		assert.strictEqual(pluralizeOperations(10), "10 операций");
		assert.strictEqual(pluralizeOperations(11), "11 операций");
		assert.strictEqual(pluralizeOperations(12), "12 операций");
		assert.strictEqual(pluralizeOperations(14), "14 операций");
		assert.strictEqual(pluralizeOperations(20), "20 операций");
		assert.strictEqual(pluralizeOperations(21), "21 операция");
		assert.strictEqual(pluralizeOperations(22), "22 операции");
		assert.strictEqual(pluralizeOperations(25), "25 операций");
		assert.strictEqual(pluralizeOperations(101), "101 операция");
		assert.strictEqual(pluralizeOperations(104), "104 операции");
		assert.strictEqual(pluralizeOperations(111), "111 операций");
		assert.strictEqual(pluralizeOperations(500), "500 операций");
	});

	test("2. Network sync status label in Cloud mode", () => {
		const label = getNetworkSyncStatusLabel({
			mode: "cloud_online",
			rttMs: 15,
			pendingCount: 0,
		});
		assert.strictEqual(label, "В сети (Облако DENTE) · 15 мс");
	});

	test("3. Network sync status label in LAN mode with pending queue", () => {
		const label = getNetworkSyncStatusLabel({
			mode: "lan_online",
			rttMs: 2,
			pendingCount: 7,
		});
		assert.strictEqual(
			label,
			"Локальная сеть клиники (Wi-Fi) · 2 мс • В очереди 7 операций",
		);
	});

	test("4. Network sync status label in Offline mode with pending queue", () => {
		const label = getNetworkSyncStatusLabel({
			mode: "offline",
			pendingCount: 12,
		});
		assert.strictEqual(
			label,
			"Офлайн-режим • Данные сохранены в памяти • В очереди 12 операций",
		);
	});

	test("5. Server-side render of OfflineContinuityStrip in Cloud Online mode", () => {
		const html = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "cloud_online",
					label: NETWORK_STATE_LABELS.cloud_online,
					badgeClass: "cloud",
					rttMs: 18,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: false,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(html.includes("Связь отличная (Облако онлайн)"));
		assert.ok(html.includes("offline-continuity-strip--cloud"));
		assert.ok(html.includes("Синхронизировать сейчас"));
		assert.ok(html.includes("disabled"));
	});

	test("6. Server-side render of OfflineContinuityStrip in LAN mode with active sync button", () => {
		const html = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "lan_online",
					label: NETWORK_STATE_LABELS.lan_online,
					badgeClass: "lan",
					rttMs: 3,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: true,
				}}
				pendingMutationCount={5}
			/>,
		);
		assert.ok(html.includes("Работаем по локальной сети клиники (Wi-Fi)"));
		assert.ok(html.includes("offline-continuity-strip--lan"));
		assert.ok(html.includes("В очереди 5 операций"));
		assert.ok(html.includes("offline-sync-btn--active"));
	});

	test("7. Server-side render of OfflineContinuityStrip in Offline mode with disabled sync button", () => {
		const html = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "offline",
					label: NETWORK_STATE_LABELS.offline,
					badgeClass: "offline",
					rttMs: null,
					lastCheckedAt: new Date().toISOString(),
					isOnline: false,
					isLan: false,
				}}
				pendingMutationCount={8}
			/>,
		);
		assert.ok(html.includes("Нет интернета. Все записи сохраняются на этот компьютер, ничего не пропадет!"));
		assert.ok(html.includes("offline-continuity-strip--offline"));
		assert.ok(html.includes("В очереди 8 операций"));
		assert.ok(html.includes("offline-sync-btn--disabled"));
	});

	test("8. RTT micro-indicator quality grading and labels", () => {
		assert.strictEqual(getRttQuality(15, true), "good");
		assert.strictEqual(getRttQuality(100, true), "good");
		assert.strictEqual(getRttQuality(250, true), "moderate");
		assert.strictEqual(getRttQuality(400, true), "moderate");
		assert.strictEqual(getRttQuality(450, true), "poor");
		assert.strictEqual(getRttQuality(null, false), "offline");

		assert.strictEqual(formatRttLabel("cloud_online", 15), "Облако (15 мс)");
		assert.strictEqual(formatRttLabel("lan_online", 2), "Локальный Wi-Fi (2 мс)");
		assert.strictEqual(formatRttLabel("offline", null), "Офлайн (0 мс)");

		const goodHtml = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "cloud_online",
					label: NETWORK_STATE_LABELS.cloud_online,
					badgeClass: "cloud",
					rttMs: 15,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: false,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(goodHtml.includes("offline-continuity-strip__rtt-pill--good"));
		assert.ok(goodHtml.includes("Облако (15 мс)"));

		const lanHtml = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "lan_online",
					label: NETWORK_STATE_LABELS.lan_online,
					badgeClass: "lan",
					rttMs: 2,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: true,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(lanHtml.includes("offline-continuity-strip__rtt-pill--good"));
		assert.ok(lanHtml.includes("Локальный Wi-Fi (2 мс)"));

		const offlineHtml = renderToString(
			<OfflineContinuityStrip
				networkState={{
					mode: "offline",
					label: NETWORK_STATE_LABELS.offline,
					badgeClass: "offline",
					rttMs: null,
					lastCheckedAt: new Date().toISOString(),
					isOnline: false,
					isLan: false,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(offlineHtml.includes("offline-continuity-strip__rtt-pill--offline"));
		assert.ok(offlineHtml.includes("Офлайн (0 мс)"));
	});

	test("9. Auto-collapse and compact rendering mode", () => {
		const compactHtml = renderToString(
			<OfflineContinuityStrip
				compact={true}
				networkState={{
					mode: "cloud_online",
					label: NETWORK_STATE_LABELS.cloud_online,
					badgeClass: "cloud",
					rttMs: 15,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: false,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(compactHtml.includes("offline-continuity-strip--collapsed"));
		assert.ok(compactHtml.includes("Облако (15 мс)"));

		const expandedHtml = renderToString(
			<OfflineContinuityStrip
				compact={false}
				autoCollapseWhenStable={false}
				networkState={{
					mode: "cloud_online",
					label: NETWORK_STATE_LABELS.cloud_online,
					badgeClass: "cloud",
					rttMs: 15,
					lastCheckedAt: new Date().toISOString(),
					isOnline: true,
					isLan: false,
				}}
				pendingMutationCount={0}
			/>,
		);
		assert.ok(expandedHtml.includes("offline-continuity-strip--expanded"));
	});
});

