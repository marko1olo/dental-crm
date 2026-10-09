import React from "react";
import { ArrowLeft, Phone, Shield, UserCheck } from "lucide-react";
import { formatPhoneDisplay, getAvatarColor, formatPatientInitials } from "../../../store/telephonyStore";
import type { ActivePatient, ChatChannel } from "./types";

export interface ChatTopBarProps {
	activePatient: ActivePatient;
	activeChannel: ChatChannel;
	isCurrentMobileIntercepted: boolean;
	onBack: () => void;
	onTakeover: () => void;
}

export const ChatTopBar: React.FC<ChatTopBarProps> = ({
	activePatient,
	activeChannel,
	isCurrentMobileIntercepted,
	onBack,
	onTakeover,
}) => {
	return (
		<div className="mobile-chat-topbar">
			<button
				type="button"
				className="mobile-chat-back-btn"
				onClick={onBack}
				aria-label="Назад к списку диалогов"
				data-testid="btn-mobile-chat-back"
			>
				<ArrowLeft size={22} />
			</button>

			<div
				className="mobile-chat-patient-header"
				onClick={() => {
					if (activePatient.phone) {
						window.location.href = `tel:${activePatient.phone}`;
					}
				}}
				title="Нажмите для вызова пациента"
			>
				<div
					className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
					style={{ background: getAvatarColor(activePatient.fullName).bg }}
				>
					{formatPatientInitials(activePatient.fullName)}
				</div>

				<div className="mobile-chat-patient-meta">
					<span className="mobile-chat-patient-name">{activePatient.fullName}</span>
					<span className="mobile-chat-patient-sub">
						<span
							className={`mobile-chat-channel-indicator ${
								activeChannel === "whatsapp"
									? "text-emerald-600 dark:text-emerald-400"
									: activeChannel === "telegram"
										? "text-sky-600 dark:text-sky-400"
										: "text-blue-600 dark:text-blue-400"
							}`}
						>
							{activeChannel.toUpperCase()}
						</span>
						<span>• {formatPhoneDisplay(activePatient.phone)}</span>
					</span>
				</div>
			</div>

			<div className="mobile-chat-top-actions">
				{/* Кнопка перехвата диалога у Telegram/VK бота */}
				<button
					type="button"
					className={`mobile-touch-btn ${isCurrentMobileIntercepted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
					onClick={onTakeover}
					aria-label="Перехватить диалог"
					title={isCurrentMobileIntercepted ? "Оператор на линии" : "Перехватить диалог у бота"}
					data-testid="btn-mobile-chat-takeover"
				>
					{isCurrentMobileIntercepted ? <Shield size={18} /> : <UserCheck size={18} />}
				</button>

				{/* Direct Phone Call Button */}
				{activePatient.phone && (
					<a
						href={`tel:${activePatient.phone}`}
						className="mobile-touch-btn text-teal-600"
						aria-label="Позвонить пациенту"
						title="Позвонить"
					>
						<Phone size={18} />
					</a>
				)}
			</div>
		</div>
	);
};
