import React from "react";

interface OrthoMobileNavigationProps {
	mobileTab: "controls" | "preview";
	setMobileTab: (tab: "controls" | "preview") => void;
	servicesCount: number;
	onClose: () => void;
	onApplyBoth: () => void;
}

export const OrthoMobileSegmentedBar: React.FC<Pick<OrthoMobileNavigationProps, "mobileTab" | "setMobileTab" | "servicesCount">> = ({
	mobileTab,
	setMobileTab,
	servicesCount,
}) => {
	return (
		<div data-testid="ortho-mobile-segmented-switcher" className="sm:hidden flex items-center p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0 gap-1.5">
			<button
				type="button"
				data-testid="ortho-mobile-tab-controls"
				onClick={() => setMobileTab("controls")}
				className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
					mobileTab === "controls" ? "primary-button !rounded-xl" : "secondary-button !rounded-xl"
				}`}
			>
				1. Протокол & дуги
			</button>
			<button
				type="button"
				data-testid="ortho-mobile-tab-preview"
				onClick={() => setMobileTab("preview")}
				className={`flex-1 h-[44px] min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
					mobileTab === "preview" ? "primary-button !rounded-xl" : "secondary-button !rounded-xl"
				}`}
			>
				2. Дневник & чек ({servicesCount})
			</button>
		</div>
	);
};

export const OrthoMobileStickyCta: React.FC<OrthoMobileNavigationProps> = ({
	mobileTab,
	setMobileTab,
	servicesCount,
	onClose,
	onApplyBoth,
}) => {
	return (
		<div data-testid="ortho-mobile-sticky-cta-bar" className="sm:hidden shrink-0 p-2.5 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] flex items-center gap-2 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
			{mobileTab === "controls" ? (
				<>
					<button type="button" data-testid="ortho-mobile-btn-to-preview" onClick={() => setMobileTab("preview")} className="primary-button h-[46px] min-h-[44px] flex-1 !rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
						К дневнику и чеку ({servicesCount})
					</button>
					<button type="button" data-testid="ortho-mobile-btn-close" onClick={onClose} className="secondary-button h-[46px] min-h-[44px] px-3.5 !rounded-xl text-xs font-semibold cursor-pointer">
						Закрыть
					</button>
				</>
			) : (
				<>
					<button type="button" data-testid="ortho-mobile-btn-apply-both" onClick={onApplyBoth} className="primary-button h-[46px] min-h-[44px] flex-1 !rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
						Зафиксировать ортодонтический протокол ({servicesCount})
					</button>
					<button type="button" data-testid="ortho-mobile-btn-back-controls" onClick={() => setMobileTab("controls")} className="secondary-button h-[46px] min-h-[44px] px-3.5 !rounded-xl text-xs font-semibold cursor-pointer">
						Назад
					</button>
				</>
			)}
		</div>
	);
};
