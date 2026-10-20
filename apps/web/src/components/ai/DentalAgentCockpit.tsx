import {
	Activity,
	Bot,
	Camera,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ClipboardCheck,
	Copy,
	FileText,
	Folder,
	Globe,
	MessageSquare,
	Monitor,
	Pill,
	RotateCcw,
	Send,
	Sparkles,
	Square,
	Stethoscope,
	Wrench,
	X,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import { CopilotMarkdown } from "../copilot/CopilotMarkdown";
import {
	detectWorkstationEnvironment,
	getHumanToolMeta,
	isClinicalProtocol,
	parseSoapSectionsFromText,
	type ToolMeta,
} from "./dentalAgentCockpitLogic";
import "./dentalAgentCockpit.css";

export interface ToolCallItem {
	name: string;
	title: string;
	isWorkstation?: boolean;
	iconName?: ToolMeta["iconName"];
	args?: Record<string, unknown> | undefined;
	status: "running" | "done" | "failed";
	result?: unknown;
}

export interface AgentChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	text: string;
	streaming?: boolean | undefined;
	toolCalls?: ToolCallItem[] | undefined;
	timestamp: string;
}

export interface DentalAgentCockpitProps {
	isOpen?: boolean | undefined;
	onClose?: (() => void) | undefined;
	initialPatientId?: string | null | undefined;
	initialToothNumber?: number | string | null | undefined;
}

declare global {
	interface Window {
		__denteAgentCockpit?: {
			open: (context?: {
				patientId?: string;
				toothNumber?: number | string | null;
				prompt?: string;
			}) => void;
			close: () => void;
			toggle: () => void;
			sendQuery: (query: string) => void;
		};
	}
}

export const DentalAgentCockpit: React.FC<DentalAgentCockpitProps> = ({
	isOpen: propIsOpen,
	onClose: propOnClose,
	initialPatientId,
	initialToothNumber,
}) => {
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;

	const [isWorkstationMode, setIsWorkstationMode] = useState(false);

	useEffect(() => {
		setIsWorkstationMode(detectWorkstationEnvironment());
	}, []);

	const [messages, setMessages] = useState<AgentChatMessage[]>([
		{
			id: "welcome-1",
			role: "assistant",
			text: "Здравствуйте! Я клинический ассистент врача. Вы можете задать вопрос по диагностике, соматическим рискам, анестезии или управлению снимками на естественном языке.",
			timestamp: new Date().toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		},
	]);
	const [inputQuery, setInputQuery] = useState("");
	const [isBusy, setIsBusy] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const activeToothStore = useAppStore((s) => s.activeTooth);
	const [contextPatientId, setContextPatientId] = useState<string | null>(
		initialPatientId || null,
	);
	const [contextToothNumber, setContextToothNumber] = useState<
		number | string | null
	>(initialToothNumber || activeToothStore || null);

	const abortControllerRef = useRef<AbortController | null>(null);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		if (isOpen) {
			scrollToBottom();
			textareaRef.current?.focus();
		}
	}, [isOpen, scrollToBottom]);

	useEffect(() => {
		if (initialToothNumber !== undefined) {
			setContextToothNumber(initialToothNumber);
		} else if (activeToothStore) {
			setContextToothNumber(activeToothStore);
		}
	}, [initialToothNumber, activeToothStore]);

	const closeCockpit = useCallback(() => {
		if (propOnClose) {
			propOnClose();
		} else {
			setInternalOpen(false);
		}
	}, [propOnClose]);

	const openCockpit = useCallback(
		(ctx?: {
			patientId?: string;
			toothNumber?: number | string | null;
			prompt?: string;
		}) => {
			if (ctx?.patientId) setContextPatientId(ctx.patientId);
			if (ctx?.toothNumber !== undefined)
				setContextToothNumber(ctx.toothNumber);
			setInternalOpen(true);
			if (ctx?.prompt) {
				setInputQuery(ctx.prompt);
			}
		},
		[],
	);

	// Global window and custom event registration
	useEffect(() => {
		window.__denteAgentCockpit = {
			open: (ctx) => openCockpit(ctx),
			close: closeCockpit,
			toggle: () => setInternalOpen((prev) => !prev),
			sendQuery: (query: string) => {
				openCockpit();
				handleSend(query);
			},
		};

		const handleCustomOpen = (e: Event) => {
			const custom = e as CustomEvent<{
				patientId?: string;
				toothNumber?: number | string | null;
				prompt?: string;
			}>;
			openCockpit(custom.detail);
		};

		window.addEventListener("dente:open-agent-cockpit", handleCustomOpen);
		return () => {
			window.removeEventListener("dente:open-agent-cockpit", handleCustomOpen);
		};
	}, [openCockpit, closeCockpit]);

	// Escape key handler
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeCockpit();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, closeCockpit]);

	const handleAbort = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setIsBusy(false);
		setMessages((prev) =>
			prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
		);
	}, []);

	const handleSend = useCallback(
		async (textToSend?: string) => {
			const query = (textToSend ?? inputQuery).trim();
			if (!query || isBusy) return;

			setInputQuery("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}

			const userMsgId = `user-${Date.now()}`;
			const assistantMsgId = `assistant-${Date.now()}`;
			const timeStr = new Date().toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});

			const userMsg: AgentChatMessage = {
				id: userMsgId,
				role: "user",
				text: query,
				timestamp: timeStr,
			};

			const assistantPlaceholder: AgentChatMessage = {
				id: assistantMsgId,
				role: "assistant",
				text: "",
				streaming: true,
				toolCalls: [],
				timestamp: timeStr,
			};

			setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
			setIsBusy(true);

			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			const token = readDenteClinicToken() || readDenteStaffToken() || "";
			const payload = {
				conversationId: `agent_conv_${Date.now()}`,
				message: query,
				content: query,
				patientId: contextPatientId ?? undefined,
				toothNumber: contextToothNumber ?? undefined,
				isWorkstation: isWorkstationMode,
				uiContext: {
					toothNumber: contextToothNumber,
					patientId: contextPatientId,
					isWorkstation: isWorkstationMode,
				},
			};

			// Try primary /api/agent/chat, fallback to /api/v1/copilot/chat
			const endpoints = ["/api/agent/chat", "/api/v1/copilot/chat"];

			let response: Response | null = null;
			for (const ep of endpoints) {
				try {
					const res = await fetch(ep, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: token ? `Bearer ${token}` : "",
						},
						body: JSON.stringify(payload),
						signal: abortController.signal,
					});
					if (res.ok && res.body) {
						response = res;
						break;
					}
				} catch (err: unknown) {
					if ((err as Error).name === "AbortError") {
						return;
					}
				}
			}

			if (!response || !response.body) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId
							? {
									...m,
									streaming: false,
									text: "⚠️ Не удалось связаться с сервером ассистента. Проверьте сетевое подключение.",
								}
							: m,
					),
				);
				setIsBusy(false);
				return;
			}

			try {
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					let idx = buffer.indexOf("\n\n");

					while (idx >= 0) {
						const frame = buffer.slice(0, idx);
						buffer = buffer.slice(idx + 2);

						let eventName = "message";
						let dataStr = "";

						for (const line of frame.split("\n")) {
							if (line.startsWith("event:")) {
								eventName = line.slice(6).trim();
							} else if (line.startsWith("data:")) {
								dataStr += line.slice(5).trim();
							}
						}

						if (dataStr) {
							let parsedData: Record<string, unknown> = {};
							try {
								parsedData = JSON.parse(dataStr);
							} catch {
								parsedData = { text: dataStr };
							}

							if (eventName === "token" || eventName === "delta") {
								const chunkText = String(
									parsedData.text ?? parsedData.delta ?? "",
								);
								setMessages((prev) =>
									prev.map((m) =>
										m.id === assistantMsgId
											? { ...m, text: m.text + chunkText }
											: m,
									),
								);
							} else if (
								eventName === "tool_call_started" ||
								eventName === "tool_call" ||
								eventName === "tool_start"
							) {
								const toolName = String(
									parsedData.name ?? parsedData.tool ?? "tool",
								);
								const meta = getHumanToolMeta(toolName);
								const newTool: ToolCallItem = {
									name: toolName,
									title: meta.title,
									isWorkstation: meta.isWorkstation,
									iconName: meta.iconName,
									args: (parsedData.arguments ??
										parsedData.args ??
										{}) as Record<string, unknown>,
									status: "running",
								};
								setMessages((prev) =>
									prev.map((m) => {
										if (m.id !== assistantMsgId) return m;
										const existing = m.toolCalls || [];
										return {
											...m,
											toolCalls: [...existing, newTool],
										};
									}),
								);
							} else if (
								eventName === "tool_result" ||
								eventName === "tool_done"
							) {
								const toolName = String(parsedData.name ?? "");
								setMessages((prev) =>
									prev.map((m) => {
										if (m.id !== assistantMsgId) return m;
										const tools = (m.toolCalls || []).map((t) => {
											if (t.name === toolName || !toolName) {
												return {
													...t,
													status: (parsedData.status === "failed"
														? "failed"
														: "done") as "done" | "failed",
													result: parsedData.result,
												};
											}
											return t;
										});
										return { ...m, toolCalls: tools };
									}),
								);
							} else if (
								eventName === "done" ||
								eventName === "finish" ||
								eventName === "final"
							) {
								setMessages((prev) =>
									prev.map((m) =>
										m.id === assistantMsgId
											? { ...m, streaming: false }
											: m,
									),
								);
							}
						}

						idx = buffer.indexOf("\n\n");
					}
				}
			} catch (err: unknown) {
				if ((err as Error).name !== "AbortError") {
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantMsgId
								? {
										...m,
										streaming: false,
										text: `${m.text}\n\n⚠️ Прервано: ${(err as Error).message}`,
									}
								: m,
						),
					);
				}
			} finally {
				setIsBusy(false);
				abortControllerRef.current = null;
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId ? { ...m, streaming: false } : m,
					),
				);
			}
		},
		[inputQuery, isBusy, contextPatientId, contextToothNumber, isWorkstationMode],
	);

	const handleApplyToDiary = useCallback((text: string) => {
		const patch = parseSoapSectionsFromText(text);

		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			complaint: patch.complaint || prev.complaint || "",
			anamnesis: patch.anamnesis || prev.anamnesis || "",
			objectiveStatus: patch.objectiveStatus || prev.objectiveStatus || "",
			treatmentPlan: patch.treatmentPlan || prev.treatmentPlan || "",
			recommendations: patch.recommendations || prev.recommendations || "",
			diagnosis: patch.diagnosis || prev.diagnosis || "",
		}));

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", { detail: patch }),
			);
		}

		showToast("Запись приёма перенесена в дневник", "success");
	}, []);

	const handleCopyText = useCallback((id: string, text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopiedId(id);
			setTimeout(() => setCopiedId(null), 2000);
			showToast("Текст скопирован в буфер обмена", "success");
		});
	}, []);

	const handleClearChat = useCallback(() => {
		handleAbort();
		setMessages([
			{
				id: `welcome-${Date.now()}`,
				role: "assistant",
				text: "Диалог очищен. Задайте новый клинический вопрос или дайте поручение.",
				timestamp: new Date().toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			},
		]);
	}, [handleAbort]);

	const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputQuery(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const renderToolIcon = (iconName?: ToolMeta["iconName"]) => {
		switch (iconName) {
			case "monitor":
				return <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
			case "folder":
				return <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
			case "camera":
				return <Camera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
			case "pill":
				return <Pill className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
			case "file":
				return <FileText className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />;
			case "stethoscope":
				return <Stethoscope className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />;
			default:
				return <Wrench className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />;
		}
	};

	if (typeof document === "undefined") return null;

	return createPortal(
		<aside
			className={`dental-agent-cockpit-portal ${isOpen ? "is-active" : ""}`}
			aria-label="Шторка клинического ассистента"
			aria-hidden={!isOpen}
		>
			{/* 1. Backdrop */}
			<div
				className="dental-agent-cockpit-backdrop"
				onClick={closeCockpit}
				tabIndex={-1}
				aria-hidden="true"
			/>

			{/* 2. Drawer Surface */}
			<div
				className={`dental-agent-cockpit-drawer ${isOpen ? "is-open" : ""}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="agent-cockpit-title"
			>
				{/* 3. Header */}
				<header className="dental-agent-cockpit-header">
					<div className="cockpit-header-left">
						<div className="cockpit-header-avatar" aria-hidden="true">
							<Bot className="w-5 h-5" />
						</div>
						<div className="cockpit-header-titles">
							<h2 className="cockpit-header-title" id="agent-cockpit-title">
								Клинический ассистент
							</h2>
							<div className="cockpit-header-status">
								<span className="cockpit-status-dot" aria-hidden="true" />
								<span>{isBusy ? "Анализирует..." : "В сети"}</span>
								<span className="cockpit-status-separator" aria-hidden="true">·</span>
								<span
									className={`cockpit-station-badge ${isWorkstationMode ? "is-workstation" : ""}`}
								>
									<span className="cockpit-station-badge-full">
										{isWorkstationMode ? "🖥️ Локальная станция" : "🌐 Веб-клиент"}
									</span>
									<span className="cockpit-station-badge-short">
										{isWorkstationMode ? "🖥️ ПК" : "🌐 Веб"}
									</span>
								</span>
							</div>
						</div>
					</div>

					<div className="cockpit-header-actions">
						<button
							type="button"
							className="cockpit-icon-btn"
							onClick={handleClearChat}
							title="Очистить диалог"
							aria-label="Очистить диалог"
						>
							<RotateCcw className="w-4 h-4" />
						</button>
						<button
							type="button"
							className="cockpit-icon-btn"
							onClick={closeCockpit}
							title="Закрыть (Esc)"
							aria-label="Закрыть шторку"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</header>

				{/* 4. Active Clinical Context Strip */}
				{(contextPatientId || contextToothNumber) && (
					<div className="cockpit-context-strip" aria-label="Контекст приёма">
						{contextToothNumber && (
							<span className="cockpit-context-pill">
								Зуб: <strong>{contextToothNumber}</strong>
							</span>
						)}
						{contextPatientId && (
							<span className="cockpit-context-pill">
								Пациент ID: <strong>{contextPatientId.slice(0, 8)}...</strong>
							</span>
						)}
					</div>
				)}

				{/* 5. Messages Body */}
				<div className="dental-agent-cockpit-body">
					{messages.length === 1 && (
						<div className="cockpit-welcome-card">
							<div className="cockpit-welcome-badge">
								<Sparkles className="w-3.5 h-3.5" />
								<span>Автономный клинический интеллект</span>
							</div>
							<h3 className="cockpit-welcome-title">Чем я могу помочь?</h3>
							<p className="cockpit-welcome-desc">
								Напишите вопрос свободным текстом. Ассистент сам обратится к
								зубной формуле, проверит соматику, рассчитает дозировку или
								откроет снимки визиографа.
							</p>

							<div className="cockpit-hint-list">
								<button
									type="button"
									className="cockpit-hint-item"
									onClick={() =>
										handleSend(
											"Рассчитай безопасную дозу и количество карпул 4% артикаина для пациента",
										)
									}
								>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>💉 Рассчитать дозировку анестетика по весу</span>
								</button>
								<button
									type="button"
									className="cockpit-hint-item"
									onClick={() =>
										handleSend(
											"Сформируй протокол лечения кариеса по стандарту СтАР для дневника 043/у",
										)
									}
								>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>📋 Сформировать протокол 043/у для дневника</span>
								</button>
								<button
									type="button"
									className="cockpit-hint-item"
									onClick={() =>
										handleSend(
											"Проверь соматические риски и лекарственные взаимодействия",
										)
									}
								>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>⚠️ Проверить соматические риски и стоп-факторы</span>
								</button>
								<button
									type="button"
									className="cockpit-hint-item"
									onClick={() =>
										handleSend(
											"Открой снимки визиографа и папку снимков текущего пациента",
										)
									}
								>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>🖼️ Снимки / Визиограф (управление ПК)</span>
								</button>
							</div>
						</div>
					)}

					{messages.map((msg) => {
						const isAssistant = msg.role === "assistant";
						const hasProtocol = isAssistant && isClinicalProtocol(msg.text);

						return (
							<div
								key={msg.id}
								className={`cockpit-message-row ${isAssistant ? "is-assistant" : "is-user"}`}
							>
								<div className="cockpit-message-bubble">
									{isAssistant ? (
										<>
											<CopilotMarkdown text={msg.text} />
											{msg.streaming && (
												<span className="inline-block w-2 h-4 ml-1 bg-[var(--teal)] animate-pulse" />
											)}

											{/* ReAct Tool Transparency Accordion */}
											{msg.toolCalls && msg.toolCalls.length > 0 && (
												<details className="cockpit-tools-accordion" open>
													<summary className="cockpit-tools-summary">
														<span className="cockpit-tools-title">
															<Wrench className="w-3.5 h-3.5 text-[var(--teal)]" />
															<span>Использованные инструменты</span>
														</span>
														<span className="cockpit-tools-count">
															{msg.toolCalls.length}
														</span>
													</summary>
													<div className="cockpit-tools-list">
														{msg.toolCalls.map((t, idx) => (
															<div
																key={`${t.name}-${idx}`}
																className="cockpit-tool-item"
															>
																<div className="cockpit-tool-item-info">
																	{renderToolIcon(t.iconName)}
																	<span>{t.title}</span>
																</div>
																<span
																	className={`cockpit-tool-status-badge is-${t.status}`}
																>
																	{t.status === "running"
																		? "Выполняется..."
																		: t.status === "done"
																			? "Выполнено"
																			: "Ошибка"}
																</span>
															</div>
														))}
													</div>
												</details>
											)}

											{/* Action Bar on Completed Messages */}
											{!msg.streaming && msg.text && (
												<div className="cockpit-message-actions">
													{hasProtocol && (
														<button
															type="button"
															className="cockpit-action-btn is-primary"
															onClick={() => handleApplyToDiary(msg.text)}
															title="Вставить в дневник амбулаторной карты"
														>
															<ClipboardCheck className="w-3.5 h-3.5" />
															<span>Вставить в дневник</span>
														</button>
													)}

													<button
														type="button"
														className="cockpit-action-btn is-secondary"
														onClick={() => handleCopyText(msg.id, msg.text)}
														title="Копировать текст"
													>
														{copiedId === msg.id ? (
															<>
																<Check className="w-3.5 h-3.5 text-emerald-500" />
																<span>Скопировано</span>
															</>
														) : (
															<>
																<Copy className="w-3.5 h-3.5" />
																<span>Копировать</span>
															</>
														)}
													</button>
												</div>
											)}
										</>
									) : (
										<span>{msg.text}</span>
									)}
								</div>
								<span className="cockpit-message-time">{msg.timestamp}</span>
							</div>
						);
					})}
					<div ref={messagesEndRef} />
				</div>

				{/* 6. Pure Multiline Input Area (§12 & §245) */}
				<footer className="dental-agent-cockpit-footer">
					<div className="cockpit-input-box">
						<MessageSquare className="cockpit-input-icon" aria-hidden="true" />
						<textarea
							ref={textareaRef}
							className="cockpit-textarea"
							placeholder="Задайте клинический вопрос или дайте поручение..."
							value={inputQuery}
							onChange={handleTextareaInput}
							onKeyDown={handleKeyDown}
							rows={1}
							disabled={isBusy}
							aria-label="Ввод клинического запроса"
						/>
						{isBusy ? (
							<button
								type="button"
								className="cockpit-submit-btn"
								onClick={handleAbort}
								title="Остановить генерацию"
								aria-label="Остановить ответ"
							>
								<Square className="w-3.5 h-3.5" />
							</button>
						) : (
							<button
								type="button"
								className="cockpit-submit-btn"
								onClick={() => handleSend()}
								disabled={!inputQuery.trim()}
								title="Отправить (Enter)"
								aria-label="Отправить запрос"
							>
								<Send className="w-3.5 h-3.5" />
							</button>
						)}
					</div>
					<div className="cockpit-footer-hint">
						Enter для отправки · Shift+Enter для новой строки
					</div>
				</footer>
			</div>
		</aside>,
		document.body,
	);
};

export default DentalAgentCockpit;
