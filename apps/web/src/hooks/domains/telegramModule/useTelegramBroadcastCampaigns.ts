import type {
	DenteTelegramOutboxResponse,
	DenteTelegramOutboxSendDueResponse,
	DenteTelegramOutboxSendResponse,
} from "@dental/shared";
import {
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	telegramHumanMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { useSettingsStore } from "../../../store/settingsStore";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type {
	UseTelegramBroadcastCampaignsOptions,
	UseTelegramBroadcastCampaignsResult,
} from "./types";

export function useTelegramBroadcastCampaigns({
	loadDashboard,
	setError,
	telegramControlPlaneHeaders,
	loadTelegramControlPlane,
	telegramOutboxRequestParams,
	telegramOutboxActionQueryString,
}: UseTelegramBroadcastCampaignsOptions): UseTelegramBroadcastCampaignsResult {
	const {
		isTelegramSendingDue,
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		setIsTelegramOutboxLoadingMore,
	} = useAppStore();

	const {
		telegramOutbox,
		setTelegramOutbox,
		telegramSendingItemId,
		setTelegramSendingItemId,
		telegramAdminSecretSession,
		telegramAdminSecretDraft,
	} = useSettingsStore();

	async function loadMoreTelegramOutbox() {
		if (!telegramOutbox?.nextCursor || isTelegramOutboxLoadingMore) return;
		setIsTelegramOutboxLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const outboxParams = telegramOutboxRequestParams(
				telegramOutbox.nextCursor,
			);
			const response = await fetchWithHandling(
				`/api/telegram/outbox?${outboxParams.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Очередь Telegram"),
				);
			const nextPage = (await response.json()) as DenteTelegramOutboxResponse;
			setTelegramOutbox((current) => {
				if (!current) return nextPage;
				const knownIds = new Set(current.items.map((item) => item.id));
				return {
					...nextPage,
					items: [
						...current.items,
						...nextPage.items.filter((item) => !knownIds.has(item.id)),
					],
				};
			});
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Очередь Telegram не загрузилась",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Очередь Telegram не загрузилась",
					telegramError,
				),
			);
		} finally {
			setIsTelegramOutboxLoadingMore(false);
		}
	}

	async function sendTelegramOutboxItem(itemId: string) {
		if (telegramSendingItemId || isTelegramSendingDue) {
			setError("Дождитесь завершения текущей отправки Telegram.");
			return;
		}
		setTelegramSendingItemId(itemId);
		try {
			const mutationId =
				typeof crypto !== "undefined" && "randomUUID" in crypto
					? crypto.randomUUID()
					: `telegram-send-${Date.now()}`;
			const response = await fetchWithHandling(
				`/api/telegram/outbox/${encodeURIComponent(itemId)}/send${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						dryRun: false,
						clientMutationId: mutationId,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Сообщение Telegram не отправлено",
					),
				);
			const result = (await response.json()) as DenteTelegramOutboxSendResponse;
			if (result.status === "blocked" || result.status === "failed") {
				const warning = result.warnings?.[0]
					? telegramHumanMessage(result.warnings?.[0])
					: "";
				const reason = telegramHumanMessage(result.blockedReason) || warning;
				setError(
					`Отправка Telegram заблокирована${reason ? `: ${reason}` : ""}`,
				);
				await loadTelegramControlPlane({ silent: true });
				return;
			}
			setError(null);
			await loadTelegramControlPlane({ silent: true });
			if (result.status === "sent") await loadDashboard();
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Сообщение Telegram не отправлено",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Сообщение Telegram не отправлено",
					telegramError,
				),
			);
		} finally {
			setTelegramSendingItemId(null);
		}
	}

	async function sendDueTelegramOutbox() {
		if (isTelegramSendingDue || telegramSendingItemId) {
			setError("Дождитесь завершения текущей отправки Telegram.");
			return;
		}
		if (!telegramOutbox?.dueCount) {
			setError("Telegram: готовых сообщений к отправке нет.");
			return;
		}
		setIsTelegramSendingDue(true);
		try {
			const response = await fetchWithHandling(
				`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ dryRun: false, limit: 25 }),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Готовые Telegram-сообщения не отправлены",
					),
				);
			const result =
				(await response.json()) as DenteTelegramOutboxSendDueResponse;
			await loadTelegramControlPlane({ silent: true });
			if (result.sentCount > 0) await loadDashboard();
			setError(
				result.sentCount > 0
					? `Telegram: отправлено ${result.sentCount}, проверено ${result.attemptedCount}.`
					: "Telegram: готовых сообщений к отправке нет.",
			);
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Готовые Telegram-сообщения не отправлены",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Готовые Telegram-сообщения не отправлены",
					telegramError,
				),
			);
		} finally {
			setIsTelegramSendingDue(false);
		}
	}

	return {
		loadMoreTelegramOutbox,
		sendTelegramOutboxItem,
		sendDueTelegramOutbox,
	};
}
