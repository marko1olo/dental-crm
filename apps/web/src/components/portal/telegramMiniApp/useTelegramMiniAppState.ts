import { useState, useEffect, useCallback, useMemo } from "react";
import type { ToothComplaint } from "./TelegramInteractiveToothPicker";
import type { FamilyMember } from "./TelegramMiniAppTopHeader";
import type { TelegramTab } from "./TelegramMiniAppView";

export function useTelegramMiniAppState(initialTab?: TelegramTab) {
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

	const [toothComplaints, setToothComplaints] = useState<ToothComplaint[]>([
		{ toothNumber: 16, complaintType: "acute_throbbing", symptomLabel: "Острая пульсирующая боль", painLevel: 4, cito: true, notes: "Болит при накусывании 2 дня" },
	]);
	const [patientName, setPatientName] = useState<string>("Александр");
	const [familyMembers] = useState<FamilyMember[]>([
		{ id: "self", name: "Александр", relation: "self" },
		{ id: "child-1", name: "Артём (сын)", relation: "child", age: 8 },
		{ id: "child-2", name: "София (дочь)", relation: "child", age: 12 },
	]);
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");
	const [npsScore, setNpsScore] = useState<number | null>(null);
	const [npsSubmitted, setNpsSubmitted] = useState<boolean>(false);

	useEffect(() => {
		const tg = (window as any).Telegram?.WebApp;
		if (tg) {
			tg.ready?.();
			tg.expand?.();
			if (tg.initDataUnsafe?.user?.first_name) setPatientName(tg.initDataUnsafe.user.first_name);
		}
	}, []);

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch {}
	}, []);

	return {
		activeTab,
		setActiveTab,
		isTaxSheetRequested,
		toothComplaints,
		setToothComplaints,
		patientName,
		familyMembers,
		activeFamilyMemberId,
		setActiveFamilyMemberId,
		npsScore,
		setNpsScore,
		npsSubmitted,
		setNpsSubmitted,
		triggerHaptic,
	};
}
