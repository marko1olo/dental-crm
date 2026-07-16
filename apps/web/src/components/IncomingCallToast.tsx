import { AlertTriangle, BookOpen, CheckSquare, PhoneIncoming, ShieldAlert, User, X } from "lucide-react";
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

	const { lastMessage } = useWebsocket(WS_URL);
	const { dashboard } = useAppLogicContext();

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

	const hasDms = Boolean(patient?.administrativeProfile?.insuranceContractId);
	const hasNotes = Boolean(patient?.notes?.trim());
	const noShowRisk = patient?.noShowRisk;

	return (
		<div className="fixed bottom-6 right-6 z-[999999] flex w-96 flex-col gap-3 rounded-xl border-l-4 border-teal-500 bg-[#1e293b] text-slate-100 shadow-2xl p-5 border border-slate-700/80 animate-slide-in">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2 text-teal-400">
					<PhoneIncoming size={18} className="animate-pulse" />
					<span className="text-xs font-bold uppercase tracking-wider">Входящий звонок</span>
				</div>
				<button
					onClick={() => setIncomingCall(null)}
					className="text-slate-400 hover:text-slate-200 transition-colors"
					aria-label="Закрыть уведомление"
				>
					<X size={16} />
				</button>
			</div>

			{/* Caller Info */}
			<div>
				<div className="text-lg font-bold text-slate-100 mb-0.5">
					{incomingCall.phone}
				</div>
				<div className="flex items-center gap-1.5 text-sm text-slate-400">
					<User size={14} className="text-slate-500" />
					<span className="font-semibold text-slate-300">
						{incomingCall.patientId ? incomingCall.patientName : "Неизвестный номер"}
					</span>
				</div>
			</div>

			{/* Telephony Script & Reminders */}
			<div className="mt-2 bg-slate-800/60 rounded-lg p-3 border border-slate-700/40 space-y-2 text-xs">
				<div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
					<BookOpen size={13} />
					<span>Скрипт разговора / Памятка:</span>
				</div>

				<ul className="space-y-1.5 text-slate-300 list-none pl-0">
					<li className="flex items-start gap-1">
						<span className="text-teal-500 font-bold">•</span>
						<span>Уточните причину обращения (острая боль, осмотр, плановое лечение)</span>
					</li>
					
					{/* Dynamic Alerts */}
					{!incomingCall.patientId && (
						<li className="flex items-start gap-1 text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 mt-1">
							<AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
							<span>Новый пациент. Предложите акцию на первичную консультацию!</span>
						</li>
					)}

					{incomingCall.patientId && !hasDms && (
						<li className="flex items-start gap-1 text-teal-400">
							<span className="text-teal-500 font-bold">•</span>
							<span>Уточните наличие полиса ДМС (клиника работает со страховыми)</span>
						</li>
					)}

					{incomingCall.patientId && noShowRisk && (
						<li className="flex items-start gap-1 text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20 mt-1">
							<ShieldAlert size={12} className="mt-0.5 flex-shrink-0" />
							<span>Пациент из зоны риска отмен. Подтвердите явку дважды!</span>
						</li>
					)}

					{incomingCall.patientId && hasNotes && (
						<li className="flex items-start gap-1 text-slate-300 italic border-t border-slate-700/40 pt-1.5 mt-1.5">
							<span className="font-semibold text-slate-400 not-italic">Заметка:</span>
							<span>"{patient.notes}"</span>
						</li>
					)}
				</ul>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-2 mt-2">
				{incomingCall.patientId ? (
					<button
						onClick={() => {
							setSelectedPatientId(incomingCall.patientId);
							setCurrentView("patients");
							setIncomingCall(null);
						}}
						className="flex-1 rounded-lg bg-teal-500 hover:bg-teal-600 active:bg-teal-700 px-3 py-2 text-xs font-bold text-[#1e293b] text-center transition-colors shadow-md shadow-teal-500/10"
					>
						Открыть карту пациента
					</button>
				) : (
					<button
						onClick={() => {
							// Open new patient form or patient view
							setCurrentView("patients");
							setIncomingCall(null);
							showToast("Добавьте нового пациента с номером " + incomingCall.phone, "info");
						}}
						className="flex-1 rounded-lg bg-teal-500 hover:bg-teal-600 active:bg-teal-700 px-3 py-2 text-xs font-bold text-[#1e293b] text-center transition-colors shadow-md shadow-teal-500/10"
					>
						Зарегистрировать
					</button>
				)}
			</div>
		</div>
	);
}

