import {
	Activity,
	AlertCircle,
	ArrowRight,
	Building2,
	Check,
	Clock,
	Copy,
	CreditCard,
	Globe,
	History,
	Phone,
	PhoneCall,
	PhoneForwarded,
	PhoneIncoming,
	Play,
	RefreshCw,
	Send,
	Server,
	Shield,
	Sparkles,
	Trash2,
	User,
	UserCheck,
	UserPlus,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import {
	type CallHistoryItem,
	formatPhoneDisplay,
	type IncomingCallPayload,
	normalizePhoneDigits,
	type TelephonyCallStatus,
	type TelephonyProvider,
	useTelephonyStore,
} from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export function TelephonySimulatorModal() {
	const isSimulatorOpen = useTelephonyStore((s) => s.isSimulatorOpen);
	const closeSimulator = useTelephonyStore((s) => s.closeSimulator);
	const triggerIncomingCall = useTelephonyStore((s) => s.triggerIncomingCall);
	const callHistory = useTelephonyStore((s) => s.callHistory);
	const clearHistory = useTelephonyStore((s) => s.clearHistory);

	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;

	const [provider, setProvider] = useState<TelephonyProvider>("mango");
	const [callEvent, setCallEvent] = useState<TelephonyCallStatus>("ringing");
	const [callerPhone, setCallerPhone] = useState("+7 (916) 450-20-30");
	const [callerName, setCallerName] = useState("Иванов Иван Иванович");
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
		null,
	);
	const [targetDid, setTargetDid] = useState("+7 (495) 789-00-11");
	const [callId, setCallId] = useState(
		() => `mango-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
	);
	const [durationSeconds, setDurationSeconds] = useState(45);
	const [activeTab, setActiveTab] = useState<"builder" | "payload" | "history">(
		"builder",
	);
	const [isSendingWebhook, setIsSendingWebhook] = useState(false);
	const [copiedPayload, setCopiedPayload] = useState(false);

	// Regenerate call ID
	const regenerateCallId = () => {
		const prefix =
			provider === "mango"
				? "mango"
				: provider === "uis"
					? "uis"
					: provider === "asterisk"
						? "ast"
						: "zad";
		setCallId(`${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
	};

	// When patient selection changes, auto-populate phone & name
	const handleSelectPatient = (patientId: string) => {
		setSelectedPatientId(patientId);
		if (!patientId) {
			setCallerPhone("+7 (999) 000-11-22");
			setCallerName("Новый посетитель (Лид)");
			return;
		}
		const p = dashboard?.patients?.find((item) => item.id === patientId);
		if (p) {
			setCallerPhone(formatPhoneDisplay(p.phone) || "+7 (999) 123-45-67");
			setCallerName(p.fullName);
		}
	};

	// Quick Scenario Presets
	const applyScenario = (
		type: "lead" | "regular" | "debtor" | "insured" | "vip",
	) => {
		regenerateCallId();
		const patientsList = dashboard?.patients || [];

		if (type === "lead") {
			setSelectedPatientId(null);
			const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
			setCallerPhone(`+7 (926) ${randomDigits.toString().slice(0, 3)}-${randomDigits.toString().slice(3, 5)}-${randomDigits.toString().slice(5, 7)}`);
			setCallerName("Новый пациент (Сайт/Яндекс.Карты)");
			setCallEvent("ringing");
			showToast("Сценарий: Новый пациент (Лид)", "info");
			return;
		}

		if (type === "debtor") {
			const debtor =
				patientsList.find(
					(p) =>
						(Number(p.balanceRub) || 0) < 0 ||
						(dashboard?.patientInsights?.find((pi) => pi.patientId === p.id)
							?.balanceDueRub ?? 0) > 0,
				) || patientsList[0];

			if (debtor) {
				handleSelectPatient(debtor.id);
				setCallEvent("ringing");
				showToast(`Сценарий: Пациент с долгом (${debtor.fullName})`, "warning");
			} else {
				showToast("В клинике не найдены пациенты с задолженностью", "info");
			}
			return;
		}

		if (type === "insured") {
			const insured =
				patientsList.find(
					(p) =>
						p.administrativeProfile?.insurancePolicyNumber ||
						(p as { insuranceContractId?: string })?.insuranceContractId,
				) || patientsList[0];

			if (insured) {
				handleSelectPatient(insured.id);
				setCallEvent("ringing");
				showToast(`Сценарий: Пациент с ДМС (${insured.fullName})`, "info");
			} else {
				showToast("Пациенты с полисом ДМС не найдены", "info");
			}
			return;
		}

		if (type === "vip") {
			const vip =
				patientsList.find(
					(p) =>
						p.administrativeProfile?.loyaltyTier === "platinum" ||
						p.administrativeProfile?.loyaltyTier === "gold",
				) || patientsList[0];

			if (vip) {
				handleSelectPatient(vip.id);
				setCallEvent("ringing");
				showToast(`Сценарий: VIP Пациент (${vip.fullName})`, "info");
			} else {
				showToast("VIP пациенты не найдены", "info");
			}
			return;
		}

		// Regular patient
		const regular = patientsList[0];
		if (regular) {
			handleSelectPatient(regular.id);
			setCallEvent("ringing");
			showToast(`Сценарий: Пациент (${regular.fullName})`, "info");
		}
	};

	// Generate standard PBX webhook payload structure based on provider
	const rawWebhookPayload = useMemo(() => {
		const cleanCaller = normalizePhoneDigits(callerPhone);
		const e164Caller = cleanCaller.startsWith("7")
			? `+${cleanCaller}`
			: cleanCaller.startsWith("8")
				? `+7${cleanCaller.slice(1)}`
				: `+7${cleanCaller}`;
		const cleanTarget = normalizePhoneDigits(targetDid);
		const e164Target = cleanTarget.startsWith("7")
			? `+${cleanTarget}`
			: `+7${cleanTarget}`;

		if (provider === "mango") {
			return {
				event:
					callEvent === "ringing"
						? "call_started"
						: callEvent === "answered"
							? "connected"
							: "call_ended",
				call_id: callId,
				from: e164Caller,
				to: e164Target,
				caller_id: e164Caller,
				called_did: e164Target,
				call_start: Math.floor(Date.now() / 1000),
				duration: callEvent === "ended" ? durationSeconds : 0,
				talk_time: callEvent === "ended" ? durationSeconds : 0,
				link:
					callEvent === "ended"
						? `https://records.mango-office.ru/${callId}.mp3`
						: undefined,
			};
		}

		if (provider === "uis") {
			return {
				notification_name:
					callEvent === "ringing"
						? "ringing"
						: callEvent === "answered"
							? "answered"
							: "cdr",
				call_session_id: callId,
				from_number: e164Caller,
				to_number: e164Target,
				caller_number: e164Caller,
				called_number: e164Target,
				timestamp: Math.floor(Date.now() / 1000),
				duration_seconds: callEvent === "ended" ? durationSeconds : 0,
				recording_url:
					callEvent === "ended"
						? `https://uis.app/recordings/${callId}.wav`
						: undefined,
			};
		}

		if (provider === "asterisk") {
			return {
				event:
					callEvent === "ringing"
						? "dial-in"
						: callEvent === "answered"
							? "answered"
							: "hangup",
				uniqueid: callId,
				CallerIdNum: e164Caller,
				CalledIdNum: e164Target,
				from: e164Caller,
				to: e164Target,
				billsec: callEvent === "ended" ? durationSeconds : 0,
				timestamp: Math.floor(Date.now() / 1000),
				record_url:
					callEvent === "ended"
						? `https://pbx.clinic.local/monitor/${callId}.wav`
						: undefined,
			};
		}

		// Zadarma
		return {
			event:
				callEvent === "ringing"
					? "NOTIFY_START"
					: callEvent === "answered"
						? "NOTIFY_ANSWER"
						: "NOTIFY_END",
			caller_id: e164Caller,
			called_did: e164Target,
			call_id: callId,
			call_start: Math.floor(Date.now() / 1000),
			duration: callEvent === "ended" ? durationSeconds : 0,
			is_recorded: callEvent === "ended" ? 1 : 0,
			link:
				callEvent === "ended"
					? `https://api.zadarma.com/v1/record/${callId}`
					: undefined,
		};
	}, [provider, callEvent, callerPhone, targetDid, callId, durationSeconds]);

	// Simulate call locally inside Telephony Store
	const handleSimulateLocal = () => {
		const cleanCaller = normalizePhoneDigits(callerPhone);
		const e164Caller = cleanCaller.startsWith("7")
			? `+${cleanCaller}`
			: cleanCaller.startsWith("8")
				? `+7${cleanCaller.slice(1)}`
				: `+7${cleanCaller}`;

		triggerIncomingCall({
			phone: e164Caller,
			patientId: selectedPatientId,
			patientName: callerName,
			callId: callId,
			provider: provider,
			timestamp: new Date().toISOString(),
			status: callEvent,
			clinicPhone: targetDid,
		});

		showToast(
			`Симуляция звонка запущена (${provider.toUpperCase()}: ${formatPhoneDisplay(e164Caller)})`,
			"success",
		);
		closeSimulator();
	};

	// Send real HTTP Webhook POST to Fastify API endpoint
	const handleSendWebhook = async () => {
		setIsSendingWebhook(true);
		try {
			const res = await fetch("/api/telephony/webhook", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-webhook-secret": "dente-dev-secret",
				},
				body: JSON.stringify(rawWebhookPayload),
			});

			const json = await res.json().catch(() => ({}));
			if (res.ok) {
				showToast(
					"Вебхук успешно принят сервером Fastify и разослан по WebSocket!",
					"success",
				);
			} else {
				showToast(
					`Ответ сервера (${res.status}): ${json.message || json.error || "Ошибка"}`,
					"warning",
				);
				// Fallback to local trigger so user sees the UI popup immediately even if server webhook auth is strict
				handleSimulateLocal();
			}
		} catch (err) {
			showToast(
				"Сервер недоступен онлайн. Вызов симулирован в клиенте локально.",
				"info",
			);
			handleSimulateLocal();
		} finally {
			setIsSendingWebhook(false);
		}
	};

	const handleCopyPayload = () => {
		navigator.clipboard
			.writeText(JSON.stringify(rawWebhookPayload, null, 2))
			.then(() => {
				setCopiedPayload(true);
				setTimeout(() => setCopiedPayload(false), 2000);
			});
	};

	// Close on ESC
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isSimulatorOpen) {
				closeSimulator();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSimulatorOpen, closeSimulator]);

	if (!isSimulatorOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
			role="dialog"
			aria-modal="true"
			aria-labelledby="telephony-simulator-title"
			data-testid="telephony-simulator-modal"
		>
			<div className="relative w-full max-w-2xl bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] rounded-2xl border border-[var(--line,#334155)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line,#334155)] bg-[var(--paper-soft,rgba(30,41,59,0.5))]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
							<Server size={20} />
						</div>
						<div>
							<h2
								id="telephony-simulator-title"
								className="text-lg font-black tracking-tight flex items-center gap-2"
							>
								<span>Симулятор SIP-Телефонии</span>
								<span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-800/50">
									АТС Studio
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#94a3b8)]">
								Эмуляция входящих звонков и вебхуков Mango Telecom, UIS
								(CoMagic), Asterisk и Zadarma
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={closeSimulator}
						className="p-1.5 rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,rgba(255,255,255,0.08))] transition-colors"
						aria-label="Закрыть симулятор"
					>
						<X size={20} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--line,#334155)] bg-[var(--paper,#0f172a)]">
					<button
						type="button"
						onClick={() => setActiveTab("builder")}
						className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
							activeTab === "builder"
								? "border-teal-500 text-teal-400"
								: "border-transparent text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
						}`}
					>
						<PhoneIncoming size={14} />
						<span>Конструктор вызова</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("payload")}
						className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
							activeTab === "payload"
								? "border-teal-500 text-teal-400"
								: "border-transparent text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
						}`}
					>
						<Globe size={14} />
						<span>JSON Вебхук</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("history")}
						className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
							activeTab === "history"
								? "border-teal-500 text-teal-400"
								: "border-transparent text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
						}`}
					>
						<History size={14} />
						<span>История ({callHistory.length})</span>
					</button>
				</div>

				{/* Body Content */}
				<div className="p-6 overflow-y-auto space-y-5 flex-1">
					{activeTab === "builder" && (
						<>
							{/* Quick Scenarios */}
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#94a3b8)] mb-2 flex items-center gap-1.5">
									<Sparkles size={13} className="text-amber-400" />
									Быстрые сценарии для демонстрации:
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<button
										type="button"
										onClick={() => applyScenario("lead")}
										className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-slate-800 border border-[var(--line,#334155)] hover:border-amber-500/50 text-left transition-all group"
									>
										<div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-0.5">
											<UserPlus size={13} />
											<span>Новый лид</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#94a3b8)] leading-tight">
											Неизвестный номер, автосоздание
										</p>
									</button>

									<button
										type="button"
										onClick={() => applyScenario("debtor")}
										className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-slate-800 border border-[var(--line,#334155)] hover:border-rose-500/50 text-left transition-all group"
									>
										<div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs mb-0.5">
											<CreditCard size={13} />
											<span>С долгом</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#94a3b8)] leading-tight">
											Предупреждение о балансе
										</p>
									</button>

									<button
										type="button"
										onClick={() => applyScenario("insured")}
										className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-slate-800 border border-[var(--line,#334155)] hover:border-cyan-500/50 text-left transition-all group"
									>
										<div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs mb-0.5">
											<Shield size={13} />
											<span>Полис ДМС</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#94a3b8)] leading-tight">
											Страховой пациент
										</p>
									</button>

									<button
										type="button"
										onClick={() => applyScenario("vip")}
										className="p-2.5 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-slate-800 border border-[var(--line,#334155)] hover:border-emerald-500/50 text-left transition-all group"
									>
										<div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-0.5">
											<Zap size={13} />
											<span>VIP Клиент</span>
										</div>
										<p className="text-[11px] text-[var(--muted,#94a3b8)] leading-tight">
											Высокий уровень лояльности
										</p>
									</button>
								</div>
							</div>

							{/* Provider & Event Picker */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1.5">
										Провайдер АТС:
									</label>
									<div className="grid grid-cols-2 gap-2">
										{(
											[
												{ id: "mango", label: "Mango Telecom" },
												{ id: "uis", label: "UIS / CoMagic" },
												{ id: "asterisk", label: "Asterisk PBX" },
												{ id: "zadarma", label: "Zadarma" },
											] as const
										).map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => {
													setProvider(p.id);
													regenerateCallId();
												}}
												className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
													provider === p.id
														? "bg-teal-500/10 border-teal-500 text-teal-400"
														: "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
												}`}
											>
												<span>{p.label}</span>
												{provider === p.id && <Check size={14} />}
											</button>
										))}
									</div>
								</div>

								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1.5">
										Событие вызова (PBX Event):
									</label>
									<div className="grid grid-cols-3 gap-2">
										{(
											[
												{ id: "ringing", label: "Звонит (Ringing)" },
												{ id: "answered", label: "Отвечен" },
												{ id: "ended", label: "Завершён" },
											] as const
										).map((ev) => (
											<button
												key={ev.id}
												type="button"
												onClick={() => setCallEvent(ev.id)}
												className={`px-2 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
													callEvent === ev.id
														? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
														: "bg-[var(--paper-soft,#1e293b)] border-[var(--line,#334155)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
												}`}
											>
												{ev.label}
											</button>
										))}
									</div>
								</div>
							</div>

							{/* Patient Selection & Phone Configuration */}
							<div className="p-4 rounded-xl bg-[var(--paper-soft,rgba(30,41,59,0.5))] border border-[var(--line,#334155)] space-y-4">
								<div>
									<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1">
										Выбрать пациента из базы клиники:
									</label>
									<select
										value={selectedPatientId || ""}
										onChange={(e) => handleSelectPatient(e.target.value)}
										className="w-full px-3 py-2 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
									>
										<option value="">
											-- Неизвестный номер (создать новый лид) --
										</option>
										{dashboard?.patients?.map((p) => (
											<option key={p.id} value={p.id}>
												{p.fullName} ({formatPhoneDisplay(p.phone)})
												{Number(p.balanceRub) < 0
													? ` — Долг: ${Math.abs(p.balanceRub)} ₽`
													: ""}
											</option>
										))}
									</select>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1">
											Номер звонящего (Caller Number):
										</label>
										<input
											type="text"
											value={callerPhone}
											onChange={(e) => setCallerPhone(e.target.value)}
											className="w-full px-3 py-2 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
											placeholder="+7 (999) 123-45-67"
										/>
									</div>

									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1">
											ФИО звонящего:
										</label>
										<input
											type="text"
											value={callerName}
											onChange={(e) => setCallerName(e.target.value)}
											className="w-full px-3 py-2 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
											placeholder="Иванов Иван Иванович"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-semibold text-[var(--muted,#94a3b8)] mb-1">
											Номер клиники (Called DID):
										</label>
										<input
											type="text"
											value={targetDid}
											onChange={(e) => setTargetDid(e.target.value)}
											className="w-full px-3 py-2 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
										/>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<label className="text-xs font-semibold text-[var(--muted,#94a3b8)]">
												Call Session ID:
											</label>
											<button
												type="button"
												onClick={regenerateCallId}
												className="text-[11px] text-teal-400 hover:underline inline-flex items-center gap-1"
											>
												<RefreshCw size={10} /> обновить
											</button>
										</div>
										<input
											type="text"
											value={callId}
											onChange={(e) => setCallId(e.target.value)}
											className="w-full px-3 py-2 rounded-xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
										/>
									</div>
								</div>
							</div>
						</>
					)}

					{activeTab === "payload" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs text-[var(--muted,#94a3b8)]">
									Сформированный JSON вебхука для эндпоинта{" "}
									<code>/api/telephony/webhook</code>:
								</span>
								<button
									type="button"
									onClick={handleCopyPayload}
									className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] hover:border-teal-500 text-teal-400 inline-flex items-center gap-1.5 transition-all"
								>
									{copiedPayload ? (
										<>
											<Check size={13} /> Скопировано!
										</>
									) : (
										<>
											<Copy size={13} /> Скопировать JSON
										</>
									)}
								</button>
							</div>

							<pre className="p-4 rounded-xl bg-slate-950 border border-[var(--line,#334155)] text-emerald-400 text-xs font-mono overflow-x-auto max-h-[300px]">
								{JSON.stringify(rawWebhookPayload, null, 2)}
							</pre>
						</div>
					)}

					{activeTab === "history" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-xs text-[var(--muted,#94a3b8)]">
									Журнал недавних звонков в этой сессии:
								</span>
								{callHistory.length > 0 && (
									<button
										type="button"
										onClick={clearHistory}
										className="text-xs text-rose-400 hover:underline inline-flex items-center gap-1"
									>
										<Trash2 size={12} /> Очистить историю
									</button>
								)}
							</div>

							{callHistory.length === 0 ? (
								<div className="text-center py-8 text-[var(--muted,#94a3b8)] text-xs">
									История вызовов пуста. Запустите симуляцию звонка.
								</div>
							) : (
								<div className="space-y-2">
									{callHistory.map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] text-xs"
										>
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
													<PhoneIncoming size={16} />
												</div>
												<div>
													<div className="font-bold text-[var(--ink,#f8fafc)]">
														{item.patientName || "Неизвестный"}
													</div>
													<div className="text-[11px] text-[var(--muted,#94a3b8)] font-mono">
														{formatPhoneDisplay(item.phone)} ·{" "}
														{item.provider?.toUpperCase()}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-0.5 rounded text-[10px] font-bold ${
														item.status === "answered"
															? "bg-emerald-950 text-emerald-300 border border-emerald-800"
															: item.status === "rejected"
																? "bg-rose-950 text-rose-300 border border-rose-800"
																: "bg-amber-950 text-amber-300 border border-amber-800"
													}`}
												>
													{item.status === "answered"
														? "Принят"
														: item.status === "rejected"
															? "Отклонён"
															: "Входящий"}
												</span>
												{item.actionTaken && (
													<span className="text-[10px] text-[var(--muted,#94a3b8)] bg-slate-800 px-1.5 py-0.5 rounded">
														{item.actionTaken}
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Modal Footer Actions */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--line,#334155)] bg-[var(--paper-soft,rgba(30,41,59,0.5))]">
					<button
						type="button"
						onClick={closeSimulator}
						className="px-4 py-2 rounded-xl bg-transparent hover:bg-[var(--paper-soft,rgba(255,255,255,0.06))] text-xs font-semibold text-[var(--muted,#94a3b8)] transition-all"
					>
						Закрыть
					</button>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleSendWebhook}
							disabled={isSendingWebhook}
							className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[var(--ink,#f8fafc)] text-xs font-bold border border-[var(--line,#334155)] inline-flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
							title="Отправить реальный POST вебхук на бэкенд Fastify"
						>
							<Send size={14} className="text-teal-400" />
							<span>
								{isSendingWebhook ? "Отправка..." : "Отправить на Webhook"}
							</span>
						</button>

						<button
							type="button"
							onClick={handleSimulateLocal}
							className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-lg shadow-teal-950/50 inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
						>
							<Play size={14} />
							<span>Запустить звонок в UI</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
