import { evaluatePasswordEntropy, type StaffProfileExtended } from "@dental/shared";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";

interface Props {
	staffMember: StaffProfileExtended;
	onSaved?: (() => void) | undefined;
}

export const StaffSecurityPasswordSection: React.FC<Props> = ({ staffMember, onSaved }) => {
	const [passwordDraft, setPasswordDraft] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const entropy = useMemo(() => evaluatePasswordEntropy(passwordDraft), [passwordDraft]);

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!passwordDraft) {
			showToast("Введите новый пароль", "warning");
			return;
		}
		setIsSaving(true);
		try {
			const res = await fetch(`/api/settings/staff/${staffMember.id}/credentials`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ password: passwordDraft }),
			});
			if (!res.ok) {
				showToast("Не удалось обновить пароль", "error");
				return;
			}
			setPasswordDraft("");
			showToast("Пароль успешно обновлён", "success");
			onSaved?.();
		} catch {
			showToast("Ошибка соединения с сервером", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--paper)] space-y-3">
			<div className="flex items-center gap-2">
				<Lock size={16} className="text-[var(--teal)]" />
				<h5 className="m-0 text-sm font-semibold text-[var(--ink)]">Пароль для входа</h5>
			</div>
			<form onSubmit={handleUpdatePassword} className="space-y-2">
				<div className="relative">
					<input
						type={showPassword ? "text" : "password"}
						placeholder="Новый надёжный пароль"
						value={passwordDraft}
						onChange={(e) => setPasswordDraft(e.target.value)}
						className="w-full h-9 px-3 pr-10 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-2.5 top-2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				</div>
				{passwordDraft && (
					<div className="text-[11px] text-[var(--muted)] flex items-center justify-between">
						<span>Надёжность: {entropy.scorePercent >= 60 ? "Высокая" : "Средняя / Слабая"} ({entropy.labelRu})</span>
						<span>{entropy.effectiveEntropyBits} бит</span>
					</div>
				)}
				<button
					type="submit"
					disabled={isSaving || !passwordDraft}
					className="h-9 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
				>
					<ShieldCheck size={14} />
					<span>{isSaving ? "Сохранение..." : "Сменить пароль"}</span>
				</button>
			</form>
		</div>
	);
};
