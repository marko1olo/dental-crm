import {
	CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY,
	COMMON_ASSISTANT_REASONS,
	INTERCOM_PRESETS,
	type IntercomPresetKey,
} from "@dental/shared";
import { AlertCircle, Bell, Camera, ChevronDown, Radio, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import React, { useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { playIntercomChime } from "../../lib/intercomSound";
import { showToast } from "../GlobalToast";

interface ChairsideIntercomBarProps {
	cabinetNumber?: string;
	patientId?: string;
	patientName?: string;
	onOpenMessenger?: () => void;
}

export const ChairsideIntercomBar: React.FC<ChairsideIntercomBarProps> = ({
	cabinetNumber = "1",
	patientId,
	patientName,
	onOpenMessenger,
}) => {
	const [isSending, setIsSending] = useState(false);
	const [showReasonsDropdown, setShowReasonsDropdown] = useState(false);

	const handlePing = async (
		presetKey: IntercomPresetKey,
		reason?: string,
	) => {
		try {
			setIsSending(true);
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/staff-chat/intercom-ping", {
				method: "POST",
				headers,
				body: JSON.stringify({
					presetKey,
					cabinetNumber,
					reason,
					patientId,
					patientName,
				}),
			});

			if (res.ok) {
				const preset = INTERCOM_PRESETS[presetKey];
				playIntercomChime(presetKey === "urgent_doctor_call" ? "critical" : "urgent");
				showToast(`Интерком: ${preset.label} отправлен!`, "success");
			} else {
				showToast("Ошибка интеркома", "warning");
			}
		} catch (e) {
			console.error("Сбой интеркома у кресла:", e);
			showToast("Сетевая ошибка вызова интеркома", "error");
		} finally {
			setIsSending(false);
			setShowReasonsDropdown(false);
		}
	};

	return (
		<div
			className="chairside-intercom-hud flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper-soft,#0f172a)]/95 backdrop-blur-md border border-[var(--line,#334155)] rounded-xl shadow-lg relative z-20 text-xs"
			data-testid="chairside-intercom-bar"
		>
			<div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold mr-1">
				<Radio size={14} className="animate-pulse" />
				<span className="hidden sm:inline">Интерком (Каб. {cabinetNumber}):</span>
			</div>

			{/* Кнопка вызова ассистента с дропдауном поводов */}
			<div className="relative">
				<div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-amber-500/40">
					<button
						type="button"
						disabled={isSending}
						onClick={() => handlePing("call_assistant", "помощь на приёме")}
						className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
						title="Срочно вызвать ассистента в кабинет"
						data-testid="chairside-call-assistant-btn"
					>
						<span>🪑</span>
						<span>Ассистент</span>
					</button>
					<button
						type="button"
						onClick={() => setShowReasonsDropdown((v) => !v)}
						className="px-1.5 bg-amber-500/20 hover:bg-amber-500/35 text-amber-800 dark:text-amber-200 border-l border-amber-500/30 transition-all cursor-pointer"
						title="Выбрать повод вызова ассистента"
					>
						<ChevronDown size={12} />
					</button>
				</div>

				{/* Выпадающий список поводов, сгруппированный по клиническим специальностям */}
				{showReasonsDropdown && (
					<div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 max-h-80 overflow-y-auto">
						{CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY.map((cat) => (
							<div key={cat.id} className="mb-2 last:mb-0">
								<div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
									<span>{cat.icon}</span>
									<span>{cat.name}</span>
								</div>
								<div className="space-y-0.5">
									{cat.reasons.map((r) => (
										<button
											key={r}
											type="button"
											onClick={() => handlePing("call_assistant", r)}
											className="w-full text-left px-2 py-1 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-amber-500/20 hover:text-amber-900 dark:hover:text-amber-200 transition-all cursor-pointer font-medium"
										>
											{r}
										</button>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Быстрый вызов рентген-снимка КТ */}
			<button
				type="button"
				disabled={isSending}
				onClick={() => handlePing("xray_ready")}
				className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-800 dark:text-blue-200 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
				title="Запросить готовность КТ / ОПТГ"
			>
				<Camera size={12} />
				<span className="hidden md:inline">Снимок КТ</span>
			</button>

			{/* Проверить работу ЗТЛ */}
			<button
				type="button"
				disabled={isSending}
				onClick={() => handlePing("lab_work_ready")}
				className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-800 dark:text-indigo-200 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
				title="Проверить готовность работы из зуботехнической лаборатории"
			>
				<span>🦷</span>
				<span className="hidden md:inline">ЗТЛ</span>
			</button>

			{/* Пациент в холле */}
			<button
				type="button"
				disabled={isSending}
				onClick={() => handlePing("patient_arrived")}
				className="px-2 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-800 dark:text-teal-200 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
				title="Уточнить статус пациента в холле"
			>
				<Bell size={12} />
				<span className="hidden md:inline">В холле</span>
			</button>

			{/* Экстренный вызов */}
			<button
				type="button"
				disabled={isSending}
				onClick={() => handlePing("urgent_doctor_call")}
				className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
				title="Экстренный вызов дежурного врача"
			>
				<ShieldAlert size={12} />
				<span>SOS</span>
			</button>

			{/* Открыть полный мессенджер */}
			{onOpenMessenger && (
				<button
					type="button"
					onClick={onOpenMessenger}
					className="ml-auto text-teal-600 hover:text-teal-500 font-medium underline text-[11px] cursor-pointer"
					title="Перейти в общий мессенджер клиники"
				>
					Открыть чат
				</button>
			)}
		</div>
	);
};
