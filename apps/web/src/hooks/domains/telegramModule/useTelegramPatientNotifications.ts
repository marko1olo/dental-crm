import type {
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramMessagePreview,
} from "@dental/shared";
import {
	operatorWorkflowFailureMessage,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { useSettingsStore } from "../../../store/settingsStore";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type {
	UseTelegramPatientNotificationsOptions,
	UseTelegramPatientNotificationsResult,
} from "./types";

export function useTelegramPatientNotifications({
	dashboard,
	activePatient,
	activeDoctor,
	activeAppointment,
	setError,
	telegramControlPlaneHeaders,
	loadTelegramControlPlane,
	parseTelegramLinkTtlMinutes,
	telegramLinkCodeLedgerRequestParams,
	telegramChatLinkLedgerRequestParams,
	telegramOutboxActionQueryString,
}: UseTelegramPatientNotificationsOptions): UseTelegramPatientNotificationsResult {
	const {
		setIsTelegramLoading,
		isTelegramLinkCreating,
		setIsTelegramLinkCreating,
		isTelegramLinkCodesLoadingMore,
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		setIsTelegramChatLinksLoadingMore,
	} = useAppStore();

	const {
		telegramBotConfigId,
		telegramModeDraft,
		telegramLinkCodeLedger,
		setTelegramLinkCodeLedger,
		telegramLinkCodes,
		setTelegramLinkCodes,
		telegramChatLinkLedger,
		setTelegramChatLinkLedger,
		telegramChatLinks,
		setTelegramChatLinks,
		telegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkActionState,
		telegramLinkCode,
		setTelegramLinkCode,
		telegramRevokingLinkId,
		setTelegramRevokingLinkId,
		setTelegramPreview,
		telegramAdminSecretSession,
		telegramAdminSecretDraft,
	} = useSettingsStore();

	const telegramLinkStaffOptions = dashboard?.clinicSettings?.staff ?? [];

	async function loadMoreTelegramLinkCodes() {
		if (!telegramLinkCodeLedger?.nextCursor || isTelegramLinkCodesLoadingMore)
			return;
		setIsTelegramLinkCodesLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const params = telegramLinkCodeLedgerRequestParams(
				telegramLinkCodeLedger.nextCursor,
			);
			const response = await fetchWithHandling(
				`/api/telegram/link-codes?${params.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(await responseErrorMessage(response, "Коды Telegram"));
			const nextPage =
				(await response.json()) as DenteTelegramLinkCodeListResponse;
			const knownIds = new Set(telegramLinkCodes.map((code) => code.id));
			const linkCodes = [
				...telegramLinkCodes,
				...nextPage.linkCodes.filter((code) => !knownIds.has(code.id)),
			];
			setTelegramLinkCodes(linkCodes);
			setTelegramLinkCodeLedger({ ...nextPage, linkCodes });
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Коды Telegram не загрузились",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Коды Telegram не загрузились",
					telegramError,
				),
			);
		} finally {
			setIsTelegramLinkCodesLoadingMore(false);
		}
	}

	async function loadMoreTelegramChatLinks() {
		if (!telegramChatLinkLedger?.nextCursor || isTelegramChatLinksLoadingMore)
			return;
		setIsTelegramChatLinksLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const params = telegramChatLinkLedgerRequestParams(
				telegramChatLinkLedger.nextCursor,
			);
			const response = await fetchWithHandling(
				`/api/telegram/chat-links?${params.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Связанные Telegram-чаты"),
				);
			const nextPage =
				(await response.json()) as DenteTelegramChatLinkListResponse;
			const knownIds = new Set(telegramChatLinks.map((link) => link.id));
			const chatLinks = [
				...telegramChatLinks,
				...nextPage.chatLinks.filter((link) => !knownIds.has(link.id)),
			];
			setTelegramChatLinks(chatLinks);
			setTelegramChatLinkLedger({ ...nextPage, chatLinks });
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Связанные Telegram-чаты не загрузились",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Связанные Telegram-чаты не загрузились",
					telegramError,
				),
			);
		} finally {
			setIsTelegramChatLinksLoadingMore(false);
		}
	}

	async function createTelegramLinkCode() {
		if (isTelegramLinkCreating) {
			setError("Дождитесь завершения текущего создания Telegram-кода.");
			return;
		}
		if (!dashboard) {
			setError(
				"Данные клиники еще не загружены. Повторите создание Telegram-кода после загрузки рабочего экрана.",
			);
			return;
		}
		const subjectId =
			telegramLinkSubjectType === "patient"
				? activePatient?.id
				: telegramLinkStaffId;
		if (!subjectId) {
			setError(
				telegramLinkSubjectType === "patient"
					? "Выберите активного пациента для Telegram-кода."
					: "Выберите сотрудника для Telegram-кода.",
			);
			return;
		}
		setIsTelegramLinkCreating(true);
		setTelegramLinkActionState(null);
		try {
			const response = await fetchWithHandling("/api/telegram/link-codes", {
				method: "POST",
				headers: telegramControlPlaneHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					organizationId: dashboard?.clinicSettings?.profile?.organizationId,
					subjectType: telegramLinkSubjectType,
					subjectId,
					clinicId: dashboard?.clinicSettings?.profile?.organizationId,
					botConfigId:
						telegramModeDraft === "clinic_owned_bot"
							? telegramBotConfigId.trim() || undefined
							: undefined,
					ttlMinutes: parseTelegramLinkTtlMinutes(),
					createdByUserId: activeDoctor?.id ?? null,
				}),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Telegram-код не создан"),
				);
			setTelegramLinkCode(
				(await response.json()) as DenteTelegramLinkCodeCreated,
			);
			await loadTelegramControlPlane({ silent: true });
			setError(null);
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Telegram-код не создан",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Telegram-код не создан", telegramError),
			);
		} finally {
			setIsTelegramLinkCreating(false);
		}
	}

	async function copyTelegramTextToClipboard(
		value: string | null | undefined,
		label: string,
	) {
		const text = value?.trim();
		if (!text) {
			const message = `${label} пустой. Сначала создайте новый Telegram-код или проверьте настройки бота.`;
			setTelegramLinkActionState(message);
			setError(message);
			return;
		}
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "true");
				area.style.position = "fixed";
				area.style.left = "-9999px";
				document.body.appendChild(area);
				area.select();
				document.execCommand("copy");
				document.body.removeChild(area);
			}
			setTelegramLinkActionState(`${label} скопирован`);
			setError(null);
		} catch {
			showToast(
				actionFailureToast("Операция завершилась ошибкой", null),
				"error",
			);
			setTelegramLinkActionState(null);
			setError(
				`${label} не скопирован. Откройте ссылку или выделите код вручную.`,
			);
		}
	}

	function downloadTelegramQrSvg() {
		if (!telegramLinkCode?.qrSvg) {
			const message =
				"QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.";
			setTelegramLinkActionState(message);
			setError(message);
			return;
		}
		const blob = new Blob([telegramLinkCode.qrSvg], {
			type: "image/svg+xml;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `dente-telegram-qr-${telegramLinkCode.codeLast4}.svg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setTelegramLinkActionState("QR-код скачан");
		setError(null);
	}

	async function revokeTelegramChatLink(linkId: string) {
		if (telegramRevokingLinkId) {
			setError("Дождитесь завершения текущего отзыва Telegram-связки.");
			return;
		}
		setTelegramRevokingLinkId(linkId);
		try {
			const response = await fetchWithHandling(
				`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders(),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Связка Telegram не отозвана"),
				);
			await loadTelegramControlPlane({ silent: true });
			setError(null);
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Связка Telegram не отозвана",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Связка Telegram не отозвана",
					telegramError,
				),
			);
		} finally {
			setTelegramRevokingLinkId(null);
		}
	}

	async function previewTelegramTemplate(
		templateKind: DenteTelegramMessagePreview["templateKind"],
	) {
		const isStaffPreview = templateKind === "staff_daily_digest";
		const staffId =
			telegramLinkStaffId || telegramLinkStaffOptions[0]?.id || "";
		if (!isStaffPreview && !activePatient) {
			setError(
				"Выберите активного пациента перед предпросмотром Telegram-сообщения.",
			);
			return;
		}
		if (isStaffPreview && !staffId) {
			setError("Выберите сотрудника перед предпросмотром Telegram-дайджеста.");
			return;
		}
		setIsTelegramLoading(true);
		try {
			const response = await fetchWithHandling(
				`/api/telegram/messages/preview${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						templateKind,
						patientId: isStaffPreview ? undefined : activePatient?.id,
						staffId: isStaffPreview ? staffId : undefined,
						appointmentId: isStaffPreview ? undefined : activeAppointment?.id,
						includePhi: false,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Предпросмотр Telegram не создан",
					),
				);
			setTelegramPreview(
				(await response.json()) as DenteTelegramMessagePreview,
			);
			setError(null);
		} catch (telegramError) {
			showToast(
				actionFailureToast(
					"Предпросмотр Telegram не создан",
					(telegramError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Предпросмотр Telegram не создан",
					telegramError,
				),
			);
		} finally {
			setIsTelegramLoading(false);
		}
	}

	return {
		createTelegramLinkCode,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		revokeTelegramChatLink,
		previewTelegramTemplate,
		loadMoreTelegramLinkCodes,
		loadMoreTelegramChatLinks,
	};
}
