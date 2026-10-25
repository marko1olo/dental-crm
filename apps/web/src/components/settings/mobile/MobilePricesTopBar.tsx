import React from "react";
import { ChevronLeft, Plus, Printer } from "lucide-react";

interface MobilePricesTopBarProps {
	onBackToSettings: () => void;
	servicesCount: number;
	onOpenPricelistManager: () => void;
	onAddService: () => void;
}

export const MobilePricesTopBar: React.FC<MobilePricesTopBarProps> = ({
	onBackToSettings,
	servicesCount,
	onOpenPricelistManager,
	onAddService,
}) => {
	return (
		<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-3 py-2 flex items-center justify-between">
			<button
				type="button"
				onClick={onBackToSettings}
				className="min-w-[44px] min-h-[44px] -ml-1 px-1 flex items-center gap-0.5 text-[15px] font-medium text-[var(--teal)] hover:opacity-80 active:scale-95 transition-transform cursor-pointer bg-transparent border-0 shrink-0"
				aria-label="Назад в настройки"
				data-testid="btn-mobile-back-to-settings"
			>
				<ChevronLeft size={20} className="shrink-0" />
				<span className="text-[14px]">Назад</span>
			</button>

			<div className="text-center min-w-0 px-1 flex-1 flex flex-col items-center">
				<h2 className="text-[16px] font-semibold text-[var(--ink)] tracking-tight whitespace-nowrap leading-tight">
					Прейскурант
				</h2>
				<span className="text-[11px] font-medium text-[var(--muted)] whitespace-nowrap">
					{servicesCount} услуг в каталоге
				</span>
			</div>

			<div className="flex items-center gap-0.5 -mr-1 shrink-0">
				<button
					type="button"
					onClick={onOpenPricelistManager}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-95 transition-transform cursor-pointer bg-transparent border-0"
					aria-label="Печать и прейскурант"
					title="Печать и прейскурант"
					data-testid="btn-mobile-open-pricelist-manager"
				>
					<Printer size={19} />
				</button>
				<button
					type="button"
					onClick={onAddService}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-95 transition-transform cursor-pointer bg-transparent border-0"
					aria-label="Добавить услугу"
					data-testid="btn-mobile-add-price-top"
				>
					<Plus size={22} />
				</button>
			</div>
		</div>
	);
};
