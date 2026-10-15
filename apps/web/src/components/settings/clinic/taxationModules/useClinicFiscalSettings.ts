/**
 * apps/web/src/components/settings/clinic/taxationModules/useClinicFiscalSettings.ts
 *
 * Custom hook for loading and persisting clinic fiscal and taxation settings.
 * Synchronizes with Fastify `/api/settings/clinic/fiscal` and PostgreSQL 18.
 */

import { useCallback, useEffect, useState } from "react";
import type { Ffd12AgentSign } from "@dental/shared";
import { useOptionalAuthContext } from "../../../../contexts/AuthContext";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import {
	type CanonicalTaxationSystem,
	type FiscalSaveStatus,
	normalizeTaxationId,
} from "./TaxationCardTypes";

export function useClinicFiscalSettings() {
	const auth = useOptionalAuthContext();
	const [activeTaxation, setActiveTaxation] =
		useState<CanonicalTaxationSystem>("usn_income");
	const [ofdProvider, setOfdProvider] = useState<string>("platforma_ofd");
	const [ffdVersion, setFfdVersion] = useState<"1.2" | "1.05">("1.2");
	const [autoSendReceipt, setAutoSendReceipt] = useState<boolean>(true);
	const [allowAutonomousBuffer, setAllowAutonomousBuffer] =
		useState<boolean>(true);

	const [cashBoxId, setCashBoxId] = useState<string | null>(null);
	const [cashBoxName, setCashBoxName] = useState<string>("Основная");
	const [kkmModel, setKkmModel] = useState<string>("АТОЛ-55Ф");
	const [kkmSerialNumber, setKkmSerialNumber] =
		useState<string>("00108204958112");
	const [branchId, setBranchId] = useState<string>("main");
	const [kkmActive, setKkmActive] = useState<boolean>(true);
	const [agentSign, setAgentSign] = useState<Ffd12AgentSign | "none">("none");

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [saveStatus, setSaveStatus] = useState<FiscalSaveStatus>("saved");

	const buildHeaders = useCallback(
		(extra: Record<string, string> = {}): Record<string, string> => {
			const base = denteAdminSecretRequestHeaders(extra);
			if (auth && typeof auth.settingsAccessHeaders === "function") {
				return {
					...base,
					...auth.settingsAccessHeaders(),
					...extra,
				};
			}
			return base;
		},
		[auth],
	);

	useEffect(() => {
		let cancelled = false;
		async function loadFiscalSettings() {
			setIsLoading(true);
			try {
				const res = await fetch("/api/settings/clinic/fiscal", {
					method: "GET",
					headers: buildHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data) return;
				setActiveTaxation(normalizeTaxationId(data.taxationSystem));
				if (typeof data.ofdProvider === "string") {
					setOfdProvider(
						data.ofdProvider === "platform_ofd"
							? "platforma_ofd"
							: data.ofdProvider,
					);
				}
				if (data.ffdVersion === "1.05" || data.ffdVersion === "1.2") {
					setFfdVersion(data.ffdVersion);
				}
				if (typeof data.autoSendReceipt === "boolean") {
					setAutoSendReceipt(data.autoSendReceipt);
				}
				if (typeof data.allowAutonomousBuffer === "boolean") {
					setAllowAutonomousBuffer(data.allowAutonomousBuffer);
				}
				if (typeof data.cashBoxId === "string") {
					setCashBoxId(data.cashBoxId);
				}
				if (typeof data.cashBoxName === "string" && data.cashBoxName.trim()) {
					setCashBoxName(data.cashBoxName.trim());
				}
				if (typeof data.kkmModel === "string" && data.kkmModel.trim()) {
					setKkmModel(data.kkmModel.trim());
				}
				if (
					typeof data.kkmSerialNumber === "string" &&
					data.kkmSerialNumber.trim()
				) {
					setKkmSerialNumber(data.kkmSerialNumber.trim());
				}
				if (typeof data.branchId === "string" && data.branchId.trim()) {
					setBranchId(data.branchId.trim());
				}
				if (typeof data.kkmActive === "boolean") {
					setKkmActive(data.kkmActive);
				}
				if (typeof data.agentSign === "string") {
					setAgentSign(data.agentSign as Ffd12AgentSign | "none");
				}
			} catch {
				// Keep defaults if offline
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}
		void loadFiscalSettings();
		return () => {
			cancelled = true;
		};
	}, [buildHeaders]);

	const saveTaxation = async () => {
		if (isSaving) return;
		setIsSaving(true);
		setSaveStatus("idle");
		try {
			const res = await fetch("/api/settings/clinic/fiscal", {
				method: "PUT",
				headers: buildHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					taxationSystem: activeTaxation,
					ofdProvider,
					ffdVersion,
					autoSendReceipt,
					allowAutonomousBuffer,
					cashBoxId,
					cashBoxName: cashBoxName.trim() || "Основная",
					kkmModel: kkmModel.trim() || "АТОЛ-55Ф",
					kkmSerialNumber: kkmSerialNumber.trim() || "00108204958112",
					branchId: branchId.trim() || "main",
					kkmActive,
					agentSign: agentSign === "none" ? undefined : agentSign,
				}),
			});
			if (!res.ok) {
				throw new Error("Не удалось сохранить настройки кассы и СНО");
			}
			const updated = await res.json();
			setActiveTaxation(normalizeTaxationId(updated.taxationSystem));
			if (typeof updated.kkmModel === "string") setKkmModel(updated.kkmModel);
			if (typeof updated.kkmSerialNumber === "string") {
				setKkmSerialNumber(updated.kkmSerialNumber);
			}
			if (typeof updated.branchId === "string") setBranchId(updated.branchId);
			if (typeof updated.cashBoxId === "string") setCashBoxId(updated.cashBoxId);
			setSaveStatus("saved");
			showToast(
				"Настройки налогообложения (СНО) и кассы 54-ФЗ сохранены",
				"success",
			);
		} catch (err) {
			setSaveStatus("error");
			showToast(
				err instanceof Error
					? err.message
					: "Ошибка сохранения параметров кассы",
				"error",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return {
		activeTaxation,
		setActiveTaxation,
		ofdProvider,
		setOfdProvider,
		ffdVersion,
		setFfdVersion,
		autoSendReceipt,
		setAutoSendReceipt,
		allowAutonomousBuffer,
		setAllowAutonomousBuffer,
		cashBoxName,
		setCashBoxName,
		kkmModel,
		setKkmModel,
		kkmSerialNumber,
		setKkmSerialNumber,
		branchId,
		setBranchId,
		kkmActive,
		setKkmActive,
		agentSign,
		setAgentSign,
		isLoading,
		isSaving,
		saveStatus,
		setSaveStatus,
		saveTaxation,
	};
}
