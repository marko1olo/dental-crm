/**
 * useMarketingPromos.ts — Хук управления маркетинговыми акциями клиники с персистенцией в PostgreSQL 18.
 *
 * Схема синхронизации:
 * - GET /api/marketing/promos — загрузка списка акций из PostgreSQL 18 (с авто-сидированием на сервере)
 * - POST /api/marketing/promos — сохранение новой акции в PostgreSQL 18
 * - PATCH /api/marketing/promos/:id/status — переключение статуса акции (active / archived) в PostgreSQL 18
 */

import { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
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
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !Array.isArray(data?.promos) || data.promos.length === 0) return;
				setPromos(data.promos as MarketingPromo[]);
				setSelectedPromoId((prev) => prev || data.promos[0]?.id || "");
			} catch {
				// При офлайне сохраняются канонические пресеты клиники
			}
		}
		void loadPromosFromServer();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectedPromo = promos.find((p) => p.id === selectedPromoId) || promos[0];

	const handleTogglePromoStatus = useCallback((promoId: string) => {
		let targetNextStatus: MarketingPromo["status"] = "archived";
		setPromos((prev) =>
			prev.map((p) => {
				if (p.id !== promoId) return p;
				targetNextStatus = p.status === "active" ? "archived" : "active";
				return { ...p, status: targetNextStatus };
			}),
		);

		void fetch(`/api/marketing/promos/${encodeURIComponent(promoId)}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({ status: targetNextStatus }),
		}).catch(() => {});
	}, []);

	const handleSaveNewPromo = useCallback((newPromo: MarketingPromo) => {
		setPromos((prev) => [newPromo, ...prev.filter((p) => p.id !== newPromo.id)]);
		setSelectedPromoId(newPromo.id);

		void fetch("/api/marketing/promos", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(newPromo),
		}).catch(() => {});
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
