import React, { useState } from "react";
import {
	Activity,
	Flame,
	Hourglass,
	PauseCircle,
	ShieldAlert,
	ShieldCheck,
	Sliders,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	DEFAULT_ANTIBAN_LIMITS,
	type WhatsappAntiBanLimits,
} from "./types.js";

export interface WhatsappAntiBanLimitsSectionProps {
	limits?: WhatsappAntiBanLimits;
	onUpdateLimits?: (limits: WhatsappAntiBanLimits) => void;
}

export function WhatsappAntiBanLimitsSection({
	limits = DEFAULT_ANTIBAN_LIMITS,
	onUpdateLimits,
}: WhatsappAntiBanLimitsSectionProps) {
	const [localLimits, setLocalLimits] = useState<WhatsappAntiBanLimits>(limits);

	const updateField = <K extends keyof WhatsappAntiBanLimits>(
		key: K,
		val: WhatsappAntiBanLimits[K],
	) => {
		const updated = { ...localLimits, [key]: val };
		setLocalLimits(updated);
		if (onUpdateLimits) {
			onUpdateLimits(updated);
		}
	};

	return (
		<div
			className="whatsapp-antiban-section"
			data-testid="whatsapp-antiban-section"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
				padding: "16px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				fontSize: "13px",
				marginBottom: "16px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<div
						style={{
							fontWeight: 700,
							color: "var(--ink)",
							fontSize: "14px",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<ShieldCheck size={16} className="text-emerald-600" />
						<span>Защита от спам-блокировок и лимиты отправки (Anti-Ban Engine)</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)" }}>
						Рандомизация пауз между сообщениями, режим разогрева нового номера и суточные квоты
					</div>
				</div>

				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px 10px",
						borderRadius: "6px",
						background: "rgba(16, 185, 129, 0.1)",
						border: "1px solid rgba(16, 185, 129, 0.25)",
						fontSize: "12px",
						fontWeight: 500,
						color: "var(--teal)",
					}}
				>
					<Activity size={13} />
					<span>Защита активна: {localLimits.minDelaySeconds}–{localLimits.maxDelaySeconds} сек</span>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
					gap: "12px",
				}}
			>
				{/* Настройка интервалов */}
				<div
					style={{
						padding: "12px",
						background: "var(--paper)",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
						<Hourglass size={14} className="text-amber-500" />
						<span>Случайная пауза между отправками</span>
					</div>
					<p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
						Имитация поведения живого человека, предотвращающая алгоритмический бан WhatsApp
					</p>

					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
						<div style={{ flex: 1 }}>
							<label style={{ fontSize: "11px", color: "var(--muted)" }}>Мин. (сек)</label>
							<input
								type="number"
								min={5}
								max={60}
								value={localLimits.minDelaySeconds}
								onChange={(e) => updateField("minDelaySeconds", Number(e.target.value) || 10)}
								style={{
									width: "100%",
									padding: "6px 8px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									fontSize: "12px",
									boxSizing: "border-box",
								}}
							/>
						</div>
						<span style={{ marginTop: "16px", color: "var(--muted)" }}>—</span>
						<div style={{ flex: 1 }}>
							<label style={{ fontSize: "11px", color: "var(--muted)" }}>Макс. (сек)</label>
							<input
								type="number"
								min={10}
								max={120}
								value={localLimits.maxDelaySeconds}
								onChange={(e) => updateField("maxDelaySeconds", Number(e.target.value) || 30)}
								style={{
									width: "100%",
									padding: "6px 8px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									fontSize: "12px",
									boxSizing: "border-box",
								}}
							/>
						</div>
					</div>
				</div>

				{/* Суточный лимит и паузы пачек */}
				<div
					style={{
						padding: "12px",
						background: "var(--paper)",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
						<PauseCircle size={14} className="text-sky-500" />
						<span>Пакетная отправка и суточный лимит</span>
					</div>
					<p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
						Автоматическая передышка очереди после отправки партии сообщений
					</p>

					<div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
						<div style={{ flex: 1 }}>
							<label style={{ fontSize: "11px", color: "var(--muted)" }}>Лимит в день</label>
							<input
								type="number"
								min={50}
								max={1000}
								value={localLimits.dailyMessageLimit}
								onChange={(e) => updateField("dailyMessageLimit", Number(e.target.value) || 200)}
								style={{
									width: "100%",
									padding: "6px 8px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									fontSize: "12px",
									boxSizing: "border-box",
								}}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label style={{ fontSize: "11px", color: "var(--muted)" }}>Пауза пачки (мин)</label>
							<input
								type="number"
								min={1}
								max={30}
								value={localLimits.pauseDurationMinutes}
								onChange={(e) => updateField("pauseDurationMinutes", Number(e.target.value) || 5)}
								style={{
									width: "100%",
									padding: "6px 8px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									fontSize: "12px",
									boxSizing: "border-box",
								}}
							/>
						</div>
					</div>
				</div>

				{/* Режим прогрева нового номера */}
				<div
					style={{
						padding: "12px",
						background: "var(--paper)",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
							<Flame size={14} className="text-amber-600" />
							<span>Прогрев нового номера (Warm-Up)</span>
						</div>
						<input
							type="checkbox"
							checked={localLimits.warmupModeEnabled}
							onChange={(e) => {
								updateField("warmupModeEnabled", e.target.checked);
								showToast(
									e.target.checked
										? "Режим безопасного прогрева включен"
										: "Режим прогрева отключен",
									"info",
								);
							}}
							style={{ width: "16px", height: "16px", cursor: "pointer" }}
						/>
					</div>
					<p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
						Постепенное наращивание объёма рассылок с 30 до 200 сообщ./день для защиты от блокировок
					</p>

					{localLimits.warmupModeEnabled && (
						<div style={{ marginTop: "4px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
								<span>Прогресс за сегодня:</span>
								<strong>{localLimits.warmupCurrentDailySent} из {localLimits.warmupTargetLimit}</strong>
							</div>
							<div
								style={{
									width: "100%",
									height: "6px",
									borderRadius: "3px",
									background: "var(--line)",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										width: `${Math.min(100, (localLimits.warmupCurrentDailySent / localLimits.warmupTargetLimit) * 100)}%`,
										height: "100%",
										background: "var(--teal)",
										borderRadius: "3px",
									}}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
