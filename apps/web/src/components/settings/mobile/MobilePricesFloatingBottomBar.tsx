import React from "react";
import { Plus } from "lucide-react";

interface MobilePricesFloatingBottomBarProps {
	onAddService: () => void;
}

export const MobilePricesFloatingBottomBar: React.FC<MobilePricesFloatingBottomBarProps> = ({
	onAddService,
}) => {
	return (
		<div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[var(--paper-strong)]/90 backdrop-blur-md border-t border-[var(--line)] pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg">
			<button
				type="button"
				onClick={onAddService}
				className="w-full min-h-[50px] h-12 rounded-xl text-[16px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] active:scale-[0.99] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
				data-testid="btn-mobile-add-price-bottom"
			>
				<Plus size={20} />
				<span>Добавить новую услугу</span>
			</button>
		</div>
	);
};
