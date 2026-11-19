import React, { useState, useEffect, useMemo } from "react";
import type { ToothData } from "../../odontogram/ToothChart";
import { TOOTH_STATE_LABELS } from "../../odontogram/chart/types/toothStateLabels";
import { loadStoredTeethData } from "../../odontogram/odontogramStorage";

export interface MobilePatientToothQuadrantSelectorProps {
	readonly patientId?: string | undefined;
	readonly teethData?: readonly ToothData[] | undefined;
	readonly onSelectTooth?: ((tooth: number) => void) | undefined;
}

export const MobilePatientToothQuadrantSelector: React.FC<MobilePatientToothQuadrantSelectorProps> = ({
	patientId,
	teethData: propTeethData,
	onSelectTooth,
}) => {
	const [activeQuadrant, setActiveQuadrant] = useState<1 | 2 | 3 | 4>(1);
	const [liveTeeth, setLiveTeeth] = useState<readonly ToothData[]>(() => {
		if (propTeethData && propTeethData.length > 0) return propTeethData;
		if (patientId) {
			const stored = loadStoredTeethData(patientId);
			if (stored && stored.length > 0) return stored;
		}
		return propTeethData || [];
	});

	useEffect(() => {
		if (propTeethData && propTeethData.length > 0) {
			setLiveTeeth(propTeethData);
		} else if (patientId) {
			const stored = loadStoredTeethData(patientId);
			if (stored && stored.length > 0) {
				setLiveTeeth(stored);
			}
		}
	}, [propTeethData, patientId]);

	useEffect(() => {
		if (typeof window === "undefined" || !patientId) return;
		const handleOdontogramUpdate = (e: Event) => {
			const customEvt = e as CustomEvent<{
				patientId?: string;
				teethData?: ToothData[];
				teeth?: ToothData[];
				toothNumber?: number;
				status?: string;
			}>;
			if (!customEvt.detail) return;
			if (customEvt.detail.patientId && customEvt.detail.patientId !== patientId) return;
			const incoming = customEvt.detail.teethData || customEvt.detail.teeth;
			if (incoming && Array.isArray(incoming) && incoming.length > 0) {
				setLiveTeeth(incoming);
			} else {
				const stored = loadStoredTeethData(patientId);
				if (stored && stored.length > 0) {
					setLiveTeeth(stored);
				}
			}
		};
		window.addEventListener("dente-odontogram-update", handleOdontogramUpdate);
		return () => {
			window.removeEventListener("dente-odontogram-update", handleOdontogramUpdate);
		};
	}, [patientId]);

	const teethMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		for (const t of liveTeeth) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [liveTeeth]);

	const teethList =
		activeQuadrant === 1
			? [18, 17, 16, 15, 14, 13, 12, 11]
			: activeQuadrant === 2
				? [21, 22, 23, 24, 25, 26, 27, 28]
				: activeQuadrant === 3
					? [31, 32, 33, 34, 35, 36, 37, 38]
					: [48, 47, 46, 45, 44, 43, 42, 41];

	const handleToothClick = (tooth: number) => {
		if (onSelectTooth) {
			onSelectTooth(tooth);
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-select-tooth", {
					detail: { toothNumber: tooth, patientId },
				}),
			);
		}
	};

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2.5">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-bold text-[var(--muted)] m-0">Зубная формула (Квадранты)</h3>
				<span className="text-[11px] text-[var(--muted)]">Взрослая (FDI)</span>
			</div>

			<div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				{([1, 2, 3, 4] as const).map((q) => (
					<button
						key={q}
						type="button"
						onClick={() => setActiveQuadrant(q)}
						className={`min-h-[44px] py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							activeQuadrant === q
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid={`btn-quadrant-${q}`}
					>
						Q{q} {q === 1 ? "18-11" : q === 2 ? "21-28" : q === 3 ? "31-38" : "48-41"}
					</button>
				))}
			</div>

			<div className="grid grid-cols-4 gap-2 pt-1">
				{teethList.map((tooth) => {
					const toothInfo = teethMap.get(tooth);
					const rawState = toothInfo?.state || "Healthy";
					const isHealthy = rawState === "Healthy";
					const statusLabel =
						TOOTH_STATE_LABELS[rawState] ||
						(isHealthy ? "Норма" : rawState);

					return (
						<button
							key={tooth}
							type="button"
							onClick={() => handleToothClick(tooth)}
							className="min-h-[48px] h-12 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--primary)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-xs font-bold text-[var(--ink)]"
							data-testid={`btn-quadrant-tooth-${tooth}`}
						>
							<span className={`text-sm font-black ${isHealthy ? "text-[var(--primary)]" : "text-[var(--danger,#ef4444)]"}`}>
								{tooth}
							</span>
							<span className="text-[10px] text-[var(--muted)] font-normal capitalize truncate max-w-[64px]">
								{statusLabel}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
MobilePatientToothQuadrantSelector.displayName = "MobilePatientToothQuadrantSelector";
