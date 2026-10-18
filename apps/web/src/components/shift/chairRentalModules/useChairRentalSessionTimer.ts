import { useEffect, useState } from "react";
import type { ChairRentalModel } from "@dental/shared";

export interface UseChairRentalSessionTimerParams {
	initialRentalActive?: boolean;
	initialChairId?: string;
	onRentalSessionChange?: (session: { isActive: boolean; chairId: string; startedAt?: string }) => void;
}

export function useChairRentalSessionTimer(params: UseChairRentalSessionTimerParams) {
	const [isRentalActive, setIsRentalActive] = useState<boolean>(params.initialRentalActive ?? false);
	const [selectedChairId, setSelectedChairId] = useState<string>(params.initialChairId ?? "chair-01");
	const [rentalStartedAt, setRentalStartedAt] = useState<Date | null>(null);
	const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState<number>(0);

	useEffect(() => {
		let cancelled = false;
		async function loadRentalSession() {
			try {
				const res = await fetch("/api/doctor/chair-rental/session");
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data?.session) return;
				if (data.session.isActive) {
					setIsRentalActive(true);
					if (data.session.chairId) setSelectedChairId(data.session.chairId);
					if (data.session.startedAt) setRentalStartedAt(new Date(data.session.startedAt));
					if (typeof data.session.elapsedMinutes === "number") setSessionElapsedMinutes(data.session.elapsedMinutes);
				}
			} catch {}
		}
		void loadRentalSession();
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		if (!isRentalActive || !rentalStartedAt) return;
		const interval = setInterval(() => {
			const now = new Date();
			const diffMins = Math.max(0, Math.floor((now.getTime() - rentalStartedAt.getTime()) / 60000));
			setSessionElapsedMinutes(diffMins);
		}, 10000);
		return () => clearInterval(interval);
	}, [isRentalActive, rentalStartedAt]);

	const handleStartRentalSession = async (model: ChairRentalModel, rateRub: number) => {
		const now = new Date();
		setIsRentalActive(true);
		setRentalStartedAt(now);
		setSessionElapsedMinutes(0);
		params.onRentalSessionChange?.({ isActive: true, chairId: selectedChairId, startedAt: now.toISOString() });
		try {
			await fetch("/api/doctor/chair-rental/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "start", chairId: selectedChairId, model, rateRub }),
			});
		} catch {}
	};

	const handleStopRentalSession = async () => {
		setIsRentalActive(false);
		params.onRentalSessionChange?.({ isActive: false, chairId: selectedChairId });
		try {
			await fetch("/api/doctor/chair-rental/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "stop", chairId: selectedChairId }),
			});
		} catch {}
	};

	return {
		isRentalActive,
		selectedChairId,
		setSelectedChairId,
		sessionElapsedMinutes,
		handleStartRentalSession,
		handleStopRentalSession,
	};
}
