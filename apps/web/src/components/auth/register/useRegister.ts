import { useState } from "react";
import { DEMO_SHOWCASE_ORG_ID, enableDemoShowcaseMode } from "../../../lib/demoMode";
import { cacheActiveStaffUser, cacheClinicDashboard, createOfflineFallbackDashboard } from "../../../lib/offlineStorage";
import { DENTE_CLINIC_TOKEN_KEY, DENTE_STAFF_TOKEN_KEY, safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { useOnboardingStore } from "../../../store/onboardingStore";
import { showToast } from "../../GlobalToast";
import { normalizeContactInput, type PracticeScale, type RegisterProps } from "./registerHelpers";

export function useRegister(onSuccess: RegisterProps["onSuccess"]) {
	const [scale, setScale] = useState<PracticeScale>("solo");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [seedDemoData, setSeedDemoData] = useState(true);
	const [loading, setLoading] = useState(false);

	const applyLocalFallback = (clinicTitle: string, ownerTitle: string, loginIdentifier: string) => {
		enableDemoShowcaseMode();
		const localOrgId = `org-custom-${Date.now()}`;
		const localClinic = { organizationId: localOrgId, name: clinicTitle, scale, hasDemoData: seedDemoData };
		const localUser = { id: `user-${Date.now()}`, fullName: ownerTitle, role: "owner", email: loginIdentifier, organizationId: localOrgId };
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, `local-token-${localOrgId}`);
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, `local-staff-token-${localUser.id}`);
		cacheActiveStaffUser(localUser);
		const mode = scale === "solo" ? "solo_doctor" : "small_clinic";
		useOnboardingStore.getState().setOperationalMode(mode);
		useOnboardingStore.getState().updateProfile({ clinicName: clinicTitle, mode });
		cacheClinicDashboard(createOfflineFallbackDashboard({ id: localOrgId, name: clinicTitle, mode, scale, hasDemoData: seedDemoData }));
		showToast(`Кабинет «${clinicTitle}» готов к работе! ${seedDemoData ? "Демо-данные загружены." : ""}`, "success");
		onSuccess(localClinic, localUser);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		const { loginIdentifier, normalizedPhone } = normalizeContactInput(email);
		const clinicTitle = trimmedName ? (scale === "solo" ? `Кабинет д-ра ${trimmedName}` : trimmedName) : "Стоматологический кабинет";
		const ownerTitle = trimmedName ? (scale === "solo" ? trimmedName : `Главврач (${trimmedName})`) : (scale === "solo" ? "Доктор" : "Главврач");

		if (!loginIdentifier) { showToast("Пожалуйста, укажите email или телефон для входа", "warning"); return; }
		if (!password || password.length < 6) { showToast("Пароль должен быть не короче 6 символов", "warning"); return; }

		setLoading(true);
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clinicName: clinicTitle, ownerName: ownerTitle, email: loginIdentifier, phone: normalizedPhone, password, practiceType: scale, withDemoData: seedDemoData }),
			});
			if (res.ok) {
				const data = await res.json();
				safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
				safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
				const userProfile = { id: data.userId || "owner-user-id", fullName: ownerTitle, role: "owner", email: loginIdentifier, organizationId: data.organizationId };
				cacheActiveStaffUser(userProfile);
				const mode = scale === "solo" ? "solo_doctor" : "small_clinic";
				useOnboardingStore.getState().setOperationalMode(mode);
				useOnboardingStore.getState().updateProfile({ clinicName: clinicTitle, mode });
				showToast("Кабинет успешно создан! Добро пожаловать.", "success");
				onSuccess({ organizationId: data.organizationId, name: clinicTitle }, userProfile);
				return;
			}
			applyLocalFallback(clinicTitle, ownerTitle, loginIdentifier);
		} catch {
			applyLocalFallback(clinicTitle, ownerTitle, loginIdentifier);
		} finally {
			setLoading(false);
		}
	};

	return {
		scale, setScale, name, setName, email, setEmail, password, setPassword,
		showPassword, setShowPassword, seedDemoData, setSeedDemoData, loading, handleSubmit,
	};
}
