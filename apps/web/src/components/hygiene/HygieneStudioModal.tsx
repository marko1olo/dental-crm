/**
 * @dental/web/components/hygiene/HygieneStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия профессиональной гигиены, индекса OHI-S и домашнего ухода.
 * Соответствует Мандатам: 8b (<=300 строк), 8e (Автономия врача), 8am (Ровно 1 Primary CTA), 8ze (Apple HIG).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	CLEANING_PROTOCOLS,
	HOME_CARE_PLANS,
	createIdealOhiSTeethScores,
	computeCanonicalOhiS,
	type OhiSPreset,
	type CleaningProtocol,
	type HomeCarePlan,
	commitHygieneVisitProtocol,
	printHygieneHomeCareMemo,
} from "./hygieneCatalogData";
import { showToast } from "../GlobalToast";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { HygieneStudioOhisSection } from "./HygieneStudioOhisSection";
import { HygieneStudioProtocolSection } from "./HygieneStudioProtocolSection";
import { HygieneStudioHomeCareSection } from "./HygieneStudioHomeCareSection";
import { HygieneStudioFooter } from "./HygieneStudioFooter";

export interface HygieneStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly previousOhiS?: { ohi_s: number; date?: string } | number | null | undefined;
}

export const HygieneStudioModal: React.FC<HygieneStudioModalProps> = ({
	isOpen,
	onClose,
	patientId,
	visitId,
	patientName = "Пациент приёма",
	doctorName,
	previousOhiS,
}) => {
	const [dynamicPreviousOhiS, setDynamicPreviousOhiS] = useState<{ ohi_s: number; date?: string } | number | null>(null);

	useEffect(() => {
		if (!patientId?.trim() || previousOhiS !== undefined) return;
		let isCancelled = false;
		async function loadLatest() {
			try {
				const res = await fetch(`/api/patients/${encodeURIComponent(patientId!)}/hygiene-indices/latest`, {
					headers: getDenteAuthHeaders(),
				});
				if (!res.ok) return;
				const json = await res.json();
				if (!isCancelled && json?.latest?.ohi_s != null) {
					setDynamicPreviousOhiS(json.latest);
				}
			} catch (err) {
				console.warn("[HygieneStudio] Failed to load latest hygiene indices:", err);
			}
		}
		void loadLatest();
		return () => { isCancelled = true; };
	}, [patientId, previousOhiS]);

	const effectivePreviousOhiS = previousOhiS !== undefined ? previousOhiS : dynamicPreviousOhiS;

	// Начальный расчет OHI-S: честная физиологическая норма (0.0) без симуляций
	const [ohisTeeth, setOhisTeeth] = useState<Record<number, { debris: number; calculus: number }>>(() => {
		return createIdealOhiSTeethScores();
	});
	const calculatedOhiS = useMemo(() => computeCanonicalOhiS(ohisTeeth), [ohisTeeth]);
	const [selectedOhiS, setSelectedOhiS] = useState<OhiSPreset>(calculatedOhiS);

	useEffect(() => {
		setSelectedOhiS(calculatedOhiS);
	}, [calculatedOhiS]);

	const [selectedProtocol, setSelectedProtocol] = useState<CleaningProtocol>(CLEANING_PROTOCOLS[0]!);
	const [selectedCarePlan, setSelectedCarePlan] = useState<HomeCarePlan>(HOME_CARE_PLANS[0]!);
	const [activeSection, setActiveSection] = useState<"protocol" | "homecare">("protocol");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const previousScore = useMemo<number | null>(() => {
		if (effectivePreviousOhiS === null || effectivePreviousOhiS === undefined) return null;
		if (typeof effectivePreviousOhiS === "number") return effectivePreviousOhiS;
		return typeof effectivePreviousOhiS.ohi_s === "number" ? effectivePreviousOhiS.ohi_s : null;
	}, [effectivePreviousOhiS]);

	const dynamicsInfo = useMemo(() => {
		if (previousScore === null) return null;
		const diff = previousScore - selectedOhiS.score;
		if (diff > 0) {
			const pct = previousScore > 0 ? Math.round((diff / previousScore) * 100) : 0;
			return {
				text: `Было: ${previousScore.toFixed(1)} ➔ Текущий OHI-S: ${selectedOhiS.score.toFixed(1)} (Улучшение на ${pct}% 🟢)`,
				isPositive: true,
			};
		}
		if (diff < 0) {
			return {
				text: `Было: ${previousScore.toFixed(1)} ➔ Текущий OHI-S: ${selectedOhiS.score.toFixed(1)} (Увеличение отложений ⚠️)`,
				isPositive: false,
			};
		}
		return {
			text: `Было: ${previousScore.toFixed(1)} ➔ Текущий OHI-S: ${selectedOhiS.score.toFixed(1)} (Без изменений)`,
			isPositive: true,
		};
	}, [previousScore, selectedOhiS.score]);

	const handleCommit = useCallback(async () => {
		setIsSubmitting(true);
		try {
			commitHygieneVisitProtocol({
				ohiS: selectedOhiS,
				protocol: selectedProtocol,
				carePlan: selectedCarePlan,
				patientName,
				doctorName,
			});

			if (visitId?.trim()) {
				try {
					const idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: `idemp-hygiene-${Date.now()}`;
					const res = await fetch(`/api/visits/${encodeURIComponent(visitId)}/hygiene-indices`, {
						method: "POST",
						headers: getDenteAuthHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": idempotencyKey,
						}),
						body: JSON.stringify({
							ohi_s: selectedOhiS.score,
							debris: selectedOhiS.debris,
							calculus: selectedOhiS.calculus,
							date: new Date().toISOString(),
							rating: selectedOhiS.id,
							protocolId: selectedProtocol.id,
							carePlanId: selectedCarePlan.id,
						}),
					});
					if (!res.ok) {
						console.warn("[HygieneStudioModal] Failed to persist hygiene indices on server:", res.status, res.statusText);
						showToast("Индексы гигиены зафиксированы в карте приёма (сервер вернул " + res.status + ")", "info", 3500);
					}
				} catch (netErr) {
					console.warn("[HygieneStudioModal] Network/offline persistence fallback:", netErr);
					showToast("Индексы гигиены зафиксированы в локальной карте приёма", "info", 3000);
				}
			}
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	}, [selectedOhiS, selectedProtocol, selectedCarePlan, patientName, doctorName, visitId, onClose]);

	const handlePrint = useCallback(() => {
		printHygieneHomeCareMemo({
			patientName: patientName || "Пациент приёма",
			doctorName: doctorName || "Лечащий врач",
			carePlan: selectedCarePlan,
			ohiS: selectedOhiS,
		});
	}, [patientName, doctorName, selectedCarePlan, selectedOhiS]);

	const handleCopyMemo = useCallback(() => {
		const text = [
			`Рекомендации по домашнему уходу — ${patientName}`,
			`Индекс гигиены OHI-S: ${selectedOhiS.score} (${selectedOhiS.label})`,
			`1. Основная щетка: ${selectedCarePlan.toothbrush}`,
			`2. Монопучковая: ${selectedCarePlan.monotuft}`,
			`3. Ершики: ${selectedCarePlan.interdental}`,
			`4. Паста: ${selectedCarePlan.toothpaste}`,
			`5. Ирригатор: ${selectedCarePlan.irrigator}`,
			`Контрольный осмотр через ${selectedCarePlan.recallMonths} месяцев.`,
		].join("\n");

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			showToast("Памятка домашнего ухода скопирована в буфер", "success", 2500);
		}
	}, [patientName, selectedOhiS, selectedCarePlan]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
			data-testid="hygiene-studio-modal"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="flex sm:hidden justify-center pt-2.5 pb-1 w-full bg-[var(--paper-soft)] cursor-grab">
					<div
						className="w-9 h-1.5 rounded-full bg-[var(--line)]"
						data-testid="hygiene-drag-handle"
					/>
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper)] gap-2">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-[var(--primary-strong)] shrink-0 animate-pulse" />
							<h2 className="text-sm sm:text-base font-semibold text-[var(--ink)] leading-tight">
								Профессиональная гигиена и профилактика
							</h2>
						</div>
						<p className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
							<span className="font-medium text-[var(--ink)]">{patientName}</span>
							<span className="hidden sm:inline"> • Индекс OHI-S • Экспресс-протоколы чистки • Памятка ухода</span>
							<span className="sm:hidden"> • OHI-S и профилактика</span>
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-lg bg-transparent border-none text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						aria-label="Закрыть студию гигиены"
					>
						✕
					</button>
				</div>

				{/* Dynamics Banner */}
				{dynamicsInfo && (
					<div
						className="px-4 sm:px-6 py-2 bg-[var(--primary-soft)] border-b border-[var(--line)] flex items-center justify-between text-xs"
						data-testid="ohi-s-dynamics-banner"
					>
						<span className="font-medium text-[var(--ink)]">
							Динамика гигиены между приёмами: {dynamicsInfo.text}
						</span>
						<span className="text-[var(--ink-muted)] hidden sm:inline">
							Предыдущий замер сохранён в ЭМК
						</span>
					</div>
				)}

				{/* Sub-navigation tabs */}
				<div className="flex border-b border-[var(--line)] px-4 sm:px-6 bg-[var(--paper)] gap-2">
					<button
						type="button"
						onClick={() => setActiveSection("protocol")}
						className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 bg-transparent transition-colors ${
							activeSection === "protocol"
								? "border-[var(--primary)] text-[var(--primary)]"
								: "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						Протокол чистки у кресла
					</button>
					<button
						type="button"
						onClick={() => setActiveSection("homecare")}
						className={`py-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 bg-transparent transition-colors ${
							activeSection === "homecare"
								? "border-[var(--primary)] text-[var(--primary)]"
								: "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						Памятка домашнего ухода
					</button>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
					<HygieneStudioOhisSection
						ohisTeeth={ohisTeeth}
						setOhisTeeth={setOhisTeeth}
						selectedOhiS={selectedOhiS}
					/>

					{activeSection === "protocol" ? (
						<HygieneStudioProtocolSection
							selectedProtocol={selectedProtocol}
							setSelectedProtocol={setSelectedProtocol}
						/>
					) : (
						<HygieneStudioHomeCareSection
							selectedCarePlan={selectedCarePlan}
							setSelectedCarePlan={setSelectedCarePlan}
						/>
					)}
				</div>

				{/* Floating Bottom Bar (Mandate 8am: Exactly ONE Primary CTA) */}
				<HygieneStudioFooter
					onClose={onClose}
					handlePrint={handlePrint}
					handleCopyMemo={handleCopyMemo}
					handleCommit={handleCommit}
					isSubmitting={isSubmitting}
				/>
			</div>
		</div>
	);
};

HygieneStudioModal.displayName = "HygieneStudioModal";
export default HygieneStudioModal;
