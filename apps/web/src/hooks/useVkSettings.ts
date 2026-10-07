import { useCallback, useEffect, useState } from "react";
import { showToast } from "../components/GlobalToast.js";
import { getDenteAuthHeaders } from "../lib/denteRequestHeaders.js";

export interface VkCommunitySettings {
	configured: boolean;
	groupId: string | null;
	tokenMasked: string | null;
	secretKey: string;
	confirmationCode: string;
	webhookUrl: string;
	isEnabled: boolean;
	isActive: boolean;
	updatedAt: string | null;
}

export interface VkPersonalAccount {
	id: string;
	vkUserId: string;
	firstName: string | null;
	lastName: string | null;
	screenName: string | null;
	photoUrl: string | null;
	status: string;
	isActive: boolean;
	lastSyncAt: string | null;
}

export interface VkGroupProfile {
	id: number;
	name: string;
	screen_name: string;
	photo_200?: string;
}

export function useVkSettings(serverBaseUrl?: string) {
	const baseUrl = serverBaseUrl ? serverBaseUrl.replace(/\/+$/, "") : "";

	const [community, setCommunity] = useState<VkCommunitySettings | null>(null);
	const [personalAccount, setPersonalAccount] = useState<VkPersonalAccount | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [verifying, setVerifying] = useState<boolean>(false);
	const [verifyResult, setVerifyResult] = useState<{
		ok: boolean;
		group?: VkGroupProfile;
		error?: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchAll = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers = getDenteAuthHeaders();

			// 1. Настройки сообщества
			const commRes = await fetch(`${baseUrl}/api/vk/bot/settings`, { headers });
			if (commRes.ok) {
				const commData = (await commRes.json()) as VkCommunitySettings;
				setCommunity(commData);
			}

			// 2. Личный аккаунт
			const accRes = await fetch(`${baseUrl}/api/vk/account/status`, { headers });
			if (accRes.ok) {
				const accData = (await accRes.json()) as { connected: boolean; account: VkPersonalAccount | null };
				setPersonalAccount(accData.connected ? accData.account : null);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Не удалось загрузить настройки ВКонтакте";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, [baseUrl]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const connectCommunity = useCallback(
		async (params: {
			groupId: string;
			groupToken: string;
			secretKey?: string | undefined;
			confirmationCode?: string | undefined;
			isEnabled?: boolean | undefined;
		}) => {
			setSaving(true);
			setError(null);
			setVerifyResult(null);
			try {
				const headers = getDenteAuthHeaders({ "content-type": "application/json" });
				const res = await fetch(`${baseUrl}/api/vk/bot/connect`, {
					method: "POST",
					headers,
					body: JSON.stringify(params),
				});

				const data = await res.json();
				if (!res.ok) {
					const msg = data.message || "Ошибка подключения сообщества ВКонтакте";
					setError(msg);
					showToast(msg, "error");
					return { ok: false, error: msg };
				}

				showToast("Сообщество ВКонтакте успешно подключено!", "success");
				setVerifyResult({ ok: true, group: data.group });
				await fetchAll();
				return { ok: true, group: data.group };
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Не удалось связаться с сервером";
				setError(msg);
				showToast(msg, "error");
				return { ok: false, error: msg };
			} finally {
				setSaving(false);
			}
		},
		[baseUrl, fetchAll],
	);

	const verifyCommunity = useCallback(
		async (params?: { groupId?: string | undefined; groupToken?: string | undefined } | undefined) => {
			setVerifying(true);
			setVerifyResult(null);
			try {
				const headers = getDenteAuthHeaders({ "content-type": "application/json" });
				const res = await fetch(`${baseUrl}/api/vk/bot/verify`, {
					method: "POST",
					headers,
					body: JSON.stringify(params || {}),
				});

				const data = await res.json();
				if (!res.ok) {
					const msg = data.message || "Ошибка проверки связи с ВКонтакте";
					setVerifyResult({ ok: false, error: msg });
					showToast(msg, "error");
					return { ok: false, error: msg };
				}

				setVerifyResult({ ok: true, group: data.group });
				showToast(`Связь с ВКонтакте проверена: «${data.group.name}»`, "success");
				return { ok: true, group: data.group };
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Ошибка сетевого запроса";
				setVerifyResult({ ok: false, error: msg });
				showToast(msg, "error");
				return { ok: false, error: msg };
			} finally {
				setVerifying(false);
			}
		},
		[baseUrl],
	);

	const disconnectCommunity = useCallback(async () => {
		setSaving(true);
		try {
			const headers = getDenteAuthHeaders({ "content-type": "application/json" });
			const res = await fetch(`${baseUrl}/api/vk/bot/disconnect`, {
				method: "POST",
				headers,
			});
			if (res.ok) {
				showToast("Сообщество ВКонтакте отключено", "info");
				await fetchAll();
				return true;
			}
		} catch {
			showToast("Не удалось отключить сообщество ВКонтакте", "error");
		} finally {
			setSaving(false);
		}
		return false;
	}, [baseUrl, fetchAll]);

	const connectPersonalAccount = useCallback(
		async (params: { accessToken: string; vkUserId?: string | undefined }) => {
			setSaving(true);
			setError(null);
			try {
				const headers = getDenteAuthHeaders({ "content-type": "application/json" });
				const res = await fetch(`${baseUrl}/api/vk/account/connect`, {
					method: "POST",
					headers,
					body: JSON.stringify(params),
				});

				const data = await res.json();
				if (!res.ok) {
					const msg = data.message || "Ошибка подключения страницы ВКонтакте";
					setError(msg);
					showToast(msg, "error");
					return { ok: false, error: msg };
				}

				showToast("Личная страница ВКонтакте подключена!", "success");
				await fetchAll();
				return { ok: true, profile: data.profile };
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Не удалось связаться с сервером";
				setError(msg);
				showToast(msg, "error");
				return { ok: false, error: msg };
			} finally {
				setSaving(false);
			}
		},
		[baseUrl, fetchAll],
	);

	const disconnectPersonalAccount = useCallback(async () => {
		setSaving(true);
		try {
			const headers = getDenteAuthHeaders({ "content-type": "application/json" });
			const res = await fetch(`${baseUrl}/api/vk/account/disconnect`, {
				method: "POST",
				headers,
			});
			if (res.ok) {
				showToast("Личная страница ВКонтакте отключена", "info");
				await fetchAll();
				return true;
			}
		} catch {
			showToast("Не удалось отключить страницу ВКонтакте", "error");
		} finally {
			setSaving(false);
		}
		return false;
	}, [baseUrl, fetchAll]);

	return {
		community,
		personalAccount,
		loading,
		saving,
		verifying,
		verifyResult,
		error,
		refresh: fetchAll,
		connectCommunity,
		verifyCommunity,
		disconnectCommunity,
		connectPersonalAccount,
		disconnectPersonalAccount,
	};
}
