import { PhoneIncoming, User, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useWebsocket } from "../hooks/useWebsocket";
import { useAppStore } from "../store/appStore";
import { usePatientStore } from "../store/patientStore";

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

	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	useEffect(() => {
		if (
			lastMessage?.type === "TELEPHONY_INCOMING_CALL" &&
			lastMessage.payload
		) {
			setIncomingCall(lastMessage.payload);

			// Auto-hide after 30 seconds
			const timer = setTimeout(() => {
				setIncomingCall(null);
			}, 30000);
			return () => clearTimeout(timer);
		}
	}, [lastMessage]);

	if (!incomingCall) return null;

	return (
		<div className="fixed bottom-6 right-6 z-[999999] flex w-80 flex-col gap-3 rounded-lg border-l-4 border-emerald-500 bg-white shadow-2xl p-4 dark:bg-slate-800 dark:border-emerald-400">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
					<PhoneIncoming size={20} className="animate-pulse" />
					<span className="text-sm font-semibold">Входящий звонок</span>
				</div>
				<button
					onClick={() => setIncomingCall(null)}
					className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
					aria-label="Закрыть уведомление"
				>
					<X size={16} />
				</button>
			</div>

			<div>
				<div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
					{incomingCall.phone}
				</div>
				<div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
					<User size={14} />
					{incomingCall.patientName}
				</div>
			</div>

			{incomingCall.patientId && (
				<button
					onClick={() => {
						setSelectedPatientId(incomingCall.patientId);
						setCurrentView("patients");
						setIncomingCall(null);
					}}
					className="mt-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
				>
					Открыть карту пациента
				</button>
			)}
		</div>
	);
}
