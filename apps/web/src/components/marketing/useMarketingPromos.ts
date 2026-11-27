/**
 * useMarketingPromos.ts — Хук управления маркетинговыми акциями клиники с персистенцией в PostgreSQL 18.
 *
 * Схема синхронизации:
 * - GET /api/marketing/promos — загрузка списка акций из PostgreSQL 18 (с авто-сидированием на сервере)
 * - POST /api/marketing/promos — сохранение новой акции в PostgreSQL 18
 * - PATCH /api/marketing/promos/:id/status — переключение статуса акции (active / archived) в PostgreSQL 18
 */

import { useCallback, useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { clientLogger } from "../../services/logging/clientLogger";
import { DEFAULT_MARKETING_PROMOS } from "./marketingPresets";
import type { MarketingPromo } from "./marketingTypes";

export function useMarketingPromos() {
	const isDemo = isDemoShowcaseMode();
	const [promos, setPromos] = useState<readonly MarketingPromo[]>(() =>
		isDemo ? DEFAULT_MARKETING_PROMOS : [],
	);
	const [selectedPromoId, setSelectedPromoId] = useState<string>(() =>
		isDemo ? (DEFAULT_MARKETING_PROMOS[0]?.id ?? "") : "",
	);
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);

	// Подгрузка акций из PostgreSQL 18 при монтировании
	useEffect(() => {
		let cancelled = false;
		async function loadPromosFromServer() {
			try {
				const res = await fetch("/api/marketing/promos", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				const data = await res.json();
				if (cancelled || !Array.isArray(data?.promos) || data.promos.length === 0) return;
				setPromos(data.promos as MarketingPromo[]);
				setSelectedPromoId((prev) => prev || data.promos[0]?.id || "");
			} catch (err) {
				clientLogger.error("[useMarketingPromos] Ошибка загрузки акций клиники:", err);
				showToast("Не удалось загрузить акции клиники", "error", 6000, {
					label: "Повторить",
					onAction: () => { void loadPromosFromServer(); },
				});
			}
		}
		void loadPromosFromServer();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectedPromo = promos.find((p) => p.id === selectedPromoId) || promos[0];

	const handleTogglePromoStatus = useCallback((promoId: string, retryKey?: string) => {
		const targetPromo = promos.find((p) => p.id === promoId);
		if (!targetPromo) return;
		const previousStatus = targetPromo.status;
		const nextStatus: MarketingPromo["status"] = previousStatus === "active" ? "archived" : "active";
		const idempotencyKey = retryKey ?? generateUuidV7();

		setPromos((prev) =>
			prev.map((p) => (p.id === promoId ? { ...p, status: nextStatus } : p)),
		);

		fetch(`/api/marketing/promos/${encodeURIComponent(promoId)}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders({ "Idempotency-Key": idempotencyKey }),
			},
			body: JSON.stringify({ status: nextStatus }),
		})
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
			})
			.catch((err) => {
				clientLogger.error("[useMarketingPromos] Ошибка смены статуса акции:", err);
				setPromos((prev) =>
					prev.map((p) => (p.id === promoId ? { ...p, status: previousStatus } : p)),
				);
				showToast("Не удалось обновить статус акции", "error", 6000, {
					label: "Повторить",
					onAction: () => handleTogglePromoStatus(promoId, idempotencyKey),
				});
			});
	}, [promos]);

	const handleSaveNewPromo = useCallback((newPromo: MarketingPromo, retryKey?: string) => {
		const idempotencyKey = retryKey ?? generateUuidV7();
		let previousPromos: readonly MarketingPromo[] = [];
		let previousSelectedId = "";
		setPromos((prev) => {
			previousPromos = prev;
			return [newPromo, ...prev.filter((p) => p.id !== newPromo.id)];
		});
		setSelectedPromoId((prevId) => {
			previousSelectedId = prevId;
			return newPromo.id;
		});

		fetch("/api/marketing/promos", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders({ "Idempotency-Key": idempotencyKey }),
			},
			body: JSON.stringify(newPromo),
		})
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
			})
			.catch((err) => {
				clientLogger.error("[useMarketingPromos] Ошибка сохранения новой акции:", err);
				setPromos(previousPromos);
				setSelectedPromoId(previousSelectedId);
				showToast("Не удалось сохранить акцию в базе", "error", 6000, {
					label: "Повторить",
					onAction: () => handleSaveNewPromo(newPromo, idempotencyKey),
				});
			});
	}, []);

	return {
		promos,
		selectedPromo,
		selectedPromoId,
		setSelectedPromoId,
		isNewModalOpen,
		setIsNewModalOpen,
		handleTogglePromoStatus,
		handleSaveNewPromo,
	};
}
