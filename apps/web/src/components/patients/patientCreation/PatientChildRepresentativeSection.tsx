import { Users } from "lucide-react";
import React from "react";
import { CHILD_REPRESENTATIVE_ROLES } from "./constants";

export interface PatientChildRepresentativeSectionProps {
	readonly parentRole: string;
	readonly onParentRoleChange: (role: string) => void;
	readonly parentName: string;
	readonly onParentNameChange: (name: string) => void;
	readonly parentPhone: string;
	readonly onParentPhoneChange: (phone: string) => void;
	readonly onCopyChildPhone: () => void;
	readonly hasEffectivePhone: boolean;
}

export function PatientChildRepresentativeSection({
	parentRole,
	onParentRoleChange,
	parentName,
	onParentNameChange,
	parentPhone,
	onParentPhoneChange,
	onCopyChildPhone,
	hasEffectivePhone,
}: PatientChildRepresentativeSectionProps) {
	return (
		<div
			className="p-3 rounded-xl border border-teal-500/40 bg-teal-500/10 space-y-2.5 mt-2 animate-in fade-in duration-200"
			data-testid="create-patient-child-rep-section"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
					<Users size={14} className="text-[var(--teal)] shrink-0" />
					<span>Привязка родителя / опекуна</span>
				</div>
				<span className="text-[11px] text-[var(--muted)]">Быстрое оформление • Для записи и звонков</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{CHILD_REPRESENTATIVE_ROLES.map((item) => (
					<button
						key={item.role}
						type="button"
						data-testid={item.testId}
						onClick={() => onParentRoleChange(item.role)}
						className={`min-h-[30px] px-2.5 py-1 text-xs rounded-lg font-bold border transition cursor-pointer ${
							parentRole === item.role
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						{item.label}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div className="create-patient-form-field">
					<label htmlFor="patient-create-parent-name" className="create-patient-label text-xs">
						Имя родителя
					</label>
					<input
						id="patient-create-parent-name"
						type="text"
						placeholder="Например: Анна Смирнова"
						value={parentName}
						onChange={(e) => onParentNameChange(e.target.value)}
						className="create-patient-input text-xs"
						data-testid="input-child-parent-name"
					/>
				</div>

				<div className="create-patient-form-field">
					<div className="flex items-center justify-between">
						<label htmlFor="patient-create-parent-phone" className="create-patient-label text-xs">
							Телефон родителя
						</label>
						{hasEffectivePhone && (
							<button
								type="button"
								onClick={onCopyChildPhone}
								className="text-[10px] text-[var(--teal)] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
								title="Скопировать телефон ребенка родителю"
								data-testid="btn-copy-child-phone"
							>
								Взять телефон ребёнка
							</button>
						)}
					</div>
					<input
						id="patient-create-parent-phone"
						type="tel"
						inputMode="tel"
						placeholder="+7 (999) 000-00-00"
						value={parentPhone}
						onChange={(e) => onParentPhoneChange(e.target.value)}
						className="create-patient-input text-xs"
						data-testid="input-child-parent-phone"
					/>
				</div>
			</div>
		</div>
	);
}
