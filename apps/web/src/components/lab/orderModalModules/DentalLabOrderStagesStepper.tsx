import React, { useState } from "react";
import { CheckCircle2, Calendar, Clock, CalendarCheck, Copy, Send, Check } from "lucide-react";
import type { LabOrderStageKey } from "../labMath";
import { showToast } from "../../GlobalToast";
import { openWhatsAppChat } from "../../../store/telephonyClinical";
import {
	generateReadyInClinicWhatsAppTemplate,
	generateReadyInClinicSmsTemplate,
} from "../readyInClinicModules/ReadyInClinicTemplates";

export interface DentalLabOrderStagesStepperProps {
	readonly currentStage: LabOrderStageKey;
	readonly onStageChange: (stage: LabOrderStageKey) => void;
	readonly dueDate: string;
	readonly onDueDateChange: (date: string) => void;
	readonly frameworkTrialDate?: string | undefined;
	readonly onFrameworkTrialDateChange?: ((date: string) => void) | undefined;
	readonly ceramicTrialDate?: string | undefined;
	readonly onCeramicTrialDateChange?: ((date: string) => void) | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly onScheduleFitting?: (() => void) | undefined;
	readonly readyOrderSummary?: any | undefined;
	readonly clinicPhone?: string | undefined;
}

export const CANONICAL_4_CLINICAL_STAGES = [
	{ id: "sent_to_lab", label: "1. Слепок отправлен в ЗТЛ", shortLabel: "Отправлен в ЗТЛ" },
	{ id: "in_progress", label: "2. В работе у техника", shortLabel: "В работе у техника" },
	{ id: "ready_in_clinic", label: "3. В клинике (готово к фиксации)", shortLabel: "В клинике" },
	{ id: "installed_completed", label: "4. Установлено пациенту", shortLabel: "Установлено" },
] as const;

/**
 * DentalLabOrderStagesStepper — степпер этапов и статусов изготовления наряда в ЗТЛ (Мандат 8b: <= 200 строк).
 * Объединяет 4 клинических статуса, ключевые даты примерок и интеграцию с расписанием / мессенджерами.
 * Ноль эмодзи (Мандат 8d), чистый клинический русский язык (Мандат 8x).
 */
export function DentalLabOrderStagesStepper({
	currentStage,
	onStageChange,
	dueDate,
	onDueDateChange,
	frameworkTrialDate,
	onFrameworkTrialDateChange,
	ceramicTrialDate,
	onCeramicTrialDateChange,
	scheduledVisitDate,
	onScheduleFitting,
	readyOrderSummary,
	clinicPhone,
}: DentalLabOrderStagesStepperProps): React.JSX.Element {
	const [notifyChannel, setNotifyChannel] = useState<"whatsapp" | "sms">("whatsapp");

	const readyMsg = readyOrderSummary
		? notifyChannel === "whatsapp"
			? generateReadyInClinicWhatsAppTemplate(readyOrderSummary)
			: generateReadyInClinicSmsTemplate(readyOrderSummary)
		: "Конструкция доставлена в клинику и ожидает примерки.";

	return (
		<div className="space-y-4" data-testid="lab-order-stages-stepper">
			{/* 4 Канонических клинических статуса */}
			<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] m-0 flex items-center gap-2">
						<Clock className="w-4 h-4 text-[#0d9488]" />
						<span>Клинический статус наряда в ЗТЛ:</span>
					</h3>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
						4 канонических этапа
					</span>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{CANONICAL_4_CLINICAL_STAGES.map((st) => {
						const isSel = (currentStage || "sent_to_lab") === st.id;
						return (
							<button
								key={st.id}
								type="button"
								onClick={() => onStageChange(st.id as LabOrderStageKey)}
								className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex flex-col justify-between min-h-[52px] ${
									isSel
										? "bg-teal-500/15 border-[#0d9488] text-[#0d9488] ring-1 ring-[#0d9488] shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)]"
								}`}
							>
								<span className="truncate">{st.label}</span>
								{isSel && <CheckCircle2 className="w-3.5 h-3.5 self-end text-[#0d9488]" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Даты этапов: примерка каркаса, примерка керамики, сдача работы */}
			<div className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-3">
				<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] m-0 flex items-center gap-1.5">
					<Calendar className="w-4 h-4 text-[#0d9488]" />
					<span>Сроки изготовления и контрольные примерки:</span>
				</h4>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
							Примерка каркаса:
						</label>
						<input
							type="date"
							value={frameworkTrialDate || ""}
							onChange={(e) => onFrameworkTrialDateChange?.(e.target.value)}
							className="w-full p-2 text-xs rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
							Примерка с керамикой:
						</label>
						<input
							type="date"
							value={ceramicTrialDate || ""}
							onChange={(e) => onCeramicTrialDateChange?.(e.target.value)}
							className="w-full p-2 text-xs rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
							Срок сдачи (готовность):
						</label>
						<input
							type="date"
							value={dueDate || ""}
							onChange={(e) => onDueDateChange(e.target.value)}
							className="w-full p-2 text-xs font-bold rounded-xl border border-[#0d9488] bg-[var(--paper,#ffffff)] text-[#0d9488]"
						/>
					</div>
				</div>
				{scheduledVisitDate && (
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 pt-1">
						Связанный визит в расписании: <strong>{scheduledVisitDate}</strong>
					</p>
				)}
			</div>

			{/* Баннер "В клинике (готово к фиксации)" — ноль эмодзи! */}
			{currentStage === "ready_in_clinic" && (
				<div
					className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3"
					data-testid="lab-order-ready-in-clinic-banner"
				>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2">
							<span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
								Работа в клинике
							</span>
							<span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
								Конструкция доставлена в клинику и готова к фиксации пациенту
							</span>
						</div>
						{onScheduleFitting && (
							<button
								type="button"
								onClick={onScheduleFitting}
								className="px-3.5 py-1.5 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
								data-testid="btn-lab-schedule-appointment"
							>
								<CalendarCheck className="w-4 h-4" />
								<span>Записать на примерку / фиксацию</span>
							</button>
						)}
					</div>

					{/* WhatsApp / SMS шаблон уведомления */}
					<div className="p-3 bg-[var(--paper,#ffffff)] rounded-xl border border-[var(--line,#cbd5e1)] space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setNotifyChannel("whatsapp")}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										notifyChannel === "whatsapp"
											? "bg-teal-600 text-white border-teal-600"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
									}`}
								>
									WhatsApp
								</button>
								<button
									type="button"
									onClick={() => setNotifyChannel("sms")}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
										notifyChannel === "sms"
											? "bg-teal-600 text-white border-teal-600"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
									}`}
								>
									SMS
								</button>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={async () => {
										await navigator.clipboard.writeText(readyMsg);
										showToast("Текст уведомления скопирован в буфер", "success");
									}}
									className="px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] text-xs font-semibold hover:bg-[var(--paper-soft,#f1f5f9)] inline-flex items-center gap-1 cursor-pointer"
								>
									<Copy className="w-3.5 h-3.5" />
									<span>Копировать</span>
								</button>
								{notifyChannel === "whatsapp" && clinicPhone && (
									<button
										type="button"
										onClick={() => openWhatsAppChat(clinicPhone, readyMsg)}
										className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
									>
										<Send className="w-3.5 h-3.5" />
										<span>Открыть чат</span>
									</button>
								)}
							</div>
						</div>
						<p className="text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap font-sans m-0 leading-relaxed">
							{readyMsg}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
