import { Eye, EyeOff, KeyRound } from "lucide-react";
import type React from "react";
import { useProfilePasswordUpdate } from "./useProfilePasswordUpdate";

export const ProfilePasswordSection: React.FC = () => {
	const {
		oldPassword, setOldPassword,
		newPassword, setNewPassword,
		confirmPassword, setConfirmPassword,
		showOldPw, setShowOldPw,
		showNewPw, setShowNewPw,
		showConfirmPw, setShowConfirmPw,
		passwordLoading, handleUpdatePassword,
	} = useProfilePasswordUpdate();

	return (
		<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
			<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
				<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
					<KeyRound size={18} aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">Смена пароля</h3>
					<p className="text-xs text-[var(--muted)] m-0">Пароль используется для входа в систему с личных устройств по email</p>
				</div>
			</div>

			<form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="flex flex-col gap-1.5 md:col-span-2">
					<label className="text-xs font-semibold text-[var(--muted)]">Текущий пароль</label>
					<div className="relative">
						<input
							type={showOldPw ? "text" : "password"}
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							placeholder="••••••••"
							disabled={passwordLoading}
							className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] transition-all"
						/>
						<button type="button" onClick={() => setShowOldPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
							{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Новый пароль</label>
					<div className="relative">
						<input
							type={showNewPw ? "text" : "password"}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Мин. 8 символов"
							disabled={passwordLoading}
							className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] transition-all"
						/>
						<button type="button" onClick={() => setShowNewPw((v) => !v)} aria-label={showNewPw ? "Скрыть" : "Показать"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
							{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">Подтвердите пароль</label>
					<div className="relative">
						<input
							type={showConfirmPw ? "text" : "password"}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Повторите новый пароль"
							disabled={passwordLoading}
							className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] transition-all"
						/>
						<button type="button" onClick={() => setShowConfirmPw((v) => !v)} aria-label={showConfirmPw ? "Скрыть" : "Показать"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
							{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>
				</div>
				<div className="md:col-span-2 pt-2">
					<button type="submit" disabled={passwordLoading} className="px-4 py-2.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50">
						<KeyRound size={16} />
						{passwordLoading ? "Сохранение..." : "Обновить пароль"}
					</button>
				</div>
			</form>
		</section>
	);
};
