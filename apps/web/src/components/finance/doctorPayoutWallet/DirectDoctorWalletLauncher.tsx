/**
 * apps/web/src/components/finance/doctorPayoutWallet/DirectDoctorWalletLauncher.tsx
 *
 * Direct standalone launcher for Doctor Payout Mobile Wallet (SSOT).
 * Mandate 8b (<= 100 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree).
 * Allows instant, robust standalone deep-linking to DoctorPayoutMobileWallet.
 */

import React, { Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DoctorPayoutMobileWallet } from "./DoctorPayoutMobileWallet";
import { DEMO_SHOWCASE_REPORT } from "./demoShowcaseData";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

export const DirectDoctorWalletLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		return (
			s.includes("wallet") ||
			h.includes("wallet") ||
			h.includes("doctor-wallet") ||
			s.includes("doctor_wallet")
		);
	});

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		window.addEventListener("dente-open-doctor-wallet", handleOpen);
		window.addEventListener("dente:open-doctor-wallet", handleOpen);

		const handleHashChange = () => {
			const s = window.location.search || "";
			const h = window.location.hash || "";
			if (
				s.includes("wallet") ||
				h.includes("wallet") ||
				h.includes("doctor-wallet") ||
				s.includes("doctor_wallet")
			) {
				setIsOpen(true);
			}
		};
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("dente-open-doctor-wallet", handleOpen);
			window.removeEventListener("dente:open-doctor-wallet", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("wallet");
			url.searchParams.delete("doctor_wallet");
			const cleanHash = window.location.hash.replace(/#wallet|#doctor-wallet/g, "");
			const newUrl = url.pathname + (url.search ? url.search : "") + cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	const isDemo = isDemoShowcaseMode();
	const activeMonth = isDemo ? "2026-10" : new Date().toISOString().slice(0, 7);

	return (
		<div
			id="direct-doctor-wallet-overlay"
			data-testid="doctor-wallet-standalone-workspace"
			className="fixed inset-0 z-[9999] bg-[var(--canvas)]/95 backdrop-blur-md overflow-y-auto p-2 sm:p-4 flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label="Мобильный расчётный кошелёк врача"
		>
			<div className="max-w-md w-full mx-auto flex-1 flex flex-col">
				<div className="flex items-center justify-between pb-2 border-b border-[var(--line)] mb-3">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)]" />
						<span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
							Кошелёк начислений врача
						</span>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
						aria-label="Закрыть кошелёк"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1">
					<Suspense
						fallback={
							<div className="p-8 text-center text-[var(--muted)]">
								Загрузка кошелька врача...
							</div>
						}
					>
						<DoctorPayoutMobileWallet
							report={isDemo ? DEMO_SHOWCASE_REPORT : null}
							month={activeMonth}
							onMonthChange={() => {}}
							onRefresh={() => {
								if (typeof window !== "undefined") window.location.reload();
							}}
							onOpenPayrollModal={() => {}}
							canEditRates={false}
							isLoading={false}
							onRequestPayout={(doc, amountKop) => {
								alert(`Запрос на выплату: ${doc.doctorName}, ${(amountKop / 100).toLocaleString("ru-RU")} ₽`);
							}}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export default DirectDoctorWalletLauncher;
