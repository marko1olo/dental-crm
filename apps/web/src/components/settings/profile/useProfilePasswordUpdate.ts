import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { parseStaffMutationPayload } from "../settingsInviteRoles";

export function useProfilePasswordUpdate() {
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showOldPw, setShowOldPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [showConfirmPw, setShowConfirmPw] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

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
					"x-dente-staff-token": readDenteStaffToken(),
				},
				body: JSON.stringify({ oldPassword, newPassword }),
			});
			const outcome = parseStaffMutationPayload(r.status, await r.text());
			if (!outcome.ok) {
				logger.error("[мой профиль] пароль не изменён, ответ", outcome.status);
				showToast(outcome.message ?? actionFailureToast("Пароль не изменён", outcome.status), "error");
				return;
			}
			showToast("Пароль изменён. На других устройствах входите уже новым.", "success");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			logger.error("[мой профиль] смена пароля не дошла до сервера", err);
			showToast(actionFailureToast("Пароль не изменён", null), "error");
		} finally {
			setPasswordLoading(false);
		}
	};

	return {
		oldPassword, setOldPassword,
		newPassword, setNewPassword,
		confirmPassword, setConfirmPassword,
		showOldPw, setShowOldPw,
		showNewPw, setShowNewPw,
		showConfirmPw, setShowConfirmPw,
		passwordLoading, handleUpdatePassword,
	};
}
