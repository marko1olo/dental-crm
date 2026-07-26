import {
	AlertTriangle,
	BookOpen,
	CheckSquare,
	PhoneIncoming,
	ShieldAlert,
	User,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useWebsocket } from "../hooks/useWebsocket";
import { useAppStore } from "../store/appStore";
import { usePatientStore } from "../store/patientStore";
import { showToast } from "./GlobalToast";

const WS_URL =
	import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule";

export function IncomingCallToast() {
	const [incomingCall, setIncomingCall] = useState<{
		phone: string;
		patientName: string;
		patientId: string | null;
		timestamp: string;
	} | null>(null);

	let ctx: any = null;
	try { ctx = useAppLogicContext(); } catch { /* rendered outside AppLogic provider (e.g. isolated preview): degrade to prop/null */ }
	const dashboard = ctx?.dashboard;
	const { lastMessage } = useWebsocket(WS_URL);

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	useEffect(() => {
		if (
			lastMessage?.type === "TELEPHONY_INCOMING_CALL" &&
			lastMessage.payload
		) {
			setIncomingCall(lastMessage.payload);

			// Auto-hide after 35 seconds
			const timer = setTimeout(() => {
				setIncomingCall(null);
			}, 35000);
			return () => clearTimeout(timer);
		}
	}, [lastMessage]);

	if (!incomingCall) return null;

	// Resolve patient details for smart indicators
	const patient = incomingCall.patientId
		? dashboard?.patients?.find((p: any) => p.id === incomingCall.patientId)
		: null;

	const hasDms = Boolean(
		patient?.insuranceContractId ||
			patient?.administrativeProfile?.insuranceContractId,
	);
	const hasNotes = Boolean(patient?.notes?.trim());
	const noShowRisk = patient?.noShowRisk;

	return (
		<div 
			className="fixed bottom-6 right-6 z-[999999] flex w-96 flex-col gap-3 rounded-xl border-l-4 border-[var(--teal-500,#14b8a6)] bg-[var(--paper,#1e293b)] text-[var(--ink,#f8fafc)] shadow-2xl p-5 border border-[var(--line,#334155)] animate-slide-in"
			role="dialog"
			aria-label="Уведомление о входящем звонке"
		>
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2 text-[var(--teal-500,#14b8a6)]">
					<PhoneIncoming size={18} className="animate-pulse" />
					<span className="text-xs font-bold uppercase tracking-wider">
						Входящий звонок
					</span>
				</div>
				<button
					type="button"
					onClick={() => setIncomingCall(null)}
					className="text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] rounded-md p-1"
					aria-label="Закрыть уведомление"
				>
					<X size={16} />
				</button>
			</div>

			{/* Caller Info */}
			<div>
				<div className="text-lg font-bold text-[var(--ink,#f8fafc)] mb-0.5">
					{incomingCall.phone}
				</div>
				<div className="flex items-center gap-1.5 text-sm text-[var(--muted,#94a3b8)]">
					<User size={14} className="text-[var(--muted,#94a3b8)]" />
					<span className="font-semibold text-[var(--ink,#f8fafc)]">
						{incomingCall.patientId
							? incomingCall.patientName
							: "Неизвестный номер"}
					</span>
				</div>
			</div>

			{/* Telephony Script & Reminders */}
			<div className="mt-2 bg-[var(--paper-soft,rgba(30,41,59,0.6))] rounded-lg p-3 border border-[var(--line,rgba(51,65,85,0.4))] space-y-2 text-xs">
				<div className="flex items-center gap-1.5 text-[var(--teal-500,#14b8a6)] font-semibold mb-1">
					<BookOpen size={13} />
					<span>Скрипт разговора / Памятка:</span>
				</div>

				<ul className="space-y-1.5 text-[var(--ink,#f8fafc)] list-none pl-0">
					<li className="flex items-start gap-1">
						<span className="text-[var(--teal-500,#14b8a6)] font-bold">•</span>
						<span>
							Уточните причину обращения (острая боль, осмотр, плановое лечение)
						</span>
					</li>

					{/* Dynamic Alerts */}
					{!incomingCall.patientId && (
						<li className="flex items-start gap-1 text-[var(--warn-500,#f59e0b)] bg-[rgba(245,158,11,0.1)] p-1.5 rounded border border-[rgba(245,158,11,0.2)] mt-1">
							<AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
							<span>
								Новый пациент. Предложите акцию на первичную консультацию!
							</span>
						</li>
					)}

					{incomingCall.patientId && !hasDms && (
						<li className="flex items-start gap-1 text-[var(--teal-500,#14b8a6)]">
							<span className="text-[var(--teal-500,#14b8a6)] font-bold">•</span>
							<span>
								Уточните наличие полиса ДМС (клиника работает со страховыми)
							</span>
						</li>
					)}

					{incomingCall.patientId && noShowRisk && (
						<li className="flex items-start gap-1 text-[var(--danger,#ef4444)] bg-[rgba(239,68,68,0.1)] p-1.5 rounded border border-[rgba(239,68,68,0.2)] mt-1">
							<ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
							<span>Пациент из зоны риска отмен. Подтвердите явку дважды!</span>
						</li>
					)}

					{incomingCall.patientId && hasNotes && (
						<li className="flex items-start gap-1 text-[var(--ink,#f8fafc)] italic border-t border-[var(--line,#334155)] pt-1.5 mt-1.5">
							<span className="font-semibold text-[var(--muted,#94a3b8)] not-italic">
								Заметка:
							</span>
							<span>"{patient.notes}"</span>
						</li>
					)}
				</ul>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-2 mt-2">
				{incomingCall.patientId ? (
					<button
						type="button"
						onClick={() => {
							setSelectedPatientId(incomingCall.patientId);
							setCurrentView("patients");
							setIncomingCall(null);
						}}
						aria-label="Открыть карту пациента"
						className="flex-1 rounded-lg bg-[var(--brand-500,#0f766e)] hover:bg-[var(--brand-600,#0e7490)] active:scale-[0.98] px-3 py-2 text-xs font-bold text-white text-center transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
					>
						Открыть карту пациента
					</button>
				) : (
					<button
						type="button"
						onClick={() => {
							setCurrentView("patients");
							setIncomingCall(null);
							showToast(
								"Добавьте нового пациента с номером " + incomingCall.phone,
								"info",
							);
						}}
						aria-label="Зарегистрировать нового пациента"
						className="flex-1 rounded-lg bg-[var(--brand-500,#0f766e)] hover:bg-[var(--brand-600,#0e7490)] active:scale-[0.98] px-3 py-2 text-xs font-bold text-white text-center transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
					>
						Зарегистрировать
					</button>
				)}
			</div>
		</div>
	);
}
