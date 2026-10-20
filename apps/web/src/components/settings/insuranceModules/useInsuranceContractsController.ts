/**
 * apps/web/src/components/settings/insuranceModules/useInsuranceContractsController.ts
 *
 * Controller hook for DMS Insurance Contracts Panel.
 * Handles data fetching, payload validation, modal form state, registry export, and mutations.
 */

import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useSettingsDerivations } from "../../../useSettingsDerivations";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { ContractFormData } from "../insurance/InsuranceContractModal";
import {
	type InsuranceContract,
	type InsuranceContractsLoadState,
	parseInsuranceContractsPayload,
} from "../insuranceContractsPanelData";
import {
	clampPct,
	defaultContractFormData,
	type GuaranteeLetterSummary,
} from "./insuranceContractsTypes";

export function useInsuranceContractsController() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations);
	const { auth } = mergedProps;

	const flags = useWorkspaceProfile();
	const insuranceEnabled = flags.hasInsuranceCoPay;

	const [contracts, setContracts] = useState<InsuranceContract[]>([]);
	const [guaranteeLetters, setGuaranteeLetters] = useState<
		GuaranteeLetterSummary[]
	>([]);
	const [loadState, setLoadState] = useState<InsuranceContractsLoadState>({
		phase: "loading",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [editingContract, setEditingContract] =
		useState<InsuranceContract | null>(null);
	const [formData, setFormData] = useState<ContractFormData>(
		defaultContractFormData(),
	);

	const fetchContracts = useCallback(async () => {
		setLoadState({ phase: "loading" });
		try {
			const [res, lettersRes] = await Promise.all([
				fetch("/api/insurance/contracts", {
					headers: auth.denteClinicalReadHeaders(),
				}),
				fetch("/api/insurance/guarantee-letters", {
					headers: auth.denteClinicalReadHeaders(),
				}).catch(() => null),
			]);
			if (lettersRes?.ok) {
				try {
					const lettersData = (await lettersRes.json()) as unknown;
					if (Array.isArray(lettersData)) {
						setGuaranteeLetters(lettersData as GuaranteeLetterSummary[]);
					}
				} catch {
					// non-blocking
				}
			}
			const raw = await res.text();
			const outcome = parseInsuranceContractsPayload(res.status, raw);
			if (!outcome.ok) {
				logger.error("[договоры ДМС] не прочитаны, ответ", outcome.status);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			setContracts(outcome.contracts);
			setLoadState({ phase: "ready" });
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[договоры ДМС] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, [auth]);

	const handleExportRegistry = useCallback(
		async (format: "xml" | "csv") => {
			try {
				const res = await fetch(`/api/insurance/registry?format=${format}`, {
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!res.ok) {
					showToast("Не удалось сформировать реестр счетов ДМС", "error");
					return;
				}
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `dms-registry-${new Date().toISOString().slice(0, 10)}.${format}`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				showToast(
					`Реестр оказанных услуг ДМС (${format.toUpperCase()}) сформирован`,
					"success",
				);
			} catch {
				showToast("Ошибка при выгрузке реестра счетов ДМС", "error");
			}
		},
		[auth],
	);

	useEffect(() => {
		if (!insuranceEnabled) return;
		void fetchContracts();
	}, [fetchContracts, insuranceEnabled]);

	const openAddModal = () => {
		setEditingContract(null);
		setFormData(defaultContractFormData());
		setShowModal(true);
	};

	const openEditModal = (contract: InsuranceContract) => {
		setEditingContract(contract);
		setFormData({
			companyName: contract.companyName,
			policyNumberMask: contract.policyNumberMask ?? "",
			coverageTherapyPct: String(contract.coverageTherapyPct),
			coverageSurgeryPct: String(contract.coverageSurgeryPct),
			coverageOrthoPct: String(contract.coverageOrthoPct),
			coverageHygienePct: String(contract.coverageHygienePct),
			annualLimitRub:
				contract.annualLimitRub != null ? String(contract.annualLimitRub) : "",
			patientFranchisePct: String(contract.patientFranchisePct ?? 0),
			requiresGuaranteeLetter: Boolean(contract.requiresGuaranteeLetter),
		});
		setShowModal(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.companyName.trim()) return;

		const payload = {
			companyName: formData.companyName.trim(),
			policyNumberMask: formData.policyNumberMask.trim() || undefined,
			coverageTherapyPct: clampPct(formData.coverageTherapyPct),
			coverageSurgeryPct: clampPct(formData.coverageSurgeryPct),
			coverageOrthoPct: clampPct(formData.coverageOrthoPct),
			coverageHygienePct: clampPct(formData.coverageHygienePct),
			annualLimitRub: formData.annualLimitRub
				? parseInt(formData.annualLimitRub, 10) || undefined
				: undefined,
			patientFranchisePct: clampPct(formData.patientFranchisePct),
			requiresGuaranteeLetter: Boolean(formData.requiresGuaranteeLetter),
		};

		const failedAction = editingContract
			? `Договор «${payload.companyName}» не изменён`
			: `Договор «${payload.companyName}» не добавлен`;
		setIsSaving(true);
		try {
			let res: Response;
			if (editingContract) {
				res = await fetch(`/api/insurance/contracts/${editingContract.id}`, {
					method: "PUT",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
			} else {
				res = await fetch("/api/insurance/contracts", {
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				});
			}

			if (!res.ok) {
				logger.error("[договоры ДМС] не сохранён, ответ", res.status);
				showToast(actionFailureToast(failedAction, res.status), "error");
				return;
			}
			showToast(
				editingContract
					? `Договор «${payload.companyName}» изменён`
					: `Договор «${payload.companyName}» добавлен`,
				"success",
			);
			setShowModal(false);
			await fetchContracts();
		} catch (err) {
			logger.error("[договоры ДМС] сохранение не дошло до сервера", err);
			showToast(actionFailureToast(failedAction, null), "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeactivate = async (contract: InsuranceContract) => {
		const failedAction = `Договор «${contract.companyName}» не убран из работы`;
		try {
			const res = await fetch(`/api/insurance/contracts/${contract.id}`, {
				method: "DELETE",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!res.ok) {
				logger.error("[договоры ДМС] не убран из работы, ответ", res.status);
				showToast(actionFailureToast(failedAction, res.status), "error");
				return;
			}
			showToast(`Договор «${contract.companyName}» убран из работы`, "success");
			await fetchContracts();
		} catch (err) {
			logger.error("[договоры ДМС] удаление не дошло до сервера", err);
			showToast(actionFailureToast(failedAction, null), "error");
		}
	};

	return {
		insuranceEnabled,
		contracts,
		guaranteeLetters,
		loadState,
		fetchContracts,
		handleExportRegistry,
		showModal,
		setShowModal,
		openAddModal,
		openEditModal,
		editingContract,
		formData,
		setFormData,
		isSaving,
		handleSave,
		handleDeactivate,
	};
}
