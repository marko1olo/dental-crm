/**
 * @dental/web/components/anesthesia/DirectAnesthesiaLauncher.tsx
 * Standalone Direct Mount for Chairside Anesthesia (Mandates 8b 60-100 lines, 8e, 8aq)
 * Listens for #anesthesia, #narcotics, #emergency hashes, query params and dente:open-anesthesia event.
 */

import { Syringe, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ChairsideAnesthesiaQuickBar } from "./ChairsideAnesthesiaQuickBar";

export const DirectAnesthesiaLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("anesthesia") ||
			h.includes("anesthesia") ||
			h.includes("narcotics") ||
			h.includes("emergency")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-anesthesia", handleOpen);
		window.addEventListener("dente:open-anesthesia", handleOpen);
		const handleHash = () => {
			const h = window.location.hash || "";
			const s = window.location.search || "";
			if (
				h.includes("anesthesia") ||
				h.includes("narcotics") ||
				h.includes("emergency") ||
				s.includes("anesthesia")
			) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleHash);
		return () => {
			window.removeEventListener("dente-open-anesthesia", handleOpen);
			window.removeEventListener("dente:open-anesthesia", handleOpen);
			window.removeEventListener("hashchange", handleHash);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("anesthesia");
			const cleanHash = window.location.hash.replace(/#(anesthesia|narcotics|emergency)/g, "");
			window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + cleanHash);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6"
			data-testid="direct-anesthesia-launcher-modal"
			onClick={handleClose}
		>
			<div
				className="w-full max-w-4xl bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[92vh]"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<div className="w-9 h-9 rounded-xl bg-[#0d9488] text-white flex items-center justify-center">
							<Syringe size={20} />
						</div>
						<div>
							<h2 className="text-base font-bold text-[var(--ink)]">Обезболивание у кресла</h2>
							<p className="text-xs text-[var(--muted)]">Мгновенный ввод дозы в дневник приёма • 1 клик</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleClose}
						aria-label="Закрыть"
						className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--paper-soft)] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center border border-transparent hover:border-[var(--line)] transition-colors"
					>
						<X size={20} />
					</button>
				</header>

				<ChairsideAnesthesiaQuickBar
					targetToothNumberFdi={16}
					patientWeightKg={70}
					onApplyAnesthesia={() => {
						setTimeout(handleClose, 1200);
					}}
				/>
			</div>
		</div>
	);
};

DirectAnesthesiaLauncher.displayName = "DirectAnesthesiaLauncher";
