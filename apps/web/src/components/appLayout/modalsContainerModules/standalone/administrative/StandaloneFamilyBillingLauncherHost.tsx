/**
 * StandaloneFamilyBillingLauncherHost — честный хост семейного сводного биллинга.
 *
 * Семейная группа, баланс и плательщик приходят из базы: ?patientId →
 * GET /api/finance/family/patient/:patientId. Состав счетов пользователь
 * набирает в самой модалке (как в живом разделе «Финансы») — никаких
 * вбитых «демо-семей» и выдуманных родственников.
 */

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { useAppStore } from "../../../../../store/appStore";
import { showToast } from "../../../../GlobalToast";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import { type LauncherFamilyGroup, fetchLauncherFamilyGroup, fetchLauncherPatient } from "../launcherFinanceApi";

const FamilyCombinedBillingModal = lazyWithRetry(() =>
	import("../../../../finance/FamilyCombinedBillingModal").then((m) => ({
		default: m.FamilyCombinedBillingModal,
	})),
);

export const StandaloneFamilyBillingLauncherHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const [family, setFamily] = useState<LauncherFamilyGroup | null>(null);
	const [payerName, setPayerName] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const profile = useAppStore((s) => s.clinicProfileDraft);

	useEffect(() => {
		if (!patientId) {
			setIsLoading(false);
			return;
		}
		let cancelled = false;
		void (async () => {
			const [group, patient] = await Promise.all([
				fetchLauncherFamilyGroup(patientId),
				fetchLauncherPatient(patientId),
			]);
			if (cancelled) return;
			if (!group) {
				showToast("У этого пациента нет семейного счёта.", "info");
				onClose();
				return;
			}
			setFamily(group);
			setPayerName(patient?.fullName || group.headPatientName || "");
			setIsLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [patientId, onClose]);

	if (!patientId) {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Семейный биллинг открывается по пациенту — владельцу семейного счёта. Добавьте ?patientId= в ссылку или откройте его из карточки пациента."
				testId="standalone-family-billing-missing-state"
				onClose={onClose}
			/>
		);
	}
	if (isLoading) return <AppLoadingState message="Загрузка семейного счёта из базы..." />;
	if (!family) return null;

	return (
		<FamilyCombinedBillingModal
			isOpen={true}
			familyGroupId={family.id}
			familyGroupName={family.name?.trim() || "Семейная группа"}
			availableFamilyWalletRub={family.balanceRub}
			initialPayer={{
				payerId: patientId,
				payerFullName: payerName || "Ответственный плательщик",
			}}
			clinicName={profile?.legalName || profile?.clinicName || ""}
			clinicInn={profile?.inn || ""}
			onClose={onClose}
		/>
	);
};
