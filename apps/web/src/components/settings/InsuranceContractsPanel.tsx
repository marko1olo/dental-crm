/**
 * Договоры ДМС клиники: страховые компании и процент покрытия по категориям
 * услуг. Вкладка «Настройки → Страховые», покрытие применяется в сравнительном
 * конструкторе смет.
 *
 * Что здесь было сломано и почему разбор ответа живёт отдельным модулем —
 * в ./insuranceContractsPanelData.ts. Коротко: отказ чтения показывался как
 * «Договоров ДМС нет», а при отказе сохранения администратору печатался
 * английский машинный код сервера.
 */

import { Edit2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { actionFailureToast, panelStateText } from "../../lib/panelStateText";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	INSURANCE_CONTRACTS_PANEL_SUBJECT,
	type InsuranceContract,
	type InsuranceContractsLoadState,
	parseInsuranceContractsPayload,
} from "./insuranceContractsPanelData";
import { SettingsModuleDisabled } from "./SettingsModuleDisabled";
import { INSURANCE_CONTRACTS_GATE } from "./settingsModuleGate";

interface ContractFormData {
	companyName: string;
	policyNumberMask: string;
	coverageTherapyPct: string;
	coverageSurgeryPct: string;
	coverageOrthoPct: string;
	coverageHygienePct: string;
	annualLimitRub: string;
}

const defaultForm = (): ContractFormData => ({
	companyName: "",
	policyNumberMask: "",
	coverageTherapyPct: "0",
	coverageSurgeryPct: "0",
	coverageOrthoPct: "0",
	coverageHygienePct: "0",
	annualLimitRub: "",
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

	const paperBg = "var(--paper)";
	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

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
				console.error("[договоры ДМС] не прочитаны, ответ", outcome.status);
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
			console.error("[договоры ДМС] запрос не дошёл до сервера", err);
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
				console.error("[договоры ДМС] не сохранён, ответ", res.status);
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
			console.error("[договоры ДМС] сохранение не дошло до сервера", err);
			showToast(actionFailureToast(failedAction, null), "error");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeactivate = async (contract: InsuranceContract) => {
		if (
			!window.confirm(
				`Убрать договор «${contract.companyName}» из работы? В новых сметах его покрытие применяться не будет. Уже посчитанные сметы не изменятся.`,
			)
		)
			return;
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
				console.error("[договоры ДМС] не убран из работы, ответ", res.status);
				showToast(actionFailureToast(failedAction, res.status), "error");
				return;
			}
			showToast(`Договор «${contract.companyName}» убран из работы`, "success");
			await fetchContracts();
		} catch (err) {
			console.error("[договоры ДМС] удаление не дошло до сервера", err);
			showToast(actionFailureToast(failedAction, null), "error");
		}
	};

	/*
	 * ПАНЕЛЬ СПРАШИВАЕТ ТОТ ЖЕ ПРИЗНАК, ЧТО И КНОПКА ЕЁ ВКЛАДКИ.
	 *
	 * Кнопку «Страховые» отсеивает `if (!flags.hasInsuranceCoPay)` в SettingsView,
	 * а панель признака не спрашивала — и открывалась по адресу
	 * `#settings/insurance` при выключенном ДМС. Клиника, не работающая по ДМС,
	 * видела экран договоров, которого в её меню нет. Источник признака тот же
	 * (useWorkspaceProfile), поэтому разойтись им больше негде. Выход стоит ПОСЛЕ
	 * всех хуков: правила хуков React не позволяют вернуться раньше их вызова —
	 * поэтому сам признак прочитан выше, вместе с остальными хуками.
	 */
	if (!insuranceEnabled) {
		return <SettingsModuleDisabled gate={INSURANCE_CONTRACTS_GATE} />;
	}

	const coverageCategories: Array<{
		label: string;
		key: keyof ContractFormData;
	}> = [
		{ label: "Терапия", key: "coverageTherapyPct" },
		{ label: "Хирургия", key: "coverageSurgeryPct" },
		{ label: "Ортодонтия", key: "coverageOrthoPct" },
		{ label: "Гигиена", key: "coverageHygienePct" },
	];

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
						Страховые компании и покрытие по категориям услуг. Используются в
						Сравнительном конструкторе смет.
					</p>
				</div>
				<button type="button" className="primary-button" onClick={openAddModal}>
					<Plus size={16} /> Добавить договор
				</button>
			</div>

			{/*
				ТРИ СОСТОЯНИЯ, А НЕ ДВА.

				БЫЛО: `isLoading ? загрузка : contracts.length === 0 ? «Договоров ДМС
				нет» : список`. Под «нет» попадал и непрочитанный список — при 401 у
				незакрытой смены или сбое базы экран навсегда утверждал, что у клиники
				нет ни одного договора. Администратор заводил их заново (дубли) или
				считал смету без страховой доли.
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
				<div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
					<ShieldCheck
						size={40}
						strokeWidth={1}
						className="opacity-40 mb-3 mx-auto"
					/>
					<p className="m-0 text-base">
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyTitle}
					</p>
					<p className="mt-1.5 mb-0 text-xs text-slate-400">
						{INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyHint}
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{contracts.map((contract) => (
						<div
							key={contract.id}
							className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm"
						>
							<div className="flex justify-between items-start flex-wrap gap-3">
								<div>
									<h3 className="m-0 text-base font-semibold text-slate-900 dark:text-white">
										{contract.companyName}
									</h3>
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
											width: 34,
											height: 34,
											borderRadius: 8,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										title="Редактировать"
									>
										<Edit2 size={14} />
									</button>
									<button
										type="button"
										onClick={() => handleDeactivate(contract)}
										style={{
											background: "rgba(239,68,68,0.15)",
											color: "var(--tomato, #ef4444)",
											border: "none",
											width: 34,
											height: 34,
											borderRadius: 8,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										title="Удалить"
									>
										<Trash2 size={14} />
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
					))}
				</div>
			)}

			{/* Add/Edit Modal */}
			{showModal && (
				<button
					type="button"
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						background: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "100%",
						border: "none",
						padding: 0,
						margin: 0,
						textAlign: "inherit",
						font: "inherit",
					}}
					onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
					onKeyDown={(e) => {
						if (
							e.target === e.currentTarget &&
							(e.key === "Enter" || e.key === " ")
						) {
							setShowModal(false);
						}
					}}
				>
					<div
						style={{
							background: paperBg,
							width: 520,
							maxWidth: "95vw",
							maxHeight: "90vh",
							overflowY: "auto",
							borderRadius: 20,
							padding: 28,
							border: `1px solid ${borderColor}`,
							boxShadow: "0 32px 64px rgba(0,0,0,0.3)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 24,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 20,
									fontWeight: 700,
									color: "var(--ink)",
								}}
							>
								{editingContract
									? "Редактировать договор"
									: "Добавить договор ДМС"}
							</h2>
							<button
								type="button"
								onClick={() => setShowModal(false)}
								style={{
									background: "none",
									border: "none",
									fontSize: 20,
									cursor: "pointer",
									color: "var(--muted)",
									padding: 4,
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleSave}
							style={{ display: "flex", flexDirection: "column", gap: 18 }}
						>
							{/* Company name */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									htmlFor="insurance-company-name"
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Страховая компания *
								</label>
								<input
									id="insurance-company-name"
									type="text"
									required
									value={formData.companyName}
									onChange={(e) =>
										setFormData({ ...formData, companyName: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="СОГАЗ, Ингосстрах, АльфаСтрахование..."
								/>
							</div>

							{/* Policy mask */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									htmlFor="insurance-policy-mask"
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Маска номера полиса (опционально)
								</label>
								<input
									id="insurance-policy-mask"
									type="text"
									value={formData.policyNumberMask}
									onChange={(e) =>
										setFormData({
											...formData,
											policyNumberMask: e.target.value,
										})
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="ХХХХ-ХХХХ-ХХХХ"
								/>
							</div>

							{/* Coverage fields */}
							<div>
								<p
									style={{
										margin: "0 0 10px 0",
										fontSize: 13,
										fontWeight: 600,
										color: "var(--ink)",
									}}
								>
									Покрытие по категориям (%)
								</p>
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: 12,
									}}
								>
									{coverageCategories.map(({ label, key }) => (
										<div
											key={key}
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 5,
											}}
										>
											<label
												htmlFor={`insurance-coverage-${key}`}
												style={{
													fontSize: 12,
													color: "var(--muted)",
													fontWeight: 500,
												}}
											>
												{label}
											</label>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												<input
													id={`insurance-coverage-${key}`}
													type="number"
													min="0"
													max="100"
													step="1"
													value={formData[key]}
													onChange={(e) =>
														setFormData({ ...formData, [key]: e.target.value })
													}
													style={{
														flex: 1,
														padding: "9px 12px",
														borderRadius: 8,
														border: `1px solid ${borderColor}`,
														background: paperSoftBg,
														color: "var(--ink)",
														outline: "none",
													}}
												/>
												<span style={{ color: "var(--muted)", fontSize: 14 }}>
													%
												</span>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Annual limit */}
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								<label
									htmlFor="insurance-annual-limit"
									style={{
										fontSize: 13,
										color: "var(--muted)",
										fontWeight: 500,
									}}
								>
									Годовой лимит (₽, опционально)
								</label>
								<input
									id="insurance-annual-limit"
									type="number"
									min="0"
									value={formData.annualLimitRub}
									onChange={(e) =>
										setFormData({ ...formData, annualLimitRub: e.target.value })
									}
									style={{
										padding: "10px 14px",
										borderRadius: 8,
										border: `1px solid ${borderColor}`,
										background: paperSoftBg,
										color: "var(--ink)",
										outline: "none",
									}}
									placeholder="120000"
								/>
							</div>

							{/*
								Кнопка молчала на время запроса: нажатие не давало никакого
								отклика, и по второму-третьему нажатию уходило столько же
								запросов на создание — то есть дубли договоров делались самой
								кнопкой.
							*/}
							<button
								type="submit"
								className="primary-button"
								disabled={isSaving}
								style={{ justifyContent: "center", marginTop: 4 }}
							>
								{isSaving
									? "Сохраняем…"
									: editingContract
										? "Сохранить изменения"
										: "Добавить договор"}
							</button>
						</form>
					</div>
				</button>
			)}
		</div>
	);
};
