import { KeyRound, MoreVertical, Phone, ShieldCheck, UserPlus } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface StaffMemberCardActionsProps {
	// biome-ignore lint/suspicious/noExplicitAny: member data
	member: any;
	onOpenProfile: (member: any) => void;
	onStartEdit: (mode: "phone" | "pin" | "password", initial?: string) => void;
}

export const StaffMemberCardActions: React.FC<StaffMemberCardActionsProps> = ({
	member,
	onOpenProfile,
	onStartEdit,
}) => {
	const [menuOpen, setMenuOpen] = useState(false);

	const handleEdit = (mode: "phone" | "pin" | "password", initial = "") => {
		setMenuOpen(false);
		onStartEdit(mode, initial);
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] text-[var(--teal)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
				onClick={() => onOpenProfile(member)}
			>
				<UserPlus size={14} /> Карточка
			</button>
			<button
				type="button"
				className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
				onClick={() => handleEdit("phone", member.phone || "")}
			>
				<Phone size={14} /> Телефон
			</button>
			<div className="relative">
				<button
					type="button"
					className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] flex items-center justify-center cursor-pointer"
					onClick={() => setMenuOpen(!menuOpen)}
					aria-label="Меню доступов"
				>
					<MoreVertical size={14} />
				</button>
				{menuOpen && (
					<div className="absolute right-0 bottom-full mb-1 w-32 py-1 bg-[var(--paper-card)] rounded-xl shadow-lg border border-[var(--line)] z-10 flex flex-col text-xs">
						<button
							type="button"
							className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] cursor-pointer"
							onClick={() => handleEdit("pin")}
						>
							<KeyRound size={13} /> <span>PIN-код</span>
						</button>
						<button
							type="button"
							className="px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--paper-soft)] cursor-pointer"
							onClick={() => handleEdit("password")}
						>
							<ShieldCheck size={13} /> <span>Пароль</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
