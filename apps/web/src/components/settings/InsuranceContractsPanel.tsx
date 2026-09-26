/**
 * Договоры ДМС клиники: страховые компании и процент покрытия по категориям
 * услуг. Вкладка «Настройки → Страховые», покрытие применяется в сравнительном
 * конструкторе смет.
 *
 * Что здесь было сломано и почему разбор ответа живёт отдельным модулем —
 * в ./insuranceContractsPanelData.ts. Коротко: отказ чтения показывался как
 * «Договоров ДМС нет», а при отказе сохранения администратору печатался
 * английский машинный код сервера.
 *
 * Мандаты 8b, 8d: строго <= 800 строк, ноль мультяшных эмодзи.
 */

import { Edit2, FileCheck2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { actionFailureToast, panelStateText } from "../../lib/panelStateText";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	InsuranceContractModal,
	type ContractFormData,
} from "./insurance/InsuranceContractModal";
import {
	INSURANCE_CONTRACTS_PANEL_SUBJECT,
	type InsuranceContract,
	type InsuranceContractsLoadState,
	parseInsuranceContractsPayload,
} from "./insuranceContractsPanelData";
import { SettingsModuleDisabled } from "./SettingsModuleDisabled";
import { INSURANCE_CONTRACTS_GATE } from "./settingsModuleGate";

const defaultForm = (): ContractFormData => ({
	companyName: "",
	policyNumberMask: "",
	coverageTherapyPct: "0",
	coverageSurgeryPct: "0",
	coverageOrthoPct: "0",
	coverageHygienePct: "0",
	annualLimitRub: "",
	patientFranchisePct: "0",
	requiresGuaranteeLetter: false,
});

const clampPct = (v: string) => Math.min(100, Math.max(0, parseFloat(v) || 0));

export const InsuranceContractsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations);
	const { auth } = mergedProps;
	/* Признак модуля нужен и разметке (ниже), и загрузке: при выключенном ДМС
	   запрос за договорами уходил бы в никуда при каждом открытии адреса. */
	const flags = useWorkspaceProfile();
	const insuranceEnabled = flags.hasInsuranceCoPay;

	const [contracts, setContracts] = useState<InsuranceContract[]>([]);
	/*
	 * Загрузка / прочитано / отказ. Раньше здесь стоял один `isLoading`, и отказ
	 * сервера был неотличим от честной пустоты: список оставался пустым, а панель
	 * рисовала «Договоров ДМС нет» — навсегда, потому что всплывающее сообщение
	 * исчезает через несколько секунд.
	 */
	const [loadState, setLoadState] = useState<InsuranceContractsLoadState>({
		phase: "loading",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [editingContract, setEditingContract] =
		useState<InsuranceContract | null>(null);
	const [formData, setFormData] = useState<ContractFormData>(defaultForm());

	const fetchContracts = useCallback(async () => {
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/insurance/contracts", {
				headers: auth.denteClinicalReadHeaders(),
			});
			/* Тело читается строкой один раз: у res.json() на пустом ответе и на
			   HTML от прокси исключение с английским текстом. */
			const raw = await res.text();
			const outcome = parseInsuranceContractsPayload(res.status, raw);
			if (!outcome.ok) {
				// Код ответа нужен разработчику, а не администратору: в консоль.
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
			// До сервера не дошли вовсе: status = null, текст об этом так и скажет.
			logger.error("[договоры ДМС] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, [auth]);

	useEffect(() => {
		if (!insuranceEnabled) return;
		void fetchContracts();
	}, [fetchContracts, insuranceEnabled]);

	const openAddModal = () => {
		setEditingContract(null);
		setFormData(defaultForm());
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

		/*
		 * Что именно не получилось — в тексте отказа. Раньше здесь было «Ошибка
		 * сохранения» и, что хуже, поле `error` сервера: этот сервер кладёт туда
		 * машинный код по-английски («companyName is required», «Failed to create
		 * contract»), и администратор читал его дословно.
		 */
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
				/* Окно НЕ закрываем: введённое останется на экране, и его не придётся
				   набирать заново. Раньше окно закрывалось только при успехе — это
				   было верно, и здесь это сохранено явно. */
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
			// Текст исключения наружу не идёт ни при каких условиях: он английский.
			logger.error("[договоры ДМС] сохранение не дошло до сервера", err);
			showToast(actionFailureToast(failedAction, null), "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeactivate = async (contract: InsuranceContract) => {
		/*
		 * «Удалён» и «деактивирован» — разные обещания, а стояли оба сразу: вопрос
		 * говорил «Удалить договор», а сообщение об успехе — «Договор
		 * деактивирован». Сервер снимает признак isActive, то есть договор убирается
		 * из работы, а не стирается. Так и сказано в обоих текстах.
		 */
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

	/*
	 * ПАНЕЛЬ СПРАШИВАЕТ ТОТ ЖЕ ПРИЗНАК, ЧТО И КНОПКА ЕЁ ВКЛАДКИ.
	 */
	if (!insuranceEnabled) {
		return <SettingsModuleDisabled gate={INSURANCE_CONTRACTS_GATE} />;
	}

	return (
		<div className="py-2 text-slate-900 dark:text-slate-100">
			{/* Header */}
			<div className="flex justify-between items-start mb-6 flex-wrap gap-3">
				<div>
					<h2 className="m-0 text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
						<ShieldCheck size={22} className="text-emerald-500" />
						Договоры ДМС
					</h2>
					<p className="mt-1.5 mb-0 text-sm text-slate-500 dark:text-slate-400">
						Страховые компании, процент покрытия по категориям, франшиза и гарантийные письма. Используются в Сравнительном конструкторе смет.
					</p>
				</div>
				<button type="button" className="primary-button" onClick={openAddModal}>
					<Plus size={16} /> Добавить договор
				</button>
			</div>

			{/*
				ТРИ СОСТОЯНИЯ, А НЕ ДВА.
			*/}
			{loadState.phase === "failed" ? (
				<PanelLoadFailure
					subject={INSURANCE_CONTRACTS_PANEL_SUBJECT}
					status={loadState.status}
					onRetry={() => void fetchContracts()}
				/>
			) : loadState.phase === "loading" ? (
				<div
					className="p-12 text-center text-slate-500 dark:text-slate-400"
					role="status"
					aria-live="polite"
				>
					{
						panelStateText(INSURANCE_CONTRACTS_PANEL_SUBJECT, {
							phase: "loading",
						}).title
					}
				</div>
			) : contracts.length === 0 ? (
				<div
					className="rounded-2xl p-12 text-center border"
					style={{
						borderColor: "var(--line)",
						background: "var(--paper-soft)",
						color: "var(--muted)",
					}}
				>
					<ShieldCheck
						size={40}
						strokeWidth={1}
						className="opacity-40 mb-3 mx-auto"
					/>
					<p className="m-0 text-base font-semibold" style={{ color: "var(--ink)" }}>
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyTitle}
					</p>
					<p className="mt-1.5 mb-0 text-xs" style={{ color: "var(--muted)" }}>
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyHint}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{contracts.map((contract) => {
						const franchiseVal = contract.patientFranchisePct ?? 0;
						return (
							<div
								key={contract.id}
								className="rounded-2xl p-5 flex flex-col gap-4 border"
								style={{
									borderColor: "var(--line)",
									background: "var(--surface)",
									color: "var(--ink)",
								}}
							>
								<div className="flex justify-between items-start flex-wrap gap-3">
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="m-0 text-base font-semibold text-slate-900 dark:text-white">
												{contract.companyName}
											</h3>
											{franchiseVal > 0 ? (
												<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
													Франшиза {franchiseVal}% (со-оплата)
												</span>
											) : (
												<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
													Франшиза 0% (100% ДМС)
												</span>
											)}
											{contract.requiresGuaranteeLetter && (
												<span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
													<FileCheck2 size={12} />
													ГП обязательно
												</span>
											)}
										</div>
										{contract.policyNumberMask && (
											<p className="mt-1 mb-0 text-xs text-slate-500 dark:text-slate-400">
												Маска полиса: {contract.policyNumberMask}
											</p>
										)}
										{contract.annualLimitRub != null && (
											<p className="mt-1 mb-0 text-xs text-slate-500 dark:text-slate-400">
												Годовой лимит:{" "}
												{contract.annualLimitRub.toLocaleString("ru-RU")} ₽
											</p>
										)}
									</div>
									<div style={{ display: "flex", gap: 8 }}>
										<button
											type="button"
											onClick={() => openEditModal(contract)}
											style={{
												background: "rgba(245,158,11,0.15)",
												color: "var(--amber, #d97706)",
												border: "none",
												width: 36,
												height: 36,
												borderRadius: 8,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
											title="Редактировать договор"
										>
											<Edit2 size={16} />
										</button>
										<button
											type="button"
											onClick={() => handleDeactivate(contract)}
											style={{
												background: "rgba(239,68,68,0.15)",
												color: "var(--tomato, #ef4444)",
												border: "none",
												width: 36,
												height: 36,
												borderRadius: 8,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
											title="Убрать из работы"
										>
											<Trash2 size={16} />
										</button>
									</div>
								</div>

								{/* Coverage grid */}
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
									{[
										{ label: "Терапия", val: contract.coverageTherapyPct },
										{ label: "Хирургия", val: contract.coverageSurgeryPct },
										{ label: "Ортодонтия", val: contract.coverageOrthoPct },
										{ label: "Гигиена", val: contract.coverageHygienePct },
									].map(({ label, val }) => (
										<div
											key={label}
											className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3"
										>
											<div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
												{label}
											</div>
											<div
												className={`text-xl font-bold ${val > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
											>
												{val}%
											</div>
											{/* Visual bar */}
											<div className="h-1 rounded bg-slate-200 dark:bg-slate-700 mt-1.5 overflow-hidden">
												<div
													className={`h-full rounded transition-all duration-300 ${val > 0 ? "bg-emerald-500" : "bg-transparent"}`}
													style={{ width: `${val}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Add/Edit Modal */}
			<InsuranceContractModal
				isOpen={showModal}
				isSaving={isSaving}
				editingContract={editingContract}
				formData={formData}
				setFormData={setFormData}
				onClose={() => setShowModal(false)}
				onSave={handleSave}
			/>
		</div>
	);
};
