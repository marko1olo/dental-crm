import { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast.js";
import {
	type EstimatorContract,
	estimatorContractFrom,
} from "../treatmentEstimatorPricing";
import { jsonObjectOrNull } from "../treatmentEstimatorTypes";

export function useEstimatorContract(insuranceContractId?: string | null, reloadToken = 0) {
	const [activeContract, setActiveContract] = useState<unknown>(null);
	const [contractFailure, setContractFailure] = useState<{ status: number | null } | null>(null);

	useEffect(() => {
		if (!insuranceContractId) {
			setActiveContract(null);
			setContractFailure(null);
			return;
		}
		let active = true;
		setContractFailure(null);

		const loadContract = async () => {
			try {
				const res = await fetch(`/api/insurance/contracts/${insuranceContractId}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(`[insurance contract] ${res.status} ${rawBody.slice(0, 300)}`);
					if (!active) return;
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				const contractData = jsonObjectOrNull(rawBody);
				if (!active) return;
				if (!contractData) {
					logger.error("[insurance contract] тело ответа не разобрано");
					setActiveContract(null);
					setContractFailure({ status: res.status });
					return;
				}
				setActiveContract(contractData);
			} catch (err) {
				showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
				logger.error("[insurance contract] запрос не выполнен", err);
				if (!active) return;
				setActiveContract(null);
				setContractFailure({ status: null });
			}
		};

		void loadContract();
		return () => {
			active = false;
		};
	}, [insuranceContractId, reloadToken]);

	const contract: EstimatorContract = useMemo(() => estimatorContractFrom(activeContract), [activeContract]);

	return { contract, contractFailure };
}
