import type { Dashboard } from "@dental/shared";
import { useEffect } from "react";
import { showToast } from "../GlobalToast";
import { dispatchBatchReminders } from "./tomorrowRemindersEngine";
import {
	TomorrowReminderCard,
	TomorrowRemindersBatchFooter,
	TomorrowRemindersFilterBar,
	TomorrowRemindersHeader,
	useTomorrowRemindersLogic,
} from "./tomorrowRemindersModules";

export * from "./tomorrowRemindersModules";

export interface TomorrowRemindersModalProps {
	dashboard: Dashboard;
	isOpen: boolean;
	onClose: () => void;
	targetDateIso?: string | undefined;
}

export function TomorrowRemindersModal({
	dashboard,
	isOpen,
	onClose,
	targetDateIso,
}: TomorrowRemindersModalProps) {
	const logic = useTomorrowRemindersLogic(dashboard, targetDateIso);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		if (isOpen) window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleBatchDispatch = async () => {
		logic.setIsDispatching(true);
		logic.setDispatchProgress({
			current: 0,
			total: logic.summary.dispatchableCount,
		});
		try {
			await dispatchBatchReminders(
				logic.summary.reminders,
				(current, total) => logic.setDispatchProgress({ current, total }),
				logic.allowQuietHoursOverride,
			);
			showToast(
				`Отправлено ${logic.summary.dispatchableCount} напоминаний`,
				"success",
			);
			onClose();
		} catch {
			showToast("Ошибка пакетной отправки напоминаний", "error");
		} finally {
			logic.setIsDispatching(false);
			logic.setDispatchProgress(null);
		}
	};

	return (
		<div
			className="tomorrow-reminders-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="tomorrow-reminders-modal w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				<TomorrowRemindersHeader
					summary={logic.summary}
					onCopyAll={logic.handleCopyAll}
					onClose={onClose}
				/>
				<TomorrowRemindersFilterBar
					searchQuery={logic.searchQuery}
					setSearchQuery={logic.setSearchQuery}
					selectedChannel={logic.selectedChannelFilter}
					setSelectedChannel={logic.setSelectedChannelFilter}
				/>
				<div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1">
					{logic.filteredReminders.length === 0 ? (
						<div className="py-12 text-center text-xs text-[var(--muted,#64748b)]">
							Нет записей, соответствующих критериям поиска
						</div>
					) : (
						logic.filteredReminders.map((reminder) => (
							<TomorrowReminderCard
								key={reminder.appointmentId}
								reminder={reminder}
								isSent={logic.sentAppointmentIds.has(reminder.appointmentId)}
								onCopy={logic.handleCopySingle}
								onSendWhatsApp={logic.handleSendWhatsApp}
								onSendTelegram={logic.handleSendTelegram}
								onSendSms={logic.handleSendSms}
							/>
						))
					)}
				</div>
				<TomorrowRemindersBatchFooter
					summary={logic.summary}
					isDispatching={logic.isDispatching}
					dispatchProgress={logic.dispatchProgress}
					allowQuietHoursOverride={logic.allowQuietHoursOverride}
					setAllowQuietHoursOverride={logic.setAllowQuietHoursOverride}
					onBatchDispatch={handleBatchDispatch}
					onClose={onClose}
				/>
			</div>
		</div>
	);
}
