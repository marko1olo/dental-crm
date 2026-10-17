import type { StaffProfileExtended } from "@dental/shared";
import { KeyRound, Smartphone } from "lucide-react";
import React, { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";

interface Props {
	staffMember: StaffProfileExtended;
	onSaved?: (() => void) | undefined;
}

export const StaffSecurityPinSection: React.FC<Props> = ({ staffMember, onSaved }) => {
	const [pinDraft, setPinDraft] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const handleUpdatePin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (pinDraft.length !== 4) {
			showToast("PIN-код должен содержать 4 цифры", "warning");
			return;
		}
		setIsSaving(true);
		try {
			const res = await fetch(`/api/settings/staff/${staffMember.id}/credentials`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ pinCode: pinDraft }),
			});
			if (!res.ok) {
				showToast("Не удалось обновить PIN-код", "error");
				return;
			}
			setPinDraft("");
			showToast("PIN-код для планшета обновлён", "success");
			onSaved?.();
		} catch {
			showToast("Ошибка связи с сервером", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--paper)] space-y-3">
			<div className="flex items-center gap-2">
				<Smartphone size={16} className="text-[var(--teal)]" />
				<h5 className="m-0 text-sm font-semibold text-[var(--ink)]">PIN-код для планшета у кресла</h5>
			</div>
			<p className="text-xs text-[var(--muted)] m-0">
				4-значный код для мгновенной авторизации врача и ассистента в планшетном интерфейсе.
			</p>
			<form onSubmit={handleUpdatePin} className="flex gap-2 items-center">
				<input
					type="password"
					maxLength={4}
					placeholder="••••"
					value={pinDraft}
					onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ""))}
					className="w-24 text-center tracking-widest h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
				/>
				<button
					type="submit"
					disabled={isSaving || pinDraft.length !== 4}
					className="h-9 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
				>
					<KeyRound size={14} />
					<span>{isSaving ? "Сохранение..." : "Установить PIN"}</span>
				</button>
			</form>
		</div>
	);
};
