import { type StaffRole } from "@dental/shared";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	inviteRoleTitle,
	parseInviteCreationPayload,
} from "../settingsInviteRoles";

export function useInviteStaffForm() {
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<StaffRole>("doctor");
	const [inviteLink, setInviteLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleGenerateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim()) {
			showToast(
				"Укажите рабочий адрес почты сотрудника — по нему он войдёт в программу",
				"warning",
			);
			return;
		}
		setLoading(true);
		setCopied(false);
		setInviteLink("");
		try {
			const staffToken = readDenteStaffToken();
			const response = await fetch("/api/auth/invites/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
			});
			const raw = await response.text();
			const outcome = parseInviteCreationPayload(response.status, raw);
			if (!outcome.ok) {
				logger.error("[приглашение] не создано, ответ", outcome.status);
				showToast(
					outcome.message ??
						actionFailureToast(
							`Приглашение для ${inviteEmail.trim()} не создано`,
							outcome.status,
						),
					"error",
				);
				return;
			}
			setInviteLink(window.location.origin + outcome.inviteLink);
			showToast(
				`Ссылка для ${inviteRoleTitle(inviteRole).toLowerCase()} готова — скопируйте её и передайте сотруднику, она действует 7 дней`,
				"success",
			);
		} catch (err) {
			logger.error("[приглашение] запрос не дошёл до сервера", err);
			showToast(
				actionFailureToast(
					`Приглашение для ${inviteEmail.trim()} не создано`,
					null,
				),
				"error",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		if (!inviteLink) return;
		navigator.clipboard.writeText(inviteLink);
		setCopied(true);
		showToast("Ссылка скопирована", "success");
		setTimeout(() => setCopied(false), 2000);
	};

	return {
		inviteEmail,
		setInviteEmail,
		inviteRole,
		setInviteRole,
		inviteLink,
		loading,
		copied,
		handleGenerateInvite,
		handleCopy,
	};
}
