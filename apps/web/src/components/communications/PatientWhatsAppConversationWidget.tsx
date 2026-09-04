import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCheck,
	ClipboardList,
	Clock,
	ExternalLink,
	FileText,
	HeartPulse,
	MapPin,
	MessageSquare,
	Phone,
	Receipt,
	RefreshCw,
	Scan,
	Send,
	ShieldAlert,
	Smile,
	Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
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
	const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
	const [lastInboundAt, setLastInboundAt] = useState<string | null>(initialLastInboundAt ?? null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// 24h Window Check per Meta Cloud API Policy
	const isSessionOpen = useMemo(() => {
		if (!lastInboundAt) return false;
		const lastTime = new Date(lastInboundAt).getTime();
		if (isNaN(lastTime)) return false;
		return Date.now() - lastTime < 24 * 60 * 60 * 1000;
	}, [lastInboundAt]);

	const cleanPhone = useMemo(() => (patientPhone || "").replace(/\D/g, ""), [patientPhone]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const fetchThread = useCallback(async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/communications/inbox/${encodeURIComponent(patientId)}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
				const parsed = list.map((m: any) => ({
					id: m.id,
					direction: m.direction || "outbound",
					status: m.status || "delivered",
					bodyText: m.message || m.bodyText || "",
					createdAt: m.createdAt,
				}));
				setMessages(parsed);
				const lastInbound = [...parsed].reverse().find((m) => m.direction === "inbound");
				if (lastInbound?.createdAt) {
					setLastInboundAt(lastInbound.createdAt);
				}
			} else {
				setMessages([]);
				setLastInboundAt(null);
			}
		} catch (err) {
			console.error("Failed to load WhatsApp thread:", err);
			setMessages([]);
			setLastInboundAt(null);
		} finally {
			setLoading(false);
			setTimeout(scrollToBottom, 100);
		}
	}, [patientId]);

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
		if (templateKey === "reminder") {
			text = `Здравствуйте, ${patientName}! Напоминаем о вашей записи в клинику ДЕНТЕ на завтра. Пожалуйста, подтвердите визит ответным сообщением ДА или позвоните нам.`;
		} else if (templateKey === "confirmation") {
			text = `Здравствуйте, ${patientName}! Ваша запись в клинику ДЕНТЕ подтверждена. Ждём вас!`;
		} else if (templateKey === "route") {
			text = `Здравствуйте, ${patientName}! Маршрут до клиники ДЕНТЕ: ул. Ленина, д. 10. Вход со двора, бесплатная парковка перед шлагбаумом (код 1234). Схема проезда: https://dente.clinic/contacts`;
		} else if (templateKey === "xray") {
			text = `Здравствуйте, ${patientName}! Доктор назначил вам диагностический 3D-снимок (КТ/рентген). Исследование занимает 2 минуты, подготовка не требуется. Ждём вас в рентген-кабинете!`;
		} else if (templateKey === "treatment_plan") {
			text = `Здравствуйте, ${patientName}! Ваш индивидуальный план лечения и сметы подготовлены доктором. Вы можете ознакомиться с ними в клинике или личном кабинете.`;
		} else if (templateKey === "hygiene_6m") {
			text = `Здравствуйте, ${patientName}! Прошло 6 месяцев с вашего последнего визита. Приглашаем на плановый контрольный осмотр и профгигиену для сохранения гарантии на пломбы и здоровье десен.`;
		} else if (templateKey === "post_op") {
			text = `Здравствуйте, ${patientName}! Напоминаем рекомендации после приёма: не принимать пищу 2 часа, избегать горячего 24ч. При любых вопросах мы на связи!`;
		} else if (templateKey === "invoice") {
			text = `Здравствуйте, ${patientName}! Ссылка на оплату счёта: https://dente.clinic/pay`;
		}
		if (text) {
			setDraft(text);
			showToast("Шаблон сообщения применён", "info");
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

			{/* Quick Action Chips (8 Clinical Scenarios) */}
			<div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--glass-border)] bg-[var(--paper)] overflow-x-auto text-xs">
				<span className="text-[11px] text-[var(--muted)] whitespace-nowrap font-medium">Шаблоны:</span>
				<button
					type="button"
					onClick={() => handleQuickTemplate("reminder")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Напоминание о визите завтра"
				>
					<Calendar className="h-3 w-3 text-amber-600" />
					Завтра
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("confirmation")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Подтверждение записи"
				>
					<Sparkles className="h-3 w-3 text-emerald-600" />
					Подтверждение
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("route")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Адрес и схема проезда"
				>
					<MapPin className="h-3 w-3 text-rose-500" />
					Маршрут
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("xray")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Назначен снимок КТ / ОПТГ"
				>
					<Scan className="h-3 w-3 text-cyan-600" />
					Снимок КТ
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("treatment_plan")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="План лечения готов"
				>
					<ClipboardList className="h-3 w-3 text-indigo-600" />
					План лечения
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("hygiene_6m")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Контрольный осмотр и профгигиена через 6 месяцев"
				>
					<HeartPulse className="h-3 w-3 text-teal-600" />
					Профгигиена 6м
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("post_op")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Рекомендации после приёма"
				>
					<FileText className="h-3 w-3 text-blue-600" />
					Памятка
				</button>
				<button
					type="button"
					onClick={() => handleQuickTemplate("invoice")}
					className="flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] px-2.5 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--glass-panel)] whitespace-nowrap transition-colors"
					title="Ссылка на оплату счёта"
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
						className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0 shadow-sm cursor-pointer"
						title="Отправить через шлюз WhatsApp WABA"
					>
						{sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</button>
				</form>

				{/* Multi-Channel Quick Direct Actions */}
				{cleanPhone ? (
					<div className="flex items-center justify-between text-[11px] pt-1.5 text-[var(--muted)] border-t border-[var(--glass-border)] mt-2">
						<span className="flex items-center gap-1 font-medium">
							Прямая связь:
						</span>
						<div className="flex items-center gap-2">
							<a
								href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(draft || `Здравствуйте, ${patientName}!`)}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium"
								title="Открыть диалог в WhatsApp Web / Desktop"
							>
								WhatsApp
								<ExternalLink className="h-2.5 w-2.5" />
							</a>
							<span>•</span>
							<a
								href={`https://t.me/+${cleanPhone}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-sky-600 hover:underline font-medium"
								title="Написать пациенту в Telegram"
							>
								Telegram
								<ExternalLink className="h-2.5 w-2.5" />
							</a>
							<span>•</span>
							<a
								href={`sms:+${cleanPhone}?body=${encodeURIComponent(draft || "")}`}
								className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
								title="Отправить SMS"
							>
								СМС
							</a>
							<span>•</span>
							<a
								href={`tel:+${cleanPhone}`}
								className="inline-flex items-center gap-1 text-teal-600 hover:underline font-medium"
								title={`Позвонить ${patientPhone}`}
							>
								<Phone className="h-2.5 w-2.5" />
								Звонок
							</a>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
};
