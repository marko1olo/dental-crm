import { useState, useEffect, useCallback, useMemo } from "react";
import { clientLogger } from "../../../services/logging/clientLogger";
import type { ToothComplaint } from "./TelegramInteractiveToothPicker";
import type { FamilyMember } from "./TelegramMiniAppTopHeader";
import type { TelegramTab } from "./TelegramMiniAppView";

const VALID_TELEGRAM_TABS: ReadonlySet<string> = new Set([
	"teeth",
	"odontogram",
	"booking",
	"emr",
	"cabinet",
	"appointments",
	"imaging",
	"tax",
	"finance",
]);

function isTelegramTab(value: string | null): value is TelegramTab {
	return value !== null && VALID_TELEGRAM_TABS.has(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getTelegramWebApp(): Record<string, unknown> | undefined {
	if (typeof window === "undefined") return undefined;
	const tg: unknown = Reflect.get(window, "Telegram");
	if (!isObjectRecord(tg)) return undefined;
	const webApp: unknown = tg.WebApp;
	return isObjectRecord(webApp) ? webApp : undefined;
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

	const rawTabParam = searchParams?.get("tab") ?? null;
	const urlTab: TelegramTab | null = isTelegramTab(rawTabParam) ? rawTabParam : null;
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
		const tg = getTelegramWebApp();
		if (tg) {
			if (typeof tg.ready === "function") {
				Reflect.apply(tg.ready, tg, []);
			}
			if (typeof tg.expand === "function") {
				Reflect.apply(tg.expand, tg, []);
			}
			if (isObjectRecord(tg.initDataUnsafe) && isObjectRecord(tg.initDataUnsafe.user)) {
				const firstName = tg.initDataUnsafe.user.first_name;
				if (typeof firstName === "string" && firstName.length > 0) {
					setPatientName(firstName);
				}
			}
		}
	}, []);

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			const tg = getTelegramWebApp();
			if (tg && isObjectRecord(tg.HapticFeedback) && typeof tg.HapticFeedback.impactOccurred === "function") {
				Reflect.apply(tg.HapticFeedback.impactOccurred, tg.HapticFeedback, [style]);
			}
		} catch (err) {
			clientLogger.warn("[useTelegramMiniAppState] Haptic feedback unavailable:", err);
		}
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
