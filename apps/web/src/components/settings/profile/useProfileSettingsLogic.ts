import { useState, useEffect } from "react";
import { showToast } from "../../GlobalToast";

export interface UserProfile {
	id: string;
	fullName: string;
	role: string;
	email?: string | null;
	organizationId?: string;
}

export function useProfileSettingsLogic(initialProfile: UserProfile | null) {
	const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
	const [profileLoading, setProfileLoading] = useState(!profile);

	// Fetch fresh profile from server on mount
	useEffect(() => {
		const staffToken = localStorage.getItem("dente_staff_token");
		if (!staffToken) return;
		setProfileLoading(true);
		fetch("/api/auth/user/me", {
			headers: { "x-dente-staff-token": staffToken },
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.user) setProfile(data.user);
			})
			.catch(() => {})
			.finally(() => setProfileLoading(false));
	}, []);

	// Password change
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showOldPw, setShowOldPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// PIN change
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinLoading, setPinLoading] = useState(false);

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!oldPassword || !newPassword || !confirmPassword) {
			showToast("Заполните все поля", "warning");
			return;
		}
		if (newPassword !== confirmPassword) {
			showToast("Новые пароли не совпадают", "error");
			return;
		}
		if (newPassword.length < 8) {
			showToast("Пароль должен быть не менее 8 символов", "warning");
			return;
		}

		setPasswordLoading(true);
		try {
			const r = await fetch("/api/auth/user/update-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
				},
				body: JSON.stringify({ oldPassword, newPassword }),
			});
			const data = await r.json();
			if (!r.ok) throw new Error(data.message || "Ошибка смены пароля");
			showToast("Пароль успешно изменён", "success");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setPasswordLoading(false);
		}
	};

	const handleUpdatePin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!oldPin || !newPin || !confirmPin) {
			showToast("Заполните все поля PIN-кода", "warning");
			return;
		}
		if (newPin !== confirmPin) {
			showToast("PIN-коды не совпадают", "error");
			return;
		}
		if (!/^\d{4}$/.test(newPin)) {
			showToast("PIN-код — 4 цифры", "warning");
			return;
		}

		setPinLoading(true);
		try {
			const r = await fetch("/api/auth/user/update-pin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": localStorage.getItem("dente_staff_token") || "",
				},
				body: JSON.stringify({ oldPin, newPin }),
			});
			const data = await r.json();
			if (!r.ok) throw new Error(data.message || "Ошибка смены PIN");
			showToast("PIN-код успешно изменён", "success");
			setOldPin("");
			setNewPin("");
			setConfirmPin("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setPinLoading(false);
		}
	};

	return {
		profile,
		profileLoading,
		// Password
		oldPassword,
		setOldPassword,
		newPassword,
		setNewPassword,
		confirmPassword,
		setConfirmPassword,
		showOldPw,
		setShowOldPw,
		showNewPw,
		setShowNewPw,
		passwordLoading,
		handleUpdatePassword,
		// Pin
		oldPin,
		setOldPin,
		newPin,
		setNewPin,
		confirmPin,
		setConfirmPin,
		pinLoading,
		handleUpdatePin,
	};
}

export function getPasswordStrength(pw: string): { score: number; label: string } {
	let score = 0;
	if (pw.length >= 8) score++;
	if (pw.length >= 12) score++;
	if (/[A-Z]/.test(pw)) score++;
	if (/[0-9]/.test(pw)) score++;
	if (/[^A-Za-z0-9]/.test(pw)) score++;
	if (score <= 1) return { score: 1, label: "Слабый" };
	if (score <= 3) return { score: 2, label: "Средний" };
	return { score: 3, label: "Надёжный" };
}
