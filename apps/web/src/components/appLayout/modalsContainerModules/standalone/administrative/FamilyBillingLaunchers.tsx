/**
 * FamilyBillingLaunchers — Семейный кошелек и сводный биллинг (Мандат 8b, <= 120 строк).
 * Чистый доменный язык без бюрократического мусора (Мандат 8ap).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { useAppStore } from "../../../../../store/appStore";

const FamilyCombinedBillingModal = lazyWithRetry(() =>
	import("../../../../finance/FamilyCombinedBillingModal").then((m) => ({
		default: m.FamilyCombinedBillingModal,
	})),
);

export function renderFamilyBillingLaunchers(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("family_billing") || h.includes("family-billing")) {
		const clinicProfile = useAppStore.getState().clinicProfileDraft;
		const clinicLegalName = clinicProfile?.legalName || clinicProfile?.clinicName || "Стоматология DENTE";
		const clinicInn = clinicProfile?.inn || "";

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка семейного биллинга..." />}>
				<FamilyCombinedBillingModal
					isOpen={true}
					familyGroupName="Семья Михайловых"
					availableFamilyWalletRub={18500}
					clinicName={clinicLegalName}
					clinicInn={clinicInn}
					initialPayer={{
						payerId: "pat_mikhailov",
						payerFullName: "Михайлов Артем Евгеньевич",
						payerInn: "",
						payerPhone: "+7 (926) 345-67-89",
						payerPassport: "45 12 789456",
					}}
					initialItems={[
						{
							id: "fam-item-1",
							patientId: "pat_mikhailov",
							patientFullName: "Михайлов А. Е.",
							relationship: "self",
							serviceName: "Лечение кариеса 3.6 (световая пломба)",
							serviceCode: "A16.07.002.001",
							code804n: "A16.07.002.001",
							priceRub: 7500,
							quantity: 1,
							taxDeductionCategory: "1",
						},
						{
							id: "fam-item-2",
							patientId: "pat_son",
							patientFullName: "Михайлов Денис Артемович (сын, 8 лет)",
							relationship: "child",
							serviceName: "Профгигиена детская и фторирование",
							serviceCode: "A16.07.051",
							code804n: "A16.07.051",
							priceRub: 4200,
							quantity: 1,
							taxDeductionCategory: "1",
						},
					]}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("family_billing");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("family-billing") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	return null;
}
