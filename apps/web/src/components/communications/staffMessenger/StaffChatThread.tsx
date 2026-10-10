import {
	AlertTriangle,
	CheckCheck,
	MessageSquare,
	ShieldAlert,
	User,
} from "lucide-react";
import type React from "react";
import type { StaffChatThreadProps } from "./types";

export const StaffChatThread: React.FC<StaffChatThreadProps> = ({
	messages,
	onOpenPatientCard,
	onIntercomAck,
	messagesEndRef,
}) => {
	return (
		<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
			{messages.length === 0 ? (
				<div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
					<MessageSquare size={40} className="opacity-30 mb-2" />
					<p className="text-sm font-semibold">Сообщений пока нет</p>
					<p className="text-xs max-w-xs mt-1">
						Напишите коллеге или отправьте быстрый вызов через кнопки интеркома выше.
					</p>
				</div>
			) : (
				messages.map((m) => {
					const isPing = m.messageType === "intercom_ping";
					const isUrgent = m.urgency === "urgent";
					const isCritical = m.urgency === "critical";

					return (
						<div
							key={m.id}
							className={`staff-message-bubble ${
								isCritical
									? "bubble-critical"
									: isUrgent
										? "bubble-urgent"
										: isPing
											? "bubble-ping"
											: ""
							}`}
							data-testid={`staff-message-${m.id}`}
						>
							{/* Шапка сообщения */}
							<div className="flex items-center justify-between mb-1.5">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
										{m.senderName}
									</span>
									<span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
										{m.senderRole}
									</span>
									{isPing && (
										<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-800 dark:text-teal-300">
											ИНТЕРКОМ
										</span>
									)}
									{isUrgent && (
										<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-1">
											<AlertTriangle size={10} /> СРОЧНО
										</span>
									)}
									{isCritical && (
										<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/30 text-rose-800 dark:text-rose-200 flex items-center gap-1">
											<ShieldAlert size={10} /> ЭКСТРЕННО
										</span>
									)}
								</div>
								<span className="text-[11px] text-slate-400">
									{new Date(m.createdAt).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>

							{/* Текст сообщения */}
							<div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
								{m.content}
							</div>

							{/* Прикрепление карточки пациента (если есть) */}
							{m.patientAttachment && (
								<div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center justify-between shadow-2xs">
									<div className="flex items-center gap-2.5">
										<div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
											<User size={16} />
										</div>
										<div>
											<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
												<span>{m.patientAttachment.fullName}</span>
												{m.patientAttachment.hasAllergyAlert && (
													<span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold">
														АЛЛЕРГИЯ
													</span>
												)}
											</div>
											<div className="text-[10px] text-slate-500 dark:text-slate-400">
												{m.patientAttachment.cabinetNumber && (
													<span>{m.patientAttachment.cabinetNumber} • </span>
												)}
												Врач: {m.patientAttachment.doctorName || "Не указан"}
											</div>
										</div>
									</div>

									{onOpenPatientCard && (
										<button
											type="button"
											onClick={() =>
												onOpenPatientCard(m.patientAttachment!.patientId)
											}
											className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-500 transition-all cursor-pointer min-h-[34px]"
										>
											Открыть ЭМК
										</button>
									)}
								</div>
							)}

							{/* Подтверждения от коллег (Ack-Loop) */}
							{isPing && (
								<div className="mt-2.5 pt-2 border-t border-[var(--line,#e2e8f0)]/60 dark:border-[var(--line,#334155)]/60 flex items-center justify-between flex-wrap gap-2">
									{Array.isArray(m.intercomAcks) &&
									m.intercomAcks.length > 0 ? (
										<div className="flex items-center gap-1.5 flex-wrap">
											{m.intercomAcks.map((ack, idx) => (
												<span
													key={idx}
													className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold"
												>
													<CheckCheck size={12} />
													<span>
														{ack.staffName}:{" "}
														{ack.ackType === "on_my_way"
															? "Иду! (1 мин)"
															: "Буду через 3-5 мин"}
													</span>
												</span>
											))}
										</div>
									) : (
										<div className="flex items-center gap-1.5">
											<button
												type="button"
												onClick={() => handleIntercomAckWrapper(m.id, "on_my_way")}
												className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer shadow-2xs"
											>
												🏃 Иду! (1 мин)
											</button>
											<button
												type="button"
												onClick={() =>
													handleIntercomAckWrapper(m.id, "coming_soon")
												}
												className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
											>
												⏱ 3-5 мин
											</button>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})
			)}
			<div ref={messagesEndRef} />
		</div>
	);

	function handleIntercomAckWrapper(
		messageId: string,
		ackType: "on_my_way" | "coming_soon",
	) {
		onIntercomAck(messageId, ackType);
	}
};
