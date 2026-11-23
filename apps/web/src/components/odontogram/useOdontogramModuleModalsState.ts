import { useCallback, useState } from "react";
import type { CheckoutPaymentMethodType } from "../cashbox/cashRegisterCatalogData";
import type { RadialMenuAnchorData } from "./OdontogramViewModals";
import type { ToothState } from "./ToothChart";
import type { ToothActionMenuConfig } from "./toothActionMenuTypes";

export interface OdontogramAiPendingProposal {
	source: "voice" | "vision" | "sensor";
	title: string;
	findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
}

export function useOdontogramModuleModalsState() {
	const [menuConfig, setMenuConfig] = useState<ToothActionMenuConfig | null>(
		null,
	);
	const [radialMenuData, setRadialMenuData] = useState<RadialMenuAnchorData | null>(null);
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
	const [_aiPendingProposal, setAiPendingProposal] = useState<OdontogramAiPendingProposal | null>(null);

	const clearMenu = useCallback(() => {
		setMenuConfig(null);
		setRadialMenuData(null);
	}, []);

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
