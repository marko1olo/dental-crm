import { useCallback, useEffect, useState } from "react";
import type { QuestStep } from "../trainingTourModules/trainingTourTypes";

export function useTargetMeasurement(
	isOpen: boolean,
	currentStep: QuestStep | null,
	setCurrentView: (view: string) => void,
) {
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

	const updateTargetMeasurement = useCallback(() => {
		if (!isOpen || !currentStep) {
			setTargetRect(null);
			return;
		}
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (targetEl) {
				const rect = targetEl.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					setTargetRect(rect);
					return;
				}
			}
		} catch { /* Fallback */ }
		setTargetRect(null);
	}, [isOpen, currentStep]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const el = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (el && typeof el.getBoundingClientRect === "function") {
				const rect = el.getBoundingClientRect();
				if ((rect.top < 16 || rect.left < 16 || rect.bottom > window.innerHeight - 16 || rect.right > window.innerWidth - 16) && typeof el.scrollIntoView === "function") {
					el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
				}
			}
		} catch { /* Non-blocking */ }
	}, [isOpen, currentStep]);

	useEffect(() => {
		if (!isOpen || !currentStep) return;
		let rafId: number | null = null;
		const scheduleUpdate = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => { updateTargetMeasurement(); });
		};
		scheduleUpdate();
		const retryTimers = [50, 120, 250, 500, 1000].map((d) => setTimeout(scheduleUpdate, d));
		let mutationObserver: MutationObserver | null = null;
		if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
			mutationObserver = new MutationObserver(() => scheduleUpdate());
			mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
		}
		let resizeObserver: ResizeObserver | null = null;
		let targetEl: HTMLElement | null = null;
		try {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (targetEl && typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(() => scheduleUpdate());
				resizeObserver.observe(targetEl);
			}
		} catch { /* Ignore */ }
		window.addEventListener("resize", scheduleUpdate, { passive: true });
		window.addEventListener("scroll", scheduleUpdate, true);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			retryTimers.forEach(clearTimeout);
			if (mutationObserver) mutationObserver.disconnect();
			if (resizeObserver && targetEl) resizeObserver.disconnect();
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", scheduleUpdate, true);
		};
	}, [isOpen, currentStep, updateTargetMeasurement]);

	useEffect(() => {
		if (!isOpen || !currentStep?.viewTarget) return;
		const timer = setTimeout(() => {
			const sel = currentStep.targetSelector;
			const fb = currentStep.fallbackTargetSelector;
			const targetEl = document.querySelector<HTMLElement>(sel) || (fb ? document.querySelector<HTMLElement>(fb) : null);
			if (!targetEl && currentStep.viewTarget) {
				const currentHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
				if (currentHash !== currentStep.viewTarget) {
					setCurrentView(currentStep.viewTarget);
					window.location.hash = `#${currentStep.viewTarget}`;
				}
			}
		}, 150);
		return () => clearTimeout(timer);
	}, [isOpen, currentStep, setCurrentView]);

	return { targetRect };
}
