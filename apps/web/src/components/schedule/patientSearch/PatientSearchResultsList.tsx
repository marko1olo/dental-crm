import React from "react";
import { CalendarPlus, Plus, UserX } from "lucide-react";
import type { Patient } from "@dental/shared";
import type { QuickPatientSearchResult } from "../patientSearchEngine";
import { PatientSearchResultCard } from "./PatientSearchResultCard";

interface Props {
	searchResults: QuickPatientSearchResult[];
	selectedIndex: number;
	setSelectedIndex: (idx: number) => void;
	rawQuery: string;
	onQuickCreate: () => void;
	onQuickSubmit: (e?: React.FormEvent) => void;
	onSelectPatient: (patient: Patient) => void;
	onOpenPatientCard?: (id: string) => void;
	notify: (msg: string, type: "info" | "warning" | "error" | "success") => void;
}

export const PatientSearchResultsList: React.FC<Props> = ({
	searchResults, selectedIndex, setSelectedIndex, rawQuery,
	onQuickCreate, onQuickSubmit, onSelectPatient, onOpenPatientCard, notify,
}) => {
	return (
		<>
			<div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] font-medium">
				<span>Найдено пациентов: <strong className="text-[var(--ink)]">{searchResults.length}</strong></span>
				<span className="text-[11px] opacity-75">↑↓ навигация · Enter выбор</span>
			</div>
			<div className="flex-1 overflow-y-auto divide-y divide-[var(--line)] p-1">
				{searchResults.length === 0 ? (
					<div className="py-12 px-4 text-center text-slate-400 space-y-3">
						<UserX className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
						<p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Пациенты не найдены</p>
						<p className="text-xs">
							{rawQuery ? `По запросу «${rawQuery}» ничего не найдено` : "Проверьте номер телефона или напишите первые буквы фамилии"}
						</p>
						<div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
							<button
								type="button"
								data-testid="search-modal-empty-quick-btn"
								onClick={onQuickCreate}
								className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
							>
								<Plus className="w-4 h-4" />
								<span>Зарегистрировать за 5 сек: «{rawQuery.trim() || "Новый пациент"}»</span>
							</button>
							{rawQuery.trim() && (
								<button
									type="button"
									data-testid="search-modal-instant-book-enter-btn"
									onClick={() => onQuickSubmit()}
									className="h-9 px-4 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
									title="Записать сразу по нажатию клавиши Enter"
								>
									<CalendarPlus className="w-4 h-4" />
									<span>Записать сразу [Enter]</span>
								</button>
							)}
						</div>
					</div>
				) : (
					searchResults.map((item, index) => (
						<PatientSearchResultCard
							key={item.patient.id}
							item={item}
							isSelected={index === selectedIndex}
							onSelect={() => onSelectPatient(item.patient)}
							onHover={() => setSelectedIndex(index)}
							onOpenCard={onOpenPatientCard}
							notify={notify}
						/>
					))
				)}
			</div>
		</>
	);
};
