import { useCallback, useState } from "react";
import type { CheckoutPaymentMethodType } from "../payments/checkout/fastCheckoutPresets";
import type { ToothActionMenuConfig } from "./ToothActionMenuPortal";

export function useOdontogramModuleModalsState() {
	const [menuConfig, setMenuConfig] = useState<ToothActionMenuConfig | null>(
		null,
	);
	const [radialMenuData, setRadialMenuData] = useState<any>(null);
	const [historyTooth, setHistoryTooth] = useState<number | null>(null);
	const [endoTooth, setEndoTooth] = useState<number | null>(null);
	const [contextDrawerTooth, setContextDrawerTooth] = useState<number | null>(
		null,
	);
	const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
	const [fastCheckoutMethod, setFastCheckoutMethod] =
		useState<CheckoutPaymentMethodType>("sbp_qr");
	const [isPediatricModalOpen, setIsPediatricModalOpen] = useState(false);
	const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
	const [isPerioOpen, setIsPerioOpen] = useState(false);
	const [isVoiceOpen, setIsVoiceOpen] = useState(false);
	const [_aiPendingProposal, setAiPendingProposal] = useState<any>(null);

	const clearMenu = useCallback(() => setMenuConfig(null), []);

	return {
		menuConfig,
		setMenuConfig,
		radialMenuData,
		setRadialMenuData,
		historyTooth,
		setHistoryTooth,
		endoTooth,
		setEndoTooth,
		contextDrawerTooth,
		setContextDrawerTooth,
		isFastCheckoutOpen,
		setIsFastCheckoutOpen,
		fastCheckoutMethod,
		setFastCheckoutMethod,
		isPediatricModalOpen,
		setIsPediatricModalOpen,
		isEstimatorOpen,
		setIsEstimatorOpen,
		isPerioOpen,
		setIsPerioOpen,
		isVoiceOpen,
		setIsVoiceOpen,
		_aiPendingProposal,
		setAiPendingProposal,
		clearMenu,
	};
}
