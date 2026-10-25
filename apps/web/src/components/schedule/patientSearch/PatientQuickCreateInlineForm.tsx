import React from "react";
import { CalendarPlus, UserPlus } from "lucide-react";

interface Props {
	quickFullName: string;
	setQuickFullName: (v: string) => void;
	quickPhone: string;
	setQuickPhone: (v: string) => void;
	quickNameRef: React.RefObject<HTMLInputElement | null>;
	onCancel: () => void;
	onSubmit: (e?: React.FormEvent) => void;
}

export const PatientQuickCreateInlineForm: React.FC<Props> = ({
	quickFullName,
	setQuickFullName,
	quickPhone,
	setQuickPhone,
	quickNameRef,
	onCancel,
	onSubmit,
}) => {
	return (
		<form
			onSubmit={onSubmit}
			className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-200/60 dark:border-teal-800/60 space-y-3 animate-in fade-in duration-150"
			data-testid="quick-patient-inline-form"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs font-bold text-teal-950 dark:text-teal-200">
					<UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Быстрое создание пациента: ФИО и телефон</span>
				</div>
				<button
					type="button"
					data-testid="quick-patient-cancel-btn"
					onClick={onCancel}
					className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
				>
					Свернуть
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div>
					<label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
						ФИО пациента <span className="text-rose-500">*</span>
					</label>
					<input
						ref={quickNameRef as React.RefObject<HTMLInputElement>}
						type="text"
						data-testid="quick-patient-fullname-input"
						value={quickFullName}
						onChange={(e) => setQuickFullName(e.target.value)}
						placeholder="Фамилия Имя Отчество"
						className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500"
						autoFocus
					/>
				</div>
				<div>
					<label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
						Телефон <span className="text-rose-500">*</span>
					</label>
					<input
						type="tel"
						data-testid="quick-patient-phone-input"
						value={quickPhone}
						onChange={(e) => setQuickPhone(e.target.value)}
						placeholder="+7 (___) ___-__-__"
						className="w-full h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
					/>
				</div>
			</div>
			<div className="flex items-center justify-end gap-2 pt-1">
				<button
					type="button"
					data-testid="quick-patient-cancel-action-btn"
					onClick={onCancel}
					className="h-9 px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--paper-soft)] rounded-xl transition-colors cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="submit"
					data-testid="quick-patient-submit-btn"
					className="h-9 px-4 text-xs font-bold rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
				>
					<CalendarPlus className="w-4 h-4" />
					<span>+ Создать и записать на приём</span>
				</button>
			</div>
		</form>
	);
};
