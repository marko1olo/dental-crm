import { useEffect, useMemo, useState } from "react";
import { DEMO_SHOWCASE_ORG_ID, enableDemoShowcaseMode, isDemoShowcaseMode } from "../../../lib/demoMode";
import { cacheActiveStaffUser } from "../../../lib/offlineStorage";
import { DENTE_CLINIC_TOKEN_KEY, DENTE_STAFF_TOKEN_KEY, safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";
import { detectIdentityType, getLiveTimeOfDayGreeting, getQuickResumeData, type IdentityType, type QuickResumeData } from "../authSmartIdentity";
import type { UserLoginProps } from "./userLoginTypes";

export function useUserLogin(onSuccess: UserLoginProps["onSuccess"]) {
	const [identity, setIdentity] = useState(() => (isDemoShowcaseMode() ? "doctor@clinic.com" : ""));
	const [password, setPassword] = useState(() => (isDemoShowcaseMode() ? "dente2026" : ""));
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
	const [quickResume, setQuickResume] = useState<QuickResumeData>(() => getQuickResumeData());

	const detectedType: IdentityType = useMemo(() => detectIdentityType(identity), [identity]);
	const { greeting } = useMemo(() => getLiveTimeOfDayGreeting(), []);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	useEffect(() => { setQuickResume(getQuickResumeData()); }, []);

	const handleQuickResumeLogin = () => {
		if (!quickResume.rawUser) return;
		enableDemoShowcaseMode();
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "dente-resumed-clinic-token");
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "dente-resumed-staff-token");
		showToast(`Сессия возобновлена: ${quickResume.fullName}`, "success");
		onSuccess({ organizationId: DEMO_SHOWCASE_ORG_ID, name: quickResume.clinicName || "DENTE Clinic" }, quickResume.rawUser);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedIdentity = identity.trim();
		if (!trimmedIdentity || !password) { showToast("Введите Email, телефон или ID клиники и пароль", "warning"); return; }
		if (password.length < 6) { showToast("Пароль должен содержать не менее 6 символов", "warning"); return; }

		setLoading(true);
		try {
			if (detectedType === "clinic_id") {
				const response = await fetch("/api/auth/clinic/login", {
					method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmedIdentity, password }),
				});
				const data = await response.json();
				if (response.ok) {
					safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
					showToast("Вход в рабочее пространство клиники выполнен", "success");
					onSuccess(data.clinicProfile, null);
					return;
				}
				throw new Error(data.message || "Ошибка входа клиники");
			}

			const staffRes = await fetch("/api/auth/login", {
				method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmedIdentity, password }),
			});
			if (!staffRes.ok) {
				const clinicRes = await fetch("/api/auth/clinic/login", {
					method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmedIdentity, password }),
				});
				if (clinicRes.ok) {
					const data = await clinicRes.json();
					safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
					showToast("Вход в кабинет клиники выполнен", "success");
					onSuccess(data.clinicProfile, null);
					return;
				}
				const errData = await staffRes.json().catch(() => ({}));
				throw new Error(errData.message || "Неверный логин или пароль");
			}

			const data = await staffRes.json();
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
			cacheActiveStaffUser(data.user);
			showToast(`Добро пожаловать, ${data.user?.fullName || "доктор"}!`, "success");
			onSuccess({ organizationId: data.user?.organizationId ?? data.organizationId }, data.user);
		} catch (err: unknown) {
			const errMsg = (err as Error)?.message || "";
			if (!navigator.onLine || errMsg.includes("Failed to fetch")) {
				showToast("Сервер офлайн. Для работы без сети активируйте Демо-тур.", "warning");
			} else {
				showToast(errMsg || "Ошибка авторизации", "error");
			}
		} finally {
			setLoading(false);
		}
	};

	return {
		identity, setIdentity, password, setPassword, showPassword, setShowPassword,
		loading, isOnline, greeting, quickResume, detectedType, handleSubmit, handleQuickResumeLogin,
	};
}
