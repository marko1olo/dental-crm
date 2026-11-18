import { Bot, MessageSquare, Send } from "lucide-react";
import React from "react";
import type { PatientChatChannel } from "./types";

interface WhatsappStatusHeaderProps {
	readonly phoneHint: string;
	readonly nameHint: string;
	readonly error: string | null;
	readonly lastOk: string | null;
	readonly channel: PatientChatChannel;
	readonly onChannelChange: (c: PatientChatChannel) => void;
}

export function WhatsappStatusHeader({
	phoneHint,
	nameHint,
	error,
	lastOk,
	channel,
	onChannelChange,
}: WhatsappStatusHeaderProps) {
	return (
		<>
			<div className="mb-3">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-200 tracking-wide flex items-center gap-1.5">
						<MessageSquare size={16} className="text-emerald-500 dark:text-emerald-400" />
						<span>
							Сообщение пациенту ({channel === "whatsapp" ? "WhatsApp" : channel === "max" ? "MAX" : "Telegram"})
						</span>
					</h3>
					<div className="flex items-center gap-2">
						{/* Omnichannel Channel Selector (Apple HIG Segmented Control) */}
						<div
							className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs"
							role="radiogroup"
							aria-label="Канал связи с пациентом"
						>
							<button
								type="button"
								onClick={() => onChannelChange("whatsapp")}
								className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 ${
									channel === "whatsapp"
										? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "whatsapp"}
								title="Отправить через WhatsApp"
							>
								<MessageSquare size={12} />
								<span>WA</span>
							</button>
							<button
								type="button"
								onClick={() => onChannelChange("telegram")}
								className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 ${
									channel === "telegram"
										? "bg-sky-600 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "telegram"}
								title="Отправить через Telegram"
							>
								<Send size={12} />
								<span>TG</span>
							</button>
							<button
								type="button"
								onClick={() => onChannelChange("max")}
								className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 ${
									channel === "max"
										? "bg-amber-600 text-white shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "max"}
								title="Отправить через MAX (VK Max)"
							>
								<Bot size={12} />
								<span>MAX</span>
							</button>
						</div>

						{phoneHint && (
							<span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
								{phoneHint}
							</span>
						)}
					</div>
				</div>
				<p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
					Омниканальная отправка через WhatsApp, Telegram и национальный мессенджер MAX. Подставляются имя пациента
					{nameHint ? ` (${nameHint})` : ""}, лечащий врач и параметры записи.
				</p>
			</div>

			{error ? (
				<p
					className="mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{lastOk ? (
				<p
					className="mb-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-ok"
					role="status"
				>
					{lastOk}
				</p>
			) : null}
		</>
	);
}
