import React from "react";
import { Headphones, X } from "lucide-react";

interface TelephonyDialerModalHeaderProps {
	isWsConnected: boolean;
	agentState: string;
	onSetAgentState: (state: "online" | "dnd") => void;
	onClose: () => void;
}

export const TelephonyDialerModalHeader: React.FC<TelephonyDialerModalHeaderProps> = ({
	isWsConnected,
	agentState,
	onSetAgentState,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shrink-0">
					<Headphones size={16} />
				</div>
				<div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] leading-tight">
						Софтфон клиники
					</h3>
					<div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] mt-0.5">
						<span
							className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}
						/>
						<span>{isWsConnected ? "Телефония онлайн" : "Ожидание вызова"}</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1">
				<div className="flex items-center bg-[var(--paper-strong)] rounded-lg p-0.5 border border-[var(--line)] text-[10px]">
					<button
						type="button"
						onClick={() => onSetAgentState("online")}
						className={`px-2 py-1 rounded font-bold transition-all ${
							agentState === "online"
								? "bg-emerald-500 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Онлайн"
					>
						Онлайн
					</button>
					<button
						type="button"
						onClick={() => onSetAgentState("dnd")}
						className={`px-2 py-1 rounded font-bold transition-all ${
							agentState === "dnd"
								? "bg-rose-500 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Не беспокоить"
					>
						Занят
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer"
					title="Закрыть номеронабиратель (Esc)"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
