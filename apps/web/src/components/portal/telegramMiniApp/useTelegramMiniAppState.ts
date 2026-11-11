import { useState, useEffect, useCallback, useMemo } from "react";
import type { ToothComplaint } from "./TelegramInteractiveToothPicker";
import type { FamilyMember } from "./TelegramMiniAppTopHeader";
import type { TelegramTab } from "./TelegramMiniAppView";

interface TelegramWebAppWindow {
	Telegram?: {
		WebApp?: {
			ready?: () => void;
			expand?: () => void;
			initDataUnsafe?: {
				user?: {
					first_name?: string;
				};
			};
			HapticFeedback?: {
				impactOccurred?: (style: "light" | "medium" | "heavy") => void;
			};
		};
	};
}

export interface UseTelegramMiniAppStateOptions {
	initialComplaints?: ToothComplaint[] | undefined;
	initialPatientName?: string | undefined;
	initialFamilyMembers?: readonly FamilyMember[] | undefined;
	initialBonusPoints?: number | undefined;
}

export function useTelegramMiniAppState(initialTab?: TelegramTab, options?: UseTelegramMiniAppStateOptions) {
	const searchParams = useMemo(() => {
		if (typeof window === "undefined") return null;
		const hashQuery = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
		const searchStr = window.location.search ? window.location.search.replace(/^\?/, "") : "";
		const combined = [searchStr, hashQuery].filter(Boolean).join("&");
		return new URLSearchParams(combined);
	}, []);

	const urlTab = (searchParams?.get("tab") as TelegramTab | null) ?? null;
	const isTaxSheetRequested = searchParams?.get("taxSheet") === "1" || searchParams?.get("taxSheet") === "true";
	const [activeTab, setActiveTab] = useState<TelegramTab>(urlTab ?? initialTab ?? "cabinet");

	const [toothComplaints, setToothComplaints] = useState<ToothComplaint[]>(() => options?.initialComplaints ?? []);
	const [patientName, setPatientName] = useState<string>(() => options?.initialPatientName ?? "");
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => (options?.initialFamilyMembers ? [...options.initialFamilyMembers] : []));
	const [bonusPoints, setBonusPoints] = useState<number>(() => options?.initialBonusPoints ?? 0);
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");
	const [npsScore, setNpsScore] = useState<number | null>(null);
	const [npsSubmitted, setNpsSubmitted] = useState<boolean>(false);

	useEffect(() => {
		const tg = (window as unknown as TelegramWebAppWindow).Telegram?.WebApp;
		if (tg) {
			tg.ready?.();
			tg.expand?.();
			if (tg.initDataUnsafe?.user?.first_name) setPatientName(tg.initDataUnsafe.user.first_name);
		}
	}, []);

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			(window as unknown as TelegramWebAppWindow).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {}
	}, []);

	return {
		activeTab,
		setActiveTab,
		isTaxSheetRequested,
		toothComplaints,
		setToothComplaints,
		patientName,
		setPatientName,
		familyMembers,
		setFamilyMembers,
		bonusPoints,
		setBonusPoints,
		activeFamilyMemberId,
		setActiveFamilyMemberId,
		npsScore,
		setNpsScore,
		npsSubmitted,
		setNpsSubmitted,
		triggerHaptic,
	};
}
