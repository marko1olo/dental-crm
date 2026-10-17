import type { StaffProfileExtended } from "@dental/shared";
import { User, X } from "lucide-react";
import type React from "react";

interface HeaderProps {
	staffMember: StaffProfileExtended;
	fullName: string;
	color: string;
	setColor: (c: string) => void;
	onClose: () => void;
	activeTabMobile: "requisites" | "payroll" | "security";
	setActiveTabMobile: (t: "requisites" | "payroll" | "security") => void;
}

const PRESET_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export const StaffProfileHeader: React.FC<HeaderProps> = ({
	fullName,
	color,
	setColor,
	onClose,
	activeTabMobile,
	setActiveTabMobile,
}) => {
	return (
		<header className="staff-profile-modal-header p-4 border-b border-[var(--line)] flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div
						className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0"
						style={{ backgroundColor: color }}
					>
						{fullName ? fullName.charAt(0) : <User size={20} />}
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)] truncate">{fullName || "Сотрудник"}</h3>
						<span className="text-xs text-[var(--muted)]">Расширенная карточка сотрудника</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1">
						{PRESET_COLORS.map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => setColor(c)}
								className={`w-5 h-5 rounded-full border cursor-pointer ${color === c ? "ring-2 ring-offset-1 ring-[var(--teal)]" : "opacity-80"}`}
								style={{ backgroundColor: c }}
								title="Цвет маркера в расписании"
							/>
						))}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<div className="flex md:hidden border-t border-[var(--line)] pt-2 gap-1">
				<button
					type="button"
					onClick={() => setActiveTabMobile("requisites")}
					className={`flex-1 py-1 text-xs font-semibold rounded-lg ${activeTabMobile === "requisites" ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "text-[var(--muted)]"}`}
				>
					Данные
				</button>
				<button
					type="button"
					onClick={() => setActiveTabMobile("payroll")}
					className={`flex-1 py-1 text-xs font-semibold rounded-lg ${activeTabMobile === "payroll" ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "text-[var(--muted)]"}`}
				>
					Оплата
				</button>
				<button
					type="button"
					onClick={() => setActiveTabMobile("security")}
					className={`flex-1 py-1 text-xs font-semibold rounded-lg ${activeTabMobile === "security" ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "text-[var(--muted)]"}`}
				>
					Доступ
				</button>
			</div>
		</header>
	);
};
