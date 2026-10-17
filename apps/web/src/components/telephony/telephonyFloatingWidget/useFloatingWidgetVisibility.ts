import { useEffect, useRef, useState } from "react";
import type { IncomingCallPayload } from "../../../store/telephonyStore";
import type { TelephonyWidgetTab } from "./types";

interface UseFloatingWidgetVisibilityParams {
	defaultExpanded?: boolean;
	showDialerDefault?: boolean;
	activeCall: IncomingCallPayload | null;
	isCallHistoryModalOpen: boolean;
}

export function useFloatingWidgetVisibility({
	defaultExpanded = false,
	showDialerDefault = false,
	activeCall,
	isCallHistoryModalOpen,
}: UseFloatingWidgetVisibilityParams) {
	const initialOpen = defaultExpanded || showDialerDefault || Boolean(activeCall) || isCallHistoryModalOpen;
	const [isExpanded, setIsExpanded] = useState(initialOpen);
	const [isOpen, setIsOpen] = useState(initialOpen);
	const [activeTab, setActiveTab] = useState<TelephonyWidgetTab>(
		showDialerDefault ? "dialer" : isCallHistoryModalOpen ? "history" : "call",
	);
	const [dialNumber, setDialNumber] = useState("");
	const [showTranscript, setShowTranscript] = useState(false);
	const [showTransferPanel, setShowTransferPanel] = useState(false);
	const [transferType, setTransferType] = useState<"blind" | "attended">("blind");
	const [showWidgetMoreMenu, setShowWidgetMoreMenu] = useState(false);
	const dialInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (activeCall) {
			setIsOpen(true);
			const isMobileScreen = typeof window !== "undefined" && window.innerWidth <= 768;
			setIsExpanded(!isMobileScreen);
			setActiveTab("call");
		} else if (isCallHistoryModalOpen) {
			setIsOpen(true);
			setIsExpanded(true);
			setActiveTab("history");
		} else if (!defaultExpanded) {
			setIsOpen(false);
			setIsExpanded(false);
		}

		const handleResize = () => {
			if (activeCall && typeof window !== "undefined" && window.innerWidth <= 768) {
				setIsExpanded(false);
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [activeCall, isCallHistoryModalOpen, defaultExpanded]);

	useEffect(() => {
		if (!isExpanded) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsExpanded(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isExpanded]);

	useEffect(() => {
		if (!showWidgetMoreMenu) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setShowWidgetMoreMenu(false);
		};
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (
				!target.closest('[data-testid="widget-more-menu-btn"]') &&
				!target.closest('[data-testid="widget-more-menu-dropdown"]')
			) {
				setShowWidgetMoreMenu(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("mousedown", handleClickOutside);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showWidgetMoreMenu]);

	return {
		isExpanded,
		setIsExpanded,
		isOpen,
		setIsOpen,
		activeTab,
		setActiveTab,
		dialNumber,
		setDialNumber,
		dialInputRef,
		showTranscript,
		setShowTranscript,
		showTransferPanel,
		setShowTransferPanel,
		transferType,
		setTransferType,
		showWidgetMoreMenu,
		setShowWidgetMoreMenu,
	};
}
