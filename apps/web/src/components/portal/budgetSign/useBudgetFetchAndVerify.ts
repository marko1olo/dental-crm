import { useEffect, useState, useCallback } from "react";
import type { BudgetPortalData } from "./budgetSignTypes";

export function useBudgetFetchAndVerify(propToken: string | undefined, apiBaseUrl: string) {
	const [activeToken] = useState<string>(() => {
		if (propToken) return propToken;
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			const qToken = searchParams.get("token") || searchParams.get("t");
			if (qToken) return qToken;
			const match = window.location.pathname.match(/\/budget\/([a-zA-Z0-9_-]+)/);
			if (match && match[1]) return match[1];
			const hashMatch = window.location.hash.match(/\/budget\/([a-zA-Z0-9_-]+)/);
			if (hashMatch && hashMatch[1]) return hashMatch[1];
		}
		return "";
	});

	const [budget, setBudget] = useState<BudgetPortalData | null>(null);
	const [sessionToken, setSessionToken] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const [verifyFactor, setVerifyFactor] = useState<string>("");
	const [isVerifying, setIsVerifying] = useState<boolean>(false);
	const [verifyError, setVerifyError] = useState<string | null>(null);

	const fetchBudget = useCallback(
		async (tok: string, sToken?: string) => {
			if (!tok) {
				setIsLoading(false);
				setFetchError("Токен сметы не указан или недействителен.");
				return;
			}
			try {
				setIsLoading(true);
				setFetchError(null);
				const headers: Record<string, string> = {};
				const currentSession = sToken || sessionToken;
				if (currentSession) headers["Authorization"] = `Bearer ${currentSession}`;
				const res = await fetch(`${apiBaseUrl}/api/portal/budget/${tok}`, { method: "GET", headers });
				if (!res.ok) {
					if (res.status === 404) setFetchError("Смета не найдена или срок её действия истёк.");
					else {
						const errJson = await res.json().catch(() => ({}));
						setFetchError(errJson.message || "Ошибка при загрузке сметы.");
					}
					return;
				}
				const data: BudgetPortalData = await res.json();
				setBudget(data);
				if (data.status === "pending") {
					fetch(`${apiBaseUrl}/api/portal/budget/${tok}/view`, { method: "POST" }).catch(() => {});
				}
			} catch {
				setFetchError("Не удалось соединиться с сервером. Проверьте подключение.");
			} finally {
				setIsLoading(false);
			}
		},
		[apiBaseUrl, sessionToken],
	);

	useEffect(() => {
		if (activeToken) fetchBudget(activeToken);
		else setIsLoading(false);
	}, [activeToken, fetchBudget]);

	const handleVerifySubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!activeToken) return;
		if (!verifyFactor.trim()) {
			setVerifyError(budget?.authMethod === "phone_last4" ? "Введите последние 4 цифры телефона." : "Укажите дату рождения (ДД.ММ.ГГГГ).");
			return;
		}
		setIsVerifying(true);
		setVerifyError(null);
		try {
			const res = await fetch(`${apiBaseUrl}/api/portal/budget/${activeToken}/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ method: budget?.authMethod || "phone_last4", value: verifyFactor.trim(), phone_last4: verifyFactor.trim() }),
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				setVerifyError(data.message || "Неверный код подтверждения.");
				return;
			}
			if (data.sessionToken) {
				setSessionToken(data.sessionToken);
				await fetchBudget(activeToken, data.sessionToken);
			} else {
				await fetchBudget(activeToken);
			}
		} catch {
			setVerifyError("Ошибка сети при проверке кода.");
		} finally {
			setIsVerifying(false);
		}
	};

	return {
		activeToken, budget, setBudget, sessionToken, isLoading, fetchError,
		verifyFactor, setVerifyFactor, isVerifying, verifyError, handleVerifySubmit,
	};
}
