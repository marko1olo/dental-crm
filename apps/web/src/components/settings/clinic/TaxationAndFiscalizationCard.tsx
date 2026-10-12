/**
 * apps/web/src/components/settings/clinic/TaxationAndFiscalizationCard.tsx
 *
 * Налогообложение (СНО) и фискальный регистратор ККТ по 54-ФЗ (ФФД 1.2):
 * - Прямая синхронизация с PostgreSQL 18 (`organizations.workspace_feature_flags` и `cash_boxes`)
 * - Выбор режима СНО: УСН 6% (Доходы), УСН 15% (Доходы минус расходы), Патент (ПСН), ОСНО
 * - Привязка физического кассового аппарата ККТ: модель (АТОЛ, Штрих-М, Эвотор), заводской № ККТ, филиал и касса
 * - Настройка оператора фискальных данных (ОФД), автономного буфера ФН и агентских расчетов
 *
 * Decomposed under Mandate 8b & 8s into modular subcomponents in `./taxationModules/`.
 */

import { CheckCircle2, Loader2, Receipt } from "lucide-react";
import type React from "react";
import { FiscalAgentSettings } from "./taxationModules/FiscalAgentSettings";
import { KktConnectionCard } from "./taxationModules/KktConnectionCard";
import type { TaxationSystem } from "./taxationModules/TaxationCardTypes";
import { TaxSystemSelector } from "./taxationModules/TaxSystemSelector";
import { useClinicFiscalSettings } from "./taxationModules/useClinicFiscalSettings";

export type { TaxationSystem };

export const TaxationAndFiscalizationCard: React.FC = () => {
	const {
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
	} = useClinicFiscalSettings();

	return (
		<article
			style={{ padding: "20px" }}
			className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 space-y-4 shadow-xs"
			data-testid="taxation-and-fiscalization-card"
		>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--primary)] flex items-center justify-center shrink-0">
						<Receipt size={18} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="font-bold text-base text-[var(--ink)] m-0">
								Налогообложение (СНО) и касса 54-ФЗ
							</h3>
							<span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]">
								ФФД {ffdVersion} · {kkmModel}
							</span>
							{saveStatus === "saved" && !isLoading && (
								<span
									className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--line)]"
									data-testid="fiscal-save-status-badge"
								>
									Синхронизировано с БД
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">
							Режим налогообложения клиники, привязка фискального регистратора
							ККТ и передача чеков в ОФД
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => void saveTaxation()}
					disabled={isSaving}
					data-testid="btn-save-fiscal-settings"
					className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs text-[13px] inline-flex items-center gap-1.5 font-semibold shrink-0 self-start sm:self-auto cursor-pointer transition-all"
				>
					{isSaving ? (
						<Loader2 size={16} className="w-4 h-4 animate-spin shrink-0" />
					) : (
						<CheckCircle2 size={16} className="w-4 h-4 shrink-0" />
					)}
					<span>{isSaving ? "Сохранение..." : "Применить СНО и ККТ"}</span>
				</button>
			</div>

			{/* 1. Taxation System Selector (4 Statutory Modes) */}
			<TaxSystemSelector
				activeTaxation={activeTaxation}
				onSelectTaxation={(sys) => {
					setActiveTaxation(sys);
					setSaveStatus("idle");
				}}
			/>

			{/* 2. KKT Fiscal Register Hardware Binding */}
			<KktConnectionCard
				kkmActive={kkmActive}
				kkmModel={kkmModel}
				kkmSerialNumber={kkmSerialNumber}
				branchId={branchId}
				cashBoxName={cashBoxName}
				onToggleKkmActive={(active) => {
					setKkmActive(active);
					setSaveStatus("idle");
				}}
				onChangeKkmModel={(model) => {
					setKkmModel(model);
					setSaveStatus("idle");
				}}
				onChangeSerialNumber={(serial) => {
					setKkmSerialNumber(serial);
					setSaveStatus("idle");
				}}
				onChangeBranch={(branch) => {
					setBranchId(branch);
					setSaveStatus("idle");
				}}
				onChangeCashBoxName={(name) => {
					setCashBoxName(name);
					setSaveStatus("idle");
				}}
			/>

			{/* 3. OFD Operator, FFD Protocol, Buffer & Fiscal Agent */}
			<FiscalAgentSettings
				ofdProvider={ofdProvider}
				ffdVersion={ffdVersion}
				autoSendReceipt={autoSendReceipt}
				allowAutonomousBuffer={allowAutonomousBuffer}
				agentSign={agentSign}
				onChangeOfdProvider={(provider) => {
					setOfdProvider(provider);
					setSaveStatus("idle");
				}}
				onChangeFfdVersion={(version) => {
					setFfdVersion(version);
					setSaveStatus("idle");
				}}
				onToggleAutoSendReceipt={(autoSend) => {
					setAutoSendReceipt(autoSend);
					setSaveStatus("idle");
				}}
				onToggleAutonomousBuffer={(buffer) => {
					setAllowAutonomousBuffer(buffer);
					setSaveStatus("idle");
				}}
				onChangeAgentSign={(sign) => {
					setAgentSign(sign);
					setSaveStatus("idle");
				}}
			/>
		</article>
	);
};
