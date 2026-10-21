import { useState } from "react";

export interface UseOdontogramDrawersStateParams {
	readonly controlledContextDrawerTooth?: number | null | undefined;
	readonly controlledSetContextDrawerTooth?:
		| ((tooth: number | null) => void)
		| undefined;
}

export function useOdontogramDrawersState({
	controlledContextDrawerTooth,
	controlledSetContextDrawerTooth,
}: UseOdontogramDrawersStateParams) {
	const [internalContextDrawerTooth, setInternalContextDrawerTooth] = useState<
		number | null
	>(null);
	const contextDrawerTooth =
		controlledContextDrawerTooth !== undefined
			? controlledContextDrawerTooth
			: internalContextDrawerTooth;
	const setContextDrawerTooth =
		controlledSetContextDrawerTooth ?? setInternalContextDrawerTooth;

	const [endoDrawerTooth, setEndoDrawerTooth] = useState<number | null>(null);
	const [isPlanWizardOpen, setIsPlanWizardOpen] = useState<boolean>(false);
	const [isOrthoCephOpen, setIsOrthoCephOpen] = useState<boolean>(false);
	const [isSmartOpgOpen, setIsSmartOpgOpen] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
	const [orthoDrawerTooth, setOrthoDrawerTooth] = useState<number | null>(null);
	const [activeJawModalTarget, setActiveJawModalTarget] = useState<
		"JU" | "JL" | "C" | null
	>(null);

	return {
		contextDrawerTooth,
		setContextDrawerTooth,
		endoDrawerTooth,
		setEndoDrawerTooth,
		isPlanWizardOpen,
		setIsPlanWizardOpen,
		isOrthoCephOpen,
		setIsOrthoCephOpen,
		isSmartOpgOpen,
		setIsSmartOpgOpen,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		orthoDrawerTooth,
		setOrthoDrawerTooth,
		activeJawModalTarget,
		setActiveJawModalTarget,
	};
}
