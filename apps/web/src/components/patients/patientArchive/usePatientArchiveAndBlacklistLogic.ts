import { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientResource } from "../../../hooks/usePatientResource";
import { actionFailureToast, resolvePanelPhase, unconfirmedActionToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { ArchiveReasonItem } from "./archiveTypes";

export function usePatientArchiveAndBlacklistLogic(patientId: string) {
	const { auth, dashboard } = useAppLogicContext();
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [archiveReason, setArchiveReason] = useState("");
	const [modalIsBlacklisted, setModalIsBlacklisted] = useState(false);
	const [blacklistReason, setBlacklistReason] = useState("");
	const [optimisticBlacklist, setOptimisticBlacklist] = useState<boolean | null>(null);

	const { data: reasons, isLoading: loading, error: loadFailure, failureStatus, reload } = usePatientResource<ArchiveReasonItem[]>(
		patientId,
		(id) => `/api/patients/${id}/archive-status`,
		() => (auth ? auth.denteClinicalReadHeaders() : {}),
		[],
	);

	useEffect(() => {
		setOptimisticBlacklist(null);
		setConfirmModalOpen(false);
		setArchiveReason("");
		setBlacklistReason("");
		setModalIsBlacklisted(false);
	}, []);

	const patientIdRef = useRef(patientId);
	patientIdRef.current = patientId;

	const isBlacklisted = optimisticBlacklist ?? reasons[0]?.isBookingBlocked ?? false;
	const statusPhase = resolvePanelPhase({ isLoading: loading, hasFailure: Boolean(loadFailure), isEmpty: reasons.length === 0 });
	const statusUnknown = statusPhase === "failed" && optimisticBlacklist === null;

	const patientName = (dashboard?.patients as Array<{ id: string; fullName?: string }> | undefined)?.find(
		(p) => p.id === patientId,
	)?.fullName ?? null;

	const handleApplyStatus = async () => {
		if (isApplying || loading) return;
		const targetPatientId = patientId;
		const newStatus = !isBlacklisted;
		setIsApplying(true);
		const endpoint = newStatus ? `/api/patients/${targetPatientId}/archive` : `/api/patients/${targetPatientId}/archive-status`;
		const bodyPayload = newStatus ? { archiveReason, isBlacklisted: modalIsBlacklisted, blacklistReason } : { isBlacklisted: newStatus };

		if (newStatus && !archiveReason.trim()) {
			showToast(actionFailureToast("Укажите причину архивации", 400), "error");
			setIsApplying(false);
			return;
		}

		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: auth ? { ...auth.denteClinicalMutationHeaders(), "Content-Type": "application/json" } : { "Content-Type": "application/json" },
				body: JSON.stringify(bodyPayload),
			});
			if (!res.ok) {
				showToast(actionFailureToast(newStatus ? "Пациент не добавлен в черный список" : "Блокировка записи не снята", res.status), "error");
				return;
			}
			const data = await res.json().catch((err) => {
				showToast(actionFailureToast("Ошибка ответа сервера", (err as { status?: number })?.status ?? null), "error");
				return {} as Record<string, unknown>;
			});
			if (!(data.success || data.isBlacklisted !== undefined)) {
				showToast(unconfirmedActionToast(newStatus ? "Пациент не добавлен в черный список" : "Блокировка записи не снята"), "error");
				return;
			}
			if (patientIdRef.current !== targetPatientId) return;
			setOptimisticBlacklist(newStatus);
			setConfirmModalOpen(false);
			reload();
			showToast(newStatus ? "Пациент добавлен в черный список." : "Разблокировано. Пациент восстановлен из черного списка.", newStatus ? "warning" : "success");
		} catch (error) {
			logger.error("[PatientArchiveAndBlacklistWidget apply error]:", error);
			showToast(actionFailureToast(newStatus ? "Пациент не добавлен в черный список" : "Блокировка записи не снята", null), "error");
		} finally {
			setIsApplying(false);
		}
	};

	return {
		loading, isApplying, isBlacklisted, statusUnknown, failureStatus, reload,
		confirmModalOpen, setConfirmModalOpen, archiveReason, setArchiveReason,
		modalIsBlacklisted, setModalIsBlacklisted, blacklistReason, setBlacklistReason,
		patientName, handleApplyStatus,
	};
}
