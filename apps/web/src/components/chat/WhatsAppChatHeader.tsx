import {
	AlertCircle,
	ArrowLeft,
	MessageSquare,
	Phone,
	RefreshCw,
	Search,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { WhatsAppPatientSummaryStrip } from "./WhatsAppPatientSummaryStrip";

export interface WhatsAppChatHeaderProps {
	effectiveName: string;
	formattedPhone: string;
	effectivePhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border: string };
	isPatient: boolean;
	selectedChannel: "whatsapp" | "telegram" | "sms";
	isLoading: boolean;
	isSearchOpen: boolean;
	searchQuery: string;
	onToggleSearch: () => void;
	onSearchChange: (q: string) => void;
	onClearSearch: () => void;
	onRefresh: () => void;
	onCallPatient: () => void;
	onLaunchWhatsAppNative: () => void;
	onClose?: () => void;
	upcomingAppointment?: {
		formattedDate: string;
		formattedTime: string;
		doctorName?: string;
	} | null;
	financialSummary: {
		hasDebt?: boolean;
		formattedDebt?: string;
		hasInsurance?: boolean;
	};
}

/**
 * WhatsApp & Omnichannel Chat Header
 * Includes patient avatar, channel indicator, quick contact actions, and clinical visit banner.
 * Strict Mandates 8e, 8d (touch targets >= 44x44px), and WCAG AAA contrast compliance.
 */
export function WhatsAppChatHeader({
	effectiveName,
	formattedPhone,
	effectivePhone,
	initials,
	avatarColors,
	isPatient,
	selectedChannel,
	isLoading,
	isSearchOpen,
	searchQuery,
	onToggleSearch,
	onSearchChange,
	onClearSearch,
	onRefresh,
	onCallPatient,
	onLaunchWhatsAppNative,
	onClose,
	upcomingAppointment,
	financialSummary,
}: WhatsAppChatHeaderProps) {
	return (
		<>
			{/* Apple Mobile HIG Drag Handle for 390px Viewports */}
			<div className="sm:hidden w-10 h-1.5 rounded-full bg-[var(--line-strong,#475569)] mx-auto mt-2 mb-1 shrink-0" />

			{/* Top Bar: Patient Profile Info & Actions (Single row 36px/44px, Hick's law) */}
			<div className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft,rgba(30,41,59,0.7))] border-b border-[var(--line,#334155)] backdrop-blur-md">
				<div className="flex items-center gap-3 min-w-0">
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
							aria-label="Назад / Закрыть чат"
						>
							<ArrowLeft size={18} />
						</button>
					)}

					{/* Patient Avatar */}
					<div
						className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 border shadow-inner"
						style={{
							backgroundColor: avatarColors.bg,
							color: avatarColors.text,
							borderColor: avatarColors.border,
						}}
					>
						{isPatient ? initials : <User size={20} />}
					</div>

					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-sm sm:text-base font-bold text-[var(--ink,#f8fafc)] leading-tight truncate">
								{effectiveName}
							</h3>
							{isPatient ? (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded-md">
									<UserCheck size={11} /> Пациент
								</span>
							) : (
								<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded-md">
									<AlertCircle size={11} /> Лид
								</span>
							)}
						</div>

						<div className="flex items-center gap-2 text-xs text-[var(--muted,#94a3b8)] font-mono mt-0.5">
							<span>{formattedPhone}</span>
							<span
								className={`w-1.5 h-1.5 rounded-full ${
									selectedChannel === "whatsapp"
										? "bg-emerald-400"
										: selectedChannel === "telegram"
											? "bg-sky-400"
											: "bg-violet-400"
								}`}
							/>
							<span
								className={`text-[10px] font-sans font-semibold ${
									selectedChannel === "whatsapp"
										? "text-emerald-400"
										: selectedChannel === "telegram"
											? "text-sky-400"
											: "text-violet-400"
								}`}
							>
								{selectedChannel === "whatsapp"
									? "WhatsApp Онлайн"
									: selectedChannel === "telegram"
										? "Telegram Бот"
										: "SMS Шлюз"}
							</span>
						</div>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onRefresh}
						disabled={isLoading}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
						title="Обновить переписку"
						aria-label="Обновить переписку"
					>
						<RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
					</button>

					<button
						type="button"
						onClick={onToggleSearch}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] inline-flex items-center justify-center transition-colors"
						title="Поиск по сообщениям"
						aria-label="Поиск по сообщениям"
					>
						<Search size={18} />
					</button>

					<button
						type="button"
						onClick={onCallPatient}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-teal-400 hover:bg-teal-500/10 inline-flex items-center justify-center transition-colors"
						title={`Позвонить пациенту ${formattedPhone}`}
						aria-label={`Позвонить пациенту ${formattedPhone}`}
					>
						<Phone size={18} />
					</button>

					<button
						type="button"
						onClick={onLaunchWhatsAppNative}
						className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
						title="Открыть чат в приложении WhatsApp"
						aria-label="Открыть в WhatsApp"
					>
						<MessageSquare size={15} />
						<span className="hidden sm:inline">Открыть WhatsApp</span>
					</button>
				</div>
			</div>

			{/* Search Input Bar (if toggled) */}
			{isSearchOpen && (
				<div className="p-2 bg-[var(--paper-soft,rgba(30,41,59,0.5))] border-b border-[var(--line,#334155)] flex items-center gap-2 animate-fade-in">
					<div className="dente-search-wrap w-full">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Поиск по тексту диалога..."
							className="dente-search-input w-full text-xs"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={onClearSearch}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={14} />
							</button>
						)}
					</div>
				</div>
			)}

			<WhatsAppPatientSummaryStrip
				upcomingAppointment={upcomingAppointment}
				financialSummary={financialSummary}
			/>
		</>
	);
}
