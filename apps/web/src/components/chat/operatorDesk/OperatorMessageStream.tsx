import React from "react";
import {
	ArrowLeft,
	Bot,
	Calendar,
	Plus,
	RefreshCw,
	Sparkles,
	UserCheck,
} from "lucide-react";
import { formatPatientInitials, formatPhoneDisplay, getAvatarColor } from "../../../store/telephonyStore";
import { getSourceBadgeInfo } from "./constants";
import type { ChatMessageItem, InboxConversation } from "./types";

export interface OperatorMessageStreamProps {
	activeConv: InboxConversation;
	messages: ChatMessageItem[];
	isLoadingMessages: boolean;
	operatorName: string;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	onCloseMobileThread: () => void;
	onOpenPatientCard?: (patientId: string) => void;
	onOpenQuickBooking: () => void;
	onOpenLinkPatient: () => void;
	onTakeover: () => void;
	onRelease: () => void;
}

export function OperatorMessageStream({
	activeConv,
	messages,
	isLoadingMessages,
	operatorName,
	messagesEndRef,
	onCloseMobileThread,
	onOpenPatientCard,
	onOpenQuickBooking,
	onOpenLinkPatient,
	onTakeover,
	onRelease,
}: OperatorMessageStreamProps) {
	const activeSourceInfo = getSourceBadgeInfo(activeConv);

	return (
		<>
			{/* Chat Top Header */}
			<div className="p-3.5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]/70">
				<div className="flex items-center gap-3 min-w-0">
					{/* Back button on mobile */}
					<button
						type="button"
						onClick={onCloseMobileThread}
						className="md:hidden p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--line)]"
						title="Назад к списку"
					>
						<ArrowLeft size={18} />
					</button>

					{/* Patient avatar */}
					<div
						className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
						style={{
							backgroundColor: getAvatarColor(activeConv.patientName).bg,
							color: getAvatarColor(activeConv.patientName).text,
						}}
					>
						{formatPatientInitials(activeConv.patientName)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 min-w-0">
							<h4 className="font-bold text-sm truncate text-[var(--ink,#0f172a)]">
								{activeConv.patientName}
							</h4>
							<span
								className="px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs border shrink-0"
								style={{
									backgroundColor: activeSourceInfo.bgColor,
									color: activeSourceInfo.color,
									borderColor: activeSourceInfo.borderColor,
								}}
								title={`Источник: ${activeSourceInfo.name}`}
							>
								{activeSourceInfo.badge}
							</span>
						</div>
						<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)] flex-wrap">
							{activeConv.phone && (
								<span>{formatPhoneDisplay(activeConv.phone)}</span>
							)}
							<span>•</span>
							<span className="font-mono text-[11px]">
								ID: {activeConv.senderId}
							</span>
							{activeConv.patientId && onOpenPatientCard && (
								<button
									type="button"
									onClick={() => onOpenPatientCard(activeConv.patientId!)}
									className="text-teal-600 hover:underline font-semibold cursor-pointer"
								>
									Карточка
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Action Buttons: Запись на приём / Привязать к карте / Перехватить диалог */}
				<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
					{/* Кнопка записи на прием в 1 клик (Мандат 8e) */}
					<button
						type="button"
						onClick={onOpenQuickBooking}
						className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
						title="Записать пациента на приём"
						data-testid="quick-book-chat-btn"
					>
						<Calendar size={15} />
						<span className="hidden sm:inline">Записать на приём</span>
						<span className="sm:hidden text-[11px]">Запись</span>
					</button>

					{/* Создать / привязать карту, если ещё не привязана */}
					{!activeConv.patientId && (
						<button
							type="button"
							onClick={onOpenLinkPatient}
							className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] transition-all flex items-center gap-1 cursor-pointer shrink-0"
							title="Создать или привязать карту пациента в 1 клик"
							data-testid="link-patient-chat-btn"
						>
							<Plus size={14} className="text-teal-600" />
							<span className="hidden md:inline">Создать карту</span>
						</button>
					)}

					{/* Перехват диалога */}
					{activeConv.isIntercepted ? (
						<button
							type="button"
							onClick={onRelease}
							className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-teal-500/30 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
							title="Возобновить автоматические ответы бота для этого чата"
							data-testid="release-chat-btn"
						>
							<Bot size={15} />
							<span className="hidden sm:inline">Вернуть боту</span>
							<span className="sm:hidden text-[11px]">Боту</span>
						</button>
					) : (
						<button
							type="button"
							onClick={onTakeover}
							className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
							title="Поставить автоответчик бота на паузу и вести диалог лично"
							data-testid="takeover-chat-btn"
						>
							<UserCheck size={15} />
							<span className="hidden sm:inline">Перехватить</span>
							<span className="sm:hidden text-[11px]">Ручной</span>
						</button>
					)}
				</div>
			</div>

			{/* Intercept Banner Notice */}
			{activeConv.isIntercepted && (
				<div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<UserCheck size={14} className="text-amber-600 shrink-0" />
						<span className="leading-tight">
							Диалог перехвачен оператором (<strong>{activeConv.interceptedBy || operatorName}</strong>). Автоответчик бота спит.
						</span>
					</div>
					<button
						type="button"
						onClick={onRelease}
						className="text-xs font-bold underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer shrink-0 ml-auto"
					>
						Возобновить бота
					</button>
				</div>
			)}

			{/* Messages Canvas */}
			<div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-2.5 bg-[var(--paper-subtle,#fbfcfd)]">
				{isLoadingMessages ? (
					<div className="h-full flex items-center justify-center text-xs text-[var(--muted,#64748b)]">
						<RefreshCw size={18} className="animate-spin text-teal-600 mr-2" />
						<span>Загрузка сообщений...</span>
					</div>
				) : messages.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted,#64748b)] gap-2">
						<Bot size={28} className="text-slate-300 dark:text-slate-600" />
						<p className="text-xs">В этом диалоге ещё нет сообщений</p>
					</div>
				) : (
					messages.map((m) => {
						const isOutbound = m.direction === "outbound";
						const isBot = m.sender === "bot";
						const isOperator = m.sender === "operator";

						return (
							<div
								key={m.id}
								className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
									isOutbound ? "ml-auto items-end" : "mr-auto items-start"
								}`}
							>
								{/* Sender Label */}
								<div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--muted,#64748b)]">
									{isBot ? (
										<span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
											<Bot size={11} />
											<span>{m.senderName}</span>
										</span>
									) : isOperator ? (
										<span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
											<UserCheck size={11} />
											<span>{m.senderName}</span>
										</span>
									) : (
										<span className="font-semibold text-[var(--ink,#0f172a)]">
											{m.senderName}
										</span>
									)}
									<span>•</span>
									<span>
										{new Date(m.createdAt).toLocaleTimeString("ru-RU", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>

								{/* Message Card Bubble */}
								<div
									className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-xs border ${
										!isOutbound
											? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] rounded-tl-sm"
											: isBot
												? "bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 border-sky-200 dark:border-sky-800 rounded-tr-sm"
												: "bg-teal-600 text-white border-teal-700 rounded-tr-sm"
									}`}
								>
									{m.text}

									{/* If bot executed an action */}
									{m.actionExecuted && (
										<div className="mt-2 pt-1.5 border-t border-sky-200/50 dark:border-sky-800/50 flex items-center gap-1 text-[10px] font-mono text-sky-700 dark:text-sky-300">
											<Sparkles size={10} />
											<span>Действие: {m.actionExecuted}</span>
										</div>
									)}
								</div>
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>
		</>
	);
}
