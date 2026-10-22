import type { StaffMemberPresenceItem } from "@dental/shared";
import type React from "react";

export interface StaffChatMembersListProps {
	members: StaffMemberPresenceItem[];
	onOpenDirectChat: (staffId: string) => void;
}

export const StaffChatMembersList: React.FC<StaffChatMembersListProps> = ({ members, onOpenDirectChat }) => {
	return (
		<div>
			<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5">
				<span>Сотрудники ({members.length})</span>
			</div>
			<div className="space-y-1 max-h-48 overflow-y-auto">
				{members.map((m) => (
					<div
						key={m.staffId}
						className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-all"
					>
						<div className="flex items-center gap-2 truncate">
							<span
								className={`w-2 h-2 rounded-full flex-shrink-0 ${
									m.status === "online" ? "bg-emerald-500 shadow-xs" : m.status === "in_visit" ? "bg-amber-500 animate-pulse" : "bg-slate-400 opacity-50"
								}`}
								title={m.status === "online" ? "В сети" : m.status === "in_visit" ? "На приёме" : "Офлайн"}
							/>
							<div className="truncate">
								<div className="truncate font-medium text-slate-800 dark:text-slate-200">{m.fullName}</div>
								<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
									{m.role} {m.cabinetNumber ? `• Каб. ${m.cabinetNumber}` : ""}
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={() => onOpenDirectChat(m.staffId)}
							className="p-1 rounded text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 text-[11px] font-semibold cursor-pointer"
							title="Написать личное сообщение"
						>
							Чат
						</button>
					</div>
				))}
			</div>
		</div>
	);
};
