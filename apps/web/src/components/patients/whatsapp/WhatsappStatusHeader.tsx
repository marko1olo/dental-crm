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
					<h3 className="text-sm font-semibold text-[var(--ink)] tracking-wide flex items-center gap-1.5">
						<MessageSquare size={16} className="text-[var(--primary)]" />
						<span>
							Сообщение пациенту ({channel === "whatsapp" ? "WhatsApp" : channel === "max" ? "MAX" : "Telegram"})
						</span>
					</h3>
					<div className="flex items-center gap-2 flex-wrap">
						{/* Omnichannel Channel Selector (Apple HIG Segmented Control) */}
						<div
							className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs shrink-0"
							role="radiogroup"
							aria-label="Канал связи с пациентом"
						>
							<button
								type="button"
								onClick={() => onChannelChange("whatsapp")}
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer ${
									channel === "whatsapp"
										? "bg-[var(--primary)] text-white shadow-xs"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "whatsapp"}
								title="Отправить через WhatsApp"
							>
								<MessageSquare size={12} className="shrink-0" />
								<span>WA</span>
							</button>
							<button
								type="button"
								onClick={() => onChannelChange("telegram")}
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer ${
									channel === "telegram"
										? "bg-[var(--primary)] text-white shadow-xs"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "telegram"}
								title="Отправить через Telegram"
							>
								<Send size={12} className="shrink-0" />
								<span>TG</span>
							</button>
							<button
								type="button"
								onClick={() => onChannelChange("max")}
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer ${
									channel === "max"
										? "bg-[var(--primary)] text-white shadow-xs"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								role="radio"
								aria-checked={channel === "max"}
								title="Отправить через MAX (VK Max)"
							>
								<Bot size={12} className="shrink-0" />
								<span>MAX</span>
							</button>
						</div>

						{phoneHint && (
							<span className="text-xs font-mono font-medium text-[var(--success)] bg-[var(--success-soft)] px-2.5 py-1 rounded-lg border border-[var(--line)] whitespace-nowrap shrink-0">
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
					className="mb-3 text-xs text-[var(--danger)] bg-[var(--danger-soft)] border border-[var(--danger-soft)] rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{lastOk ? (
				<p
					className="mb-3 text-xs text-[var(--success)] bg-[var(--success-soft)] border border-[var(--success-soft)] rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-ok"
					role="status"
				>
					{lastOk}
				</p>
			) : null}
		</>
	);
}
