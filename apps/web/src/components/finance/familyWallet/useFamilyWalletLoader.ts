import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { useCountUp } from "../../../hooks/useCountUp";
import { useWebsocket } from "../../../hooks/useWebsocket";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { type FamilyGroup, type FamilyLedgerEntry } from "./types";
import { logger } from "../../../utils/logger";

export function useFamilyWalletLoader(patientId: string, isPatientDatabaseId: boolean) {
	const [family, setFamily] = useState<FamilyGroup | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadFailure, setLoadFailure] = useState<{ status: number | null } | null>(null);
	const [ledgerEntries, setLedgerEntries] = useState<FamilyLedgerEntry[]>([]);
	const requestGenerationRef = useRef(0);
	const selectedPatientIdRef = useRef(patientId);

	const loadFamily = useCallback(async () => {
		const generation = requestGenerationRef.current + 1;
		requestGenerationRef.current = generation;
		const isStale = () => requestGenerationRef.current !== generation || selectedPatientIdRef.current !== patientId;
		setIsLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (isStale()) return;
			if (res.ok) {
				const data = (await res.json()) as FamilyGroup;
				if (isStale()) return;
				setFamily(data);
				if (data.ledger && Array.isArray(data.ledger)) {
					setLedgerEntries(data.ledger);
				} else if (data.id) {
					void fetch(`/api/finance/family/${data.id}/history`, { headers: denteAdminSecretRequestHeaders() })
						.then((hRes) => (hRes.ok ? hRes.json() : []))
						.then((rows) => { if (Array.isArray(rows) && !isStale()) setLedgerEntries(rows); })
						.catch(() => {});
				}
				setLoadFailure(null);
				return;
			}
			setFamily(null);
			setLoadFailure(res.status === 404 ? null : { status: res.status });
		} catch (e) {
			showToast(actionFailureToast("Ошибка выполнения операции", (e as { status?: number })?.status ?? null), "error");
			if (isStale()) return;
			logger.error("[family wallet] не удалось прочитать семейный кошелёк:", e);
			setFamily(null);
			setLoadFailure({ status: null });
		} finally {
			if (!isStale()) setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		selectedPatientIdRef.current = patientId;
		setFamily(null);
		setLoadFailure(null);
		if (!isPatientDatabaseId) {
			setIsLoading(false);
			return;
		}
		void loadFamily();
		return () => { requestGenerationRef.current += 1; };
	}, [isPatientDatabaseId, loadFamily, patientId]);

	const wsUrl = (() => {
		const wsHost = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WS_URL;
		if (wsHost) return wsHost;
		if (typeof window !== "undefined" && window.location) {
			return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/ws/schedule`;
		}
		return "ws://127.0.0.1:4100/api/ws/schedule";
	})();
	const { lastMessage } = useWebsocket(wsUrl);

	useEffect(() => {
		if (lastMessage?.type === "FAMILY_BALANCE_UPDATED" && lastMessage.payload) {
			setFamily((prev) => {
				if (prev && lastMessage.payload.familyGroupId === prev.id) {
					return { ...prev, balance: lastMessage.payload.balance };
				}
				return prev;
			});
		}
	}, [lastMessage]);

	const parsedBalance = Number(family?.balance ?? 0);
	const balanceVal = Number.isFinite(parsedBalance) ? parsedBalance : 0;
	const animatedBalance = useCountUp(balanceVal, 1000);

	return {
		family,
		isLoading,
		loadFailure,
		loadFamily,
		ledgerEntries,
		setLedgerEntries,
		balanceVal,
		animatedBalance,
	};
}
