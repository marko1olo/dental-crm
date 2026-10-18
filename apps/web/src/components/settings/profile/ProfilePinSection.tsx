import { ShieldCheck } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { parseStaffMutationPayload } from "../settingsInviteRoles";

export const ProfilePinSection: React.FC = () => {
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinLoading, setPinLoading] = useState(false);

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
					"x-dente-staff-token": readDenteStaffToken(),
				},
				body: JSON.stringify({ oldPin, newPin }),
			});
			const outcome = parseStaffMutationPayload(r.status, await r.text());
			if (!outcome.ok) {
				logger.error("[мой профиль] PIN не изменён, ответ", outcome.status);
				showToast(outcome.message ?? actionFailureToast("PIN-код не изменён", outcome.status), "error");
				return;
			}
			showToast("PIN-код изменён. На планшете клиники входите уже новым.", "success");
			setOldPin("");
			setNewPin("");
			setConfirmPin("");
		} catch (err) {
			logger.error("[мой профиль] смена PIN не дошла до сервера", err);
			showToast(actionFailureToast("PIN-код не изменён", null), "error");
		} finally {
			setPinLoading(false);
		}
	};

	return (
		<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
			<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
				<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
					<ShieldCheck size={18} aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">Защитный PIN-код</h3>
					<p className="text-xs text-[var(--muted)] m-0">Для быстрого разблокирования экрана при отсутствии на рабочем месте</p>
				</div>
			</div>

			<form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpdatePin}>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Новый PIN (4 цифры)</label>
					<input
						type="password"
						value={newPin}
						onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
						placeholder="••••"
						maxLength={4}
						disabled={pinLoading}
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-center text-lg font-bold tracking-[8px] focus:outline-none focus:border-[var(--teal)] transition-all"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Подтвердите PIN</label>
					<input
						type="password"
						value={confirmPin}
						onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
						placeholder="••••"
						maxLength={4}
						disabled={pinLoading}
						className={`w-full px-3.5 py-2.5 rounded-xl border bg-[var(--paper)] text-[var(--ink)] text-center text-lg font-bold tracking-[8px] focus:outline-none transition-all ${
							confirmPin && newPin !== confirmPin ? "border-red-500 text-red-500" : "border-[var(--line)] focus:border-[var(--teal)]"
						}`}
					/>
					{confirmPin && newPin !== confirmPin && (
						<span className="text-[11px] text-red-500 font-medium">PIN-коды не совпадают</span>
					)}
				</div>
				<div className="md:col-span-2 pt-2">
					<button type="submit" disabled={pinLoading} className="px-4 py-2.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50">
						<ShieldCheck size={16} />
						{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
					</button>
				</div>
			</form>
		</section>
	);
};
