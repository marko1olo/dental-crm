import {
	type MdlpCarpuleQueueItem,
	type SeniorNurseDisposalActData,
	formatSeniorNurseDisposalActData,
} from "@dental/shared";
import { showToast } from "../../GlobalToast.js";

export interface BackgroundDisposalActOptions {
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly organizationName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationAddress?: string | undefined;
	readonly departmentName?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly approverName?: string | undefined;
	readonly approverRole?: "doctor" | "senior_nurse" | "administrator" | "authorized_staff" | undefined;
	readonly onApproveAct?: ((actData: SeniorNurseDisposalActData) => void | Promise<void>) | undefined;
	readonly notes?: string | undefined;
}

export async function executeSeniorNurseDisposalActInBackground(
	options: BackgroundDisposalActOptions,
): Promise<SeniorNurseDisposalActData> {
	const now = new Date();
	const actNumber = `СПИС-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${String((now.getTime() % 900) + 100)}`;
	const actDate = now.toISOString().slice(0, 10);
	const approverRole = options.approverRole ?? "doctor";
	const approverName = options.approverName ?? "Врач-стоматолог";

	const actData = formatSeniorNurseDisposalActData({
		actNumber,
		actDate,
		organizationName: options.organizationName ?? 'ООО "ДЕНТЕ КЛИНИК"',
		organizationInn: options.organizationInn ?? "",
		organizationAddress: options.organizationAddress ?? "",
		departmentName: options.departmentName ?? "Стоматологическое отделение",
		cabinetName: options.cabinetName ?? "Кабинет №1 (Терапия / Хирургия)",
		approverRole,
		approverName,
		approvedByFullName: approverName,
		approvedByPositionRu:
			approverRole === "doctor"
				? "Врач-стоматолог (дежурный)"
				: approverRole === "senior_nurse"
					? "Дежурная медицинская сестра"
					: "Уполномоченный сотрудник клиники",
		paperJournalAcknowledged: true,
		isSingleSigner: true,
		notes: options.notes ?? "Фоновое списание пустых карпул по СанПиН 3.3686-21",
		items: options.items,
	});

	if (options.onApproveAct) {
		await options.onApproveAct(actData);
	}

	showToast(
		`Акт списания карпул №${actNumber} утверждён в фоновом режиме по СанПиН 3.3686-21`,
		"info",
	);

	return actData;
}
