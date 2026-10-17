import type React from "react";

interface CredentialsFormProps {
	mode: "phone" | "pin" | "password";
	draftValue: string;
	onChangeDraft: (val: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	loading: boolean;
	fullName?: string;
}

export const StaffMemberCredentialsForm: React.FC<CredentialsFormProps> = ({
	mode,
	draftValue,
	onChangeDraft,
	onSubmit,
	onCancel,
	loading,
	fullName = "",
}) => {
	if (mode === "phone") {
		return (
			<form onSubmit={onSubmit} className="flex flex-wrap gap-2">
				<input
					type="tel"
					inputMode="tel"
					maxLength={80}
					placeholder="+7..."
					aria-label={`Телефон сотрудника ${fullName}`}
					value={draftValue}
					onChange={(e) => onChangeDraft(e.target.value)}
					className="min-w-[7rem] flex-1 h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
				/>
				<button
					type="submit"
					className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 cursor-pointer"
					disabled={loading}
				>
					ОК
				</button>
				<button
					type="button"
					className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
					onClick={onCancel}
				>
					Отмена
				</button>
			</form>
		);
	}

	return (
		<form onSubmit={onSubmit} className="flex gap-2">
			<input
				type="password"
				maxLength={mode === "pin" ? 4 : 50}
				placeholder={mode === "pin" ? "PIN" : "Пароль"}
				value={draftValue}
				onChange={(e) => onChangeDraft(e.target.value)}
				className={`${mode === "pin" ? "w-20 text-center" : "w-full"} h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]`}
			/>
			<button
				type="submit"
				className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 cursor-pointer"
				disabled={loading}
			>
				ОК
			</button>
			<button
				type="button"
				className="h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
				onClick={onCancel}
			>
				Отмена
			</button>
		</form>
	);
};
