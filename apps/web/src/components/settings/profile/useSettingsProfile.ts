import { useCallback, useEffect, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	type ProfileLoadState,
	parseProfilePayload,
	type StaffProfile,
} from "../settingsProfileLoad";

export function useSettingsProfile(initialProfile?: StaffProfile | null) {
	const [profile, setProfile] = useState<StaffProfile | null>(initialProfile ?? null);
	const [loadState, setLoadState] = useState<ProfileLoadState>({
		phase: profile ? "ready" : "loading",
	});

	const loadProfile = useCallback(async () => {
		const staffToken = readDenteStaffToken();
		if (!staffToken) {
			setLoadState({ phase: "noSession" });
			return;
		}
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			});
			const outcome = parseProfilePayload(res.status, await res.text());
			if (!outcome.ok) {
				logger.error("[мой профиль] не прочитан, ответ", outcome.status);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			setProfile(outcome.profile);
			setLoadState({ phase: "ready" });
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[мой профиль] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, []);

	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	return { profile, loadState, loadProfile };
}
