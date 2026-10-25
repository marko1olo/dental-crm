import React from "react";
import { UserPlus } from "lucide-react";

interface MobileStaffFloatingBottomBarProps {
	onOpenAddStaff: () => void;
}

export const MobileStaffFloatingBottomBar: React.FC<MobileStaffFloatingBottomBarProps> = ({
	onOpenAddStaff,
}) => {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[var(--paper-strong)]/90 backdrop-blur-md border-t border-[var(--line)] pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg">
			<button
				type="button"
				onClick={onOpenAddStaff}
				className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
				data-testid="btn-mobile-add-staff-bottom"
			>
				<UserPlus size={20} />
				<span>Добавить нового сотрудника</span>
			</button>
		</div>
	);
};
