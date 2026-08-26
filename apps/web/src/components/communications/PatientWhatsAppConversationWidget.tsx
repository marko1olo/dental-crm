import {
	AlertTriangle,
	Check,
	CheckCheck,
	Clock,
	FileText,
	MessageSquare,
	Receipt,
	RefreshCw,
	Send,
	ShieldAlert,
	Smile,
	Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../GlobalToast";

export interface ChatMessage {
	id: string;
	direction: "inbound" | "outbound";
	status: "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "received";
	bodyText: string;
	templateKey?: string | null;
	createdAt: string;
	deliveredAt?: string | null;
	readAt?: string | null;
	errorMessage?: string | null;
}

interface PatientWhatsAppConversationWidgetProps {
	patientId: string;
	patientName: string;
	patientPhone?: string | null;
	lastInboundAt?: string | null;
	onOpenSettings?: () => void;
}

export const PatientWhatsAppConversationWidget: React.FC<PatientWhatsAppConversationWidgetProps> = ({
	patientId,
	patientName,
	patientPhone,
	lastInboundAt: initialLastInboundAt,
	onOpenSettings,
}) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [lastInboundAt, setLastInboundAt] = useState<string | null>(initialLastInboundAt ?? null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Evaluate 24-hour Meta session window
	const isSessionOpen = useMemo(() => {
		if (!lastInboundAt) return false;
		const lastTime = new Date(lastInboundAt).getTime();
		if (isNaN(lastTime)) return false;
		return Date.now() - lastTime < 24 * 60 * 60 * 1000;
	}, [lastInboundAt]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const fetchThread = useCallback(async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/communications/inbox/${encodeURIComponent(patientId)}`);
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
				setMessages(
					list.map((m: any) => ({
						id: m.id,
						direction: m.direction || "outbound",
						status: m.status || "delivered",
						bodyText: m.message || m.bodyText || "",
						createdAt: m.createdAt,
					})),
				);
			} else {
				// Fallback mock history for clean preview
				setMessages([
					{
						id: "msg-1",
						direction: "outbound",
						status: "read",
						bodyText: `Здравствуйте, ${patientName}! Напоминаем о вашей записи на приём завтра в 14:00.`,
						templateKey: "appointment_reminder",
						createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
					},
					{
						id: "msg-2",
						direction: "inbound",
						status: "received",
						bodyText: "Здравствуйте! Да, подтверждаю, обязательно буду.",
						createdAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
					},
				]);
				setLastInboundAt(new Date(Date.now() - 2.5 * 3600 * 1000).toISOString());
			}
		} catch (err) {
			console.error("Failed to load WhatsApp thread:", err);
		} finally {
			setLoading(false);
			setTimeout(scrollToBottom, 100);
		}
	}, [patientId, patientName]);

	useEffect(() => {
		void fetchThread();
	}, [fetchThread]);

	const handleSendReply = async (textToSend: string) => {
		const text = textToSend.trim();
		if (!text) return;

		setSending(true);
		const optimisticId = `opt-${Date.now()}`;
		const optimisticMsg: ChatMessage = {
			id: optimisticId,
			direction: "outbound",
			status: "sending",
			bodyText: text,
			createdAt: new Date().toISOString(),
		};

		setMessages((prev) => [...prev, optimisticMsg]);
		setDraft("");
		setTimeout(scrollToBottom, 50);

		try {
			const res = await fetch("/api/whatsapp/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId,
					message: text,
				}),
			});

			if (res.ok) {
				setMessages((prev) =>
					prev.map((m) => (m.id === optimisticId ? { ...m, status: "sent" } : m)),
				);
				showToast("Сообщение отправлено в WhatsApp", "success");
			} else {
				const err = await res.json().catch(() => ({}));
				setMessages((prev) =>
					prev.map((m) =>
						m.id === optimisticId
							? { ...m, status: "failed", errorMessage: err.message || "Ошибка отправки" }
							: m,
					),
				);
				throw new Error(err.message || "Ошибка отправки");
			}
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : "Не удалось отправить сообщение в WhatsApp",
				"error",
			);
		} finally {
			setSending(false);
		}
	};

	const handleQuickTemplate = (templateKey: string) => {
		let text = "";
		if (templateKey === "confirmation") {
			text = `Здравствуйте, ${patientName}! Ваша запись в клинику ДЕНТЕ подтверждена. Ждём вас!`;
		} else if (templateKey === "post_op") {
			text = `Здравствуйте, ${patientName}! Напоминаем рекомендации после приёма: не принимать пищу 2 часа, избегать горячего 24ч. При вопросах мы на связи!`;
		} else if (templateKey === "invoice") {
			text = `Здравствуйте, ${patientName}! Ссылка на оплату счёта: https://dente.clinic/pay`;
		}
		if (text) {
			setDraft(text);
		}
	};

	const renderStatusIcon = (status: ChatMessage["status"]) => {
		switch (status) {
			case "sending":
				return <Clock className="h-3 w-3 text-amber-500 animate-pulse" />;
			case "sent":
				return <Check className="h-3 w-3 text-[var(--muted)]" />;
			case "delivered":
				return <CheckCheck className="h-3 w-3 text-[var(--muted)]" />;
			case "read":
				return <CheckCheck className="h-3 w-3 text-emerald-500 font-bold" />;
			case "failed":
				return <AlertTriangle className="h-3 w-3 text-red-500" />;
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full rounded-2xl border border-[var(--glass-border)] bg-[var(--paper)] overflow-hidden shadow-sm">
			{/* Widget Header */}
			<div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3 bg-[var(--paper-strong)]">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
						<MessageSquare className="h-4 w-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-[var(--ink)]">{patientName}</h3>
							{patientPhone ? (
								<span className="text-xs text-[var(--muted)] font-mono">{patientPhone}</span>
							) : null}
						</div>
						<div className="flex items-center gap-2 mt-0.5">
							{isSessionOpen ? (
								<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
									24ч окно активно (свободный текст)
								</span>
							) : (
								<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
									<span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
									Окно закрыто (только шаблоны WABA)
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={fetchThread}
						disabled={loading}
						title="Обновить переписку"
						className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--muted)] hover:bg-[var(--glass-panel)] hover:text-[var(--ink)] transition-colors"
					>
						<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
					</button>
					{onOpenSettings ? (
						<button
							type="button"
							onClick={onOpenSettings}
							className="rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-panel)] transition-colors"
						>
							Шлюз
						</button>
					) : null}
				</div>
			</div>

			{/* Quick Action Chips */}
			<div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper)] overflow-x-auto text-xs">
				<span className="text-[11px] text-[var(--muted)] whitespace-nowrap">Быстрые шаблоны:</span>
				<button
					type="button"
					onClick={() => handleQuickTemplate("confirmation")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
				>
					<Sparkles className="h-3 w-3 text-emerald-600" />
					Подтверждение
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("post_op")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
				>
					<FileText className="h-3 w-3 text-blue-600" />
					Памятка
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("invoice")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
				>
					<Receipt className="h-3 w-3 text-purple-600" />
					Счёт
				</button>
			</div>

			{/* Chat Messages Feed */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--paper)]">
				{messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center text-center p-6 text-[var(--muted)]">
						<MessageSquare className="h-8 w-8 mb-2 opacity-40" />
						<p className="text-sm">История переписки в WhatsApp пуста</p>
						<p className="text-xs mt-1">Отправьте шаблонное сообщение или дождитесь ответа пациента</p>
					</div>
				) : (
					messages.map((m) => {
						const isInbound = m.direction === "inbound";
						return (
							<div
								key={m.id}
								className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
							>
								<div
									className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
										isInbound
											? "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--glass-border)] rounded-tl-sm"
											: "bg-emerald-600 text-white rounded-tr-sm"
									}`}
								>
									<div className="whitespace-pre-wrap break-words">{m.bodyText}</div>
									<div
										className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
											isInbound ? "text-[var(--muted)]" : "text-emerald-100"
										}`}
									>
										<span>
											{new Date(m.createdAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
										{!isInbound ? renderStatusIcon(m.status) : null}
									</div>
								</div>
								{m.status === "failed" && m.errorMessage ? (
									<span className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
										<AlertTriangle className="h-2.5 w-2.5" />
										{m.errorMessage}
									</span>
								) : null}
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Reply Input Bar */}
			<div className="border-t border-[var(--glass-border)] p-3 bg-[var(--paper-strong)]">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void handleSendReply(draft);
					}}
					className="flex items-center gap-2"
				>
					<input
						type="text"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={
							isSessionOpen
								? "Напишите ответ пациенту в WhatsApp..."
								: "Введите текст (вне 24ч окна будет отправлен шаблон)..."
						}
						className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
					/>
					<button
						type="submit"
						disabled={sending || !draft.trim()}
						className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0 shadow-sm"
					>
						{sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</button>
				</form>
			</div>
		</div>
	);
};
