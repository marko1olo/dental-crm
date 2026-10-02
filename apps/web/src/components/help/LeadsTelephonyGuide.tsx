/**
 * DENTE CRM — Leads, Calls & Telephony Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - Real-time incoming call popup with instant patient recognition
 * - 1-Click fast lead card creation for unknown phone numbers
 * - 4-Stage Kanban Funnel: New -> Qualified -> Consultation -> Arrived
 * - 1-Click scheduling directly from call card
 * - Hotkeys (Alt+P, Ctrl+Alt+L), FAQs, and interactive tour button
 */

import React, { useState } from "react";
import {
	ArrowRight,
	CheckCircle2,
	Clock,
	Gamepad2,
	HelpCircle,
	Kanban,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneIncoming,
	PhoneOff,
	Sparkles,
	User,
	UserCheck,
	UserPlus,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

interface MockLead {
	id: string;
	patientName: string;
	phone: string;
	channel: "Звонок" | "Сайт" | "Мессенджер";
	request: string;
	stage: "new" | "qualified" | "consultation" | "arrived";
	time: string;
}

const INITIAL_MOCK_LEADS: MockLead[] = [
	{
		id: "lead-1",
		patientName: "Смирнова Елена Александровна",
		phone: "+7 (912) 345-67-89",
		channel: "Звонок",
		request: "Острая боль, выпала пломба (зуб 2.6)",
		stage: "new",
		time: "10:14",
	},
	{
		id: "lead-2",
		patientName: "Петров Дмитрий Сергеевич",
		phone: "+7 (921) 987-65-43",
		channel: "Сайт",
		request: "Имплантация All-on-4, расчёт сметы",
		stage: "qualified",
		time: "09:45",
	},
	{
		id: "lead-3",
		patientName: "Ковалева Мария Викторовна",
		phone: "+7 (905) 555-12-34",
		channel: "Звонок",
		request: "Запись на консультацию: 15:30 к терапевту",
		stage: "consultation",
		time: "Вчера",
	},
	{
		id: "lead-4",
		patientName: "Васильев Алексей Николаевич",
		phone: "+7 (916) 111-22-33",
		channel: "Мессенджер",
		request: "Осмотр ортопеда, примерка коронки",
		stage: "arrived",
		time: "В клинике",
	},
];

export const LeadsTelephonyGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [leads, setLeads] = useState<MockLead[]>(INITIAL_MOCK_LEADS);
	const [isCallSimulated, setIsCallSimulated] = useState<boolean>(true);
	const [selectedLeadId, setSelectedLeadId] = useState<string>("lead-1");

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("reception_admin");
		} else {
			startDoctorTour("reception_admin");
		}
	};

	const handleAdvanceStage = (leadId: string) => {
		setLeads((prev) =>
			prev.map((lead) => {
				if (lead.id !== leadId) return lead;
				const stageOrder: readonly MockLead["stage"][] = ["new", "qualified", "consultation", "arrived"];
				const currentIndex = stageOrder.indexOf(lead.stage);
				const nextIndex = (currentIndex + 1) % stageOrder.length;
				const nextStage: MockLead["stage"] = stageOrder[nextIndex] ?? "new";
				return { ...lead, stage: nextStage };
			}),
		);
	};

	const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0];

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
					<PhoneCall size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Лиды, звонки и телефония</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300">
							Всплытие звонка и Канбан
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Интегрированный модуль входящих обращений клиники: моментальное определение звонящего пациента,
						автокарточка нового лида и 4-колоночный канбан для записи на консультацию без потери входящих заявок.
					</div>
				</div>
			</div>

			{/* Interactive Visual Preview: Top Ambient Call Capsule & 4-Column Kanban Mockup */}
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs space-y-0">
				{/* Mockup Toolbar Header */}
				<div className="p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Kanban size={15} className="text-rose-600 dark:text-rose-400" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Интерактивная воронка обращений и звонков
						</span>
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold">
							Ресепшен / АТС
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setIsCallSimulated((v) => !v)}
							className={`h-7 px-2.5 rounded border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
								isCallSimulated
									? "bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-200"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title="Включить или отключить имитацию входящего звонка"
						>
							<PhoneIncoming size={12} className={isCallSimulated ? "animate-bounce" : ""} />
							<span>{isCallSimulated ? "Звонок активен" : "Симулировать звонок"}</span>
						</button>
					</div>
				</div>

				{/* 1. Quiet Top Ambient Call Banner (Section VI.3.2 Standard) */}
				{isCallSimulated && (
					<div className="p-2 bg-rose-500/10 border-b border-rose-500/20 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200">
						<div className="flex items-center gap-2 min-w-0">
							<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
							<div className="flex items-center gap-1.5 text-[11px] truncate">
								<span className="font-bold text-[var(--ink)]">Входящий вызов:</span>
								<span className="font-semibold text-rose-700 dark:text-rose-300">+7 (912) 345-67-89</span>
								<span className="text-[10px] text-[var(--muted)] hidden sm:inline">• Смирнова Е.А. (Карта 043/у найдена)</span>
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => {
									setSelectedLeadId("lead-1");
								}}
								className="h-6 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
								title="Принять звонок и открыть карточку"
							>
								<Phone size={10} />
								<span>Ответить</span>
							</button>
							<button
								type="button"
								onClick={() => setIsCallSimulated(false)}
								className="h-6 px-2 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-rose-600 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
								title="Отклонить или завершить звонок"
							>
								<PhoneOff size={10} />
								<span>Сброс</span>
							</button>
						</div>
					</div>
				)}

				{/* 2. 4-Column Kanban Mockup */}
				<div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[var(--paper)]">
					{/* Stage 1: Новые */}
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)] text-[11px]">
								<span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
									<span>1. Новые</span>
								</span>
								<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
									{leads.filter((l) => l.stage === "new").length}
								</span>
							</div>

							<div className="space-y-1.5 mt-2">
								{leads
									.filter((l) => l.stage === "new")
									.map((lead) => (
										<div
											key={lead.id}
											onClick={() => setSelectedLeadId(lead.id)}
											className={`p-2 rounded border transition-all cursor-pointer space-y-1 text-[11px] ${
												selectedLeadId === lead.id
													? "border-blue-500 bg-blue-500/10 shadow-2xs"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-blue-500/50"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-[var(--ink)]">
												<span className="truncate">{lead.patientName}</span>
												<span className="text-[9px] text-[var(--muted)]">{lead.time}</span>
											</div>
											<div className="text-[10px] text-[var(--muted)]">{lead.phone}</div>
											<div className="text-[10px] text-blue-700 dark:text-blue-300 line-clamp-1">{lead.request}</div>
										</div>
									))}
							</div>
						</div>

						<div className="pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
							<span>Первый контакт</span>
							<button
								type="button"
								onClick={() => handleAdvanceStage(selectedLeadId)}
								className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
							>
								<span>Перевести</span>
								<ArrowRight size={10} />
							</button>
						</div>
					</div>

					{/* Stage 2: Квалификация */}
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)] text-[11px]">
								<span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
									<span>2. Квалификация</span>
								</span>
								<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
									{leads.filter((l) => l.stage === "qualified").length}
								</span>
							</div>

							<div className="space-y-1.5 mt-2">
								{leads
									.filter((l) => l.stage === "qualified")
									.map((lead) => (
										<div
											key={lead.id}
											onClick={() => setSelectedLeadId(lead.id)}
											className={`p-2 rounded border transition-all cursor-pointer space-y-1 text-[11px] ${
												selectedLeadId === lead.id
													? "border-amber-500 bg-amber-500/10 shadow-2xs"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-amber-500/50"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-[var(--ink)]">
												<span className="truncate">{lead.patientName}</span>
												<span className="text-[9px] text-[var(--muted)]">{lead.time}</span>
											</div>
											<div className="text-[10px] text-[var(--muted)]">{lead.phone}</div>
											<div className="text-[10px] text-amber-700 dark:text-amber-300 line-clamp-1">{lead.request}</div>
										</div>
									))}
							</div>
						</div>

						<div className="pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
							<span>Уточнение жалоб</span>
							<button
								type="button"
								onClick={() => handleAdvanceStage(selectedLeadId)}
								className="text-amber-600 dark:text-amber-400 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
							>
								<span>Перевести</span>
								<ArrowRight size={10} />
							</button>
						</div>
					</div>

					{/* Stage 3: Консультация */}
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)] text-[11px]">
								<span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
									<span>3. Консультация</span>
								</span>
								<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
									{leads.filter((l) => l.stage === "consultation").length}
								</span>
							</div>

							<div className="space-y-1.5 mt-2">
								{leads
									.filter((l) => l.stage === "consultation")
									.map((lead) => (
										<div
											key={lead.id}
											onClick={() => setSelectedLeadId(lead.id)}
											className={`p-2 rounded border transition-all cursor-pointer space-y-1 text-[11px] ${
												selectedLeadId === lead.id
													? "border-purple-500 bg-purple-500/10 shadow-2xs"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-purple-500/50"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-[var(--ink)]">
												<span className="truncate">{lead.patientName}</span>
												<span className="text-[9px] text-[var(--muted)]">{lead.time}</span>
											</div>
											<div className="text-[10px] text-[var(--muted)]">{lead.phone}</div>
											<div className="text-[10px] text-purple-700 dark:text-purple-300 line-clamp-1">{lead.request}</div>
										</div>
									))}
							</div>
						</div>

						<div className="pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
							<span>Записан в сетку</span>
							<button
								type="button"
								onClick={() => handleAdvanceStage(selectedLeadId)}
								className="text-purple-600 dark:text-purple-400 hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
							>
								<span>Перевести</span>
								<ArrowRight size={10} />
							</button>
						</div>
					</div>

					{/* Stage 4: Дошли */}
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)] text-[11px]">
								<span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
									<span>4. Дошли (Приём)</span>
								</span>
								<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
									{leads.filter((l) => l.stage === "arrived").length}
								</span>
							</div>

							<div className="space-y-1.5 mt-2">
								{leads
									.filter((l) => l.stage === "arrived")
									.map((lead) => (
										<div
											key={lead.id}
											onClick={() => setSelectedLeadId(lead.id)}
											className={`p-2 rounded border transition-all cursor-pointer space-y-1 text-[11px] ${
												selectedLeadId === lead.id
													? "border-emerald-500 bg-emerald-500/10 shadow-2xs"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-emerald-500/50"
											}`}
										>
											<div className="flex items-center justify-between font-bold text-[var(--ink)]">
												<span className="truncate">{lead.patientName}</span>
												<span className="text-[9px] text-emerald-600 font-semibold">{lead.time}</span>
											</div>
											<div className="text-[10px] text-[var(--muted)]">{lead.phone}</div>
											<div className="text-[10px] text-emerald-700 dark:text-emerald-300 line-clamp-1">{lead.request}</div>
										</div>
									))}
							</div>
						</div>

						<div className="pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)] flex items-center justify-between">
							<span>Сел в кресло</span>
							<span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
								<CheckCircle2 size={11} />
								<span>Успех</span>
							</span>
						</div>
					</div>
				</div>

				{/* 3. Selected Lead Context Bar */}
				{selectedLead && (
					<div className="p-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-bold text-[var(--ink)]">Выбранный лид:</span>
							<span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">{selectedLead.patientName}</span>
							<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)]">
								{selectedLead.channel}
							</span>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => handleAdvanceStage(selectedLead.id)}
								className="h-6 px-2.5 rounded bg-[var(--teal,#0d9488)] hover:opacity-90 text-white font-semibold text-[10px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
							>
								<span>Продвинуть этап</span>
								<ArrowRight size={10} />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-rose-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел гарантирует, что ни один потенциальный пациент не потеряется после звонка или заявки с сайта.
					Администратор видит имя звонящего ещё до снятия трубки, сразу открывает историю лечения или записывает нового пациента за 5 секунд.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для администратора</span>
					<span className="text-[10px] text-[var(--muted)]">Обработка звонка</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Всплытие входящего звонка</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							При звонке на экране появляется компактная плашка с именем пациента или кнопкой «Создать карточку» для нового номера.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Квалификация в канбане</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Обращение автоматически попадает в колонку «Новые». Перемещайте карточку в «Квалифицированные» или «Консультация».
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Мгновенная запись</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите «Записать на приём» прямо в карточке звонка — программа откроет расписание и подставит данные пациента.
						</p>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Телефония</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Открыть карточку текущего звонка:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-rose-600 dark:text-rose-400">
							Alt + P
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Канбан воронки обращений:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-rose-600 dark:text-rose-400">
							Ctrl + Alt + L
						</kbd>
					</div>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Какие АТС поддерживаются?</strong>
						<span>Любые популярные провайдеры: UIS / CoMagic, Mango Telecom, Zadarma, Ростелеком, Мегафон и Asterisk.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Можно ли прослушать запись разговора?</strong>
						<span>Да, аудиозапись разговора прикрепляется к карточке пациента и обращению, доступна для прослушивания в 1 клик.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Мешает ли плашка звонка врачу на приёме?</strong>
						<span>Нет! Согласно правилу системной тишины, плашка входящего звонка отображается деликатно в служебном углу и не перекрывает активный приём.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-rose-600 dark:text-rose-400" />
						<span>Интерактивный тренажёр: Звонки и воронка лидов</span>
					</div>
					<p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
						Отработайте приём звонка, создание карточки пациента и запись на консультацию за 15 секунд.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
