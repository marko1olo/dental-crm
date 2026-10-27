/**
 * useNewAppointmentPatientStatus.ts — Checks blacklist status and active lab orders for selected patient.
 */

import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import type { BlacklistStatus } from "./types";

interface UseNewAppointmentPatientStatusParams {
	patientId?: string | null | undefined;
	authRef: React.MutableRefObject<any>;
}

export function useNewAppointmentPatientStatus({
	patientId,
	authRef,
}: UseNewAppointmentPatientStatusParams) {
	const [blacklistStatus, setBlacklistStatus] = useState<BlacklistStatus | null>(null);
	const [activeLabOrders, setActiveLabOrders] = useState<any[]>([]);

	useEffect(() => {
		if (!patientId) {
			setBlacklistStatus(null);
			return;
		}
		let cancelled = false;
		const headers =
			typeof authRef.current?.denteClinicalReadHeaders === "function"
				? authRef.current.denteClinicalReadHeaders()
				: {};

		fetch(`/api/patients/${patientId}/archive-status`, { headers })
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				const rows = Array.isArray(data) ? data : [];
				const blocked = rows.find(
					(r: { isBookingBlocked?: boolean }) => r?.isBookingBlocked === true,
				) as { reasonName?: string; notes?: string } | undefined;
				if (blocked) {
					setBlacklistStatus({
						isBlocked: true,
						reason: blocked.reasonName || blocked.notes || "Пациент в черном списке",
					});
				} else {
					setBlacklistStatus(null);
				}
			})
			.catch((err) => {
				logger.error("[Dente]", err);
				if (!cancelled) {
					setBlacklistStatus({
						isBlocked: false,
						checkFailed: true,
						reason: "Не удалось проверить статус пациента в чёрном списке. Уточните статус перед подтверждением записи.",
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [patientId, authRef]);

	useEffect(() => {
		if (!patientId) {
			setActiveLabOrders([]);
			return;
		}
		let cancelled = false;
		fetch(`/api/clinical/lab-orders?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				if (!cancelled) {
					const list = Array.isArray(data)
						? data
						: Array.isArray(data?.orders)
						? data.orders
						: Array.isArray(data?.data)
						? data.data
						: [];
					const active = list.filter(
						(o: any) => o.status !== "completed" && o.status !== "cancelled",
					);
					setActiveLabOrders(active);
				}
			})
			.catch(() => {
				if (!cancelled) setActiveLabOrders([]);
			});

		return () => {
			cancelled = true;
		};
	}, [patientId]);

	return { blacklistStatus, activeLabOrders };
}
