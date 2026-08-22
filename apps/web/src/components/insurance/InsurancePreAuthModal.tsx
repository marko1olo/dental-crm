import {
	AlertCircle,
	AlertTriangle,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Copy,
	Download,
	FileCheck,
	FileSpreadsheet,
	FileText,
	Info,
	Percent,
	Plus,
	Printer,
	Search,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	buildDmsReconciliationRegistry,
	calculateDmsCoPaymentSplit,
	type DmsBillableLineItem,
	type DmsGuaranteeLetter,
	type DmsSplitCalculationResult,
	exportDmsRegistryToCsv,
	formatCurrencyRub,
	kopecksToRubles,
	rublesToKopecks,
} from "./dmsSplitEngine.js";
import "./insurance.css";
import {
	DMS_EXCLUSION_RULES,
	DMS_PROGRAMS,
	type DmsInsurerDefinition,
	type DmsPolicy,
	type DmsProgramType,
	getDmsInsurerById,
	RUSSIAN_TOP_DMS_INSURERS,
	validateDmsPolicy,
} from "./insuranceCatalogs.js";

export interface InsurancePreAuthModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName: string;
		readonly birthDate?: string | undefined;
		readonly policyNumber?: string | undefined;
		readonly policySeries?: string | undefined;
		readonly insurerId?: string | undefined;
		readonly program?: DmsProgramType | undefined;
		readonly phone?: string | undefined;
	} | undefined;
	readonly initialServices?: readonly {
		readonly id: string;
		readonly serviceCode: string;
		readonly serviceName: string;
		readonly toothNumber?: string | undefined;
		readonly quantity: number;
		readonly unitPriceRubles: number;
	}[] | undefined;
	readonly onClaimApproved?: ((result: DmsSplitCalculationResult) => void) | undefined;
}

export const InsurancePreAuthModal: React.FC<InsurancePreAuthModalProps> = ({
	isOpen,
	onClose,
	patient,
	initialServices = [],
	onClaimApproved,
}) => {
	// 1. Полис ДМС
	const [selectedInsurerId, setSelectedInsurerId] = useState<string>(
		patient?.insurerId || "sogaz",
	);
	const [policyNumber, setPolicyNumber] = useState<string>(
		patient?.policyNumber || "77-ДМС-987654",
	);
	const [policySeries, setPolicySeries] = useState<string>(
		patient?.policySeries || "МСК",
	);
	const [selectedProgram, setSelectedProgram] = useState<DmsProgramType>(
		patient?.program || "extended",
	);
	const [franchiseType, setFranchiseType] = useState<"none" | "percent" | "fixed">("none");
	const [franchisePercent, setFranchisePercent] = useState<number>(20);
	const [franchiseFixedRub, setFranchiseFixedRub] = useState<number>(1000);
	const [validFrom, setValidFrom] = useState<string>("2026-01-01");
	const [validTo, setValidTo] = useState<string>("2026-12-31");

	// 2. Гарантийное письмо (ГП)
	const [hasGuaranteeLetter, setHasGuaranteeLetter] = useState<boolean>(true);
	const [letterNumber, setLetterNumber] = useState<string>("ГП-2026/8412");
	const [letterIssueDate, setLetterIssueDate] = useState<string>("2026-08-15");
	const [letterValidUntil, setLetterValidUntil] = useState<string>("2026-09-15");
	const [approvedLimitRub, setApprovedLimitRub] = useState<number>(25000);
	const [approvedTeethInput, setApprovedTeethInput] = useState<string>("16, 17, 26, 46");
	const [approvedCodesInput, setApprovedCodesInput] = useState<string>("A16.07.002, A16.07.030, A16.07.008");
	const [curatorName, setCuratorName] = useState<string>("Иванова Елена (Врач-эксперт)");
	const [curatorPhone, setCuratorPhone] = useState<string>("8 (800) 333-08-88 доб. 142");

	// 3. Таблица услуг для расчета
	const [billableItems, setBillableItems] = useState<DmsBillableLineItem[]>([]);
	const [newServiceCode, setNewServiceCode] = useState<string>("A16.07.002.001");
	const [newServiceName, setNewServiceName] = useState<string>("Восстановление зуба пломбой (нанокомпозит)");
	const [newToothNumber, setNewToothNumber] = useState<string>("16");
	const [newUnitPriceRub, setNewUnitPriceRub] = useState<number>(4500);
	const [newQuantity, setNewQuantity] = useState<number>(1);

	// Синхронизация при открытии
	useEffect(() => {
		if (isOpen) {
			if (initialServices.length > 0) {
				setBillableItems(
					initialServices.map((s) => ({
						id: s.id,
						serviceCode: s.serviceCode,
						serviceName: s.serviceName,
						toothNumber: s.toothNumber,
						quantity: s.quantity,
						unitPriceKopecks: rublesToKopecks(s.unitPriceRubles),
					})),
				);
			} else {
				// Демо-набор услуг по умолчанию
				setBillableItems([
					{
						id: "item-1",
						serviceCode: "A16.07.002.001",
						serviceName: "Восстановление зуба пломбой световой (кариес дентина)",
						toothNumber: "16",
						quantity: 1,
						unitPriceKopecks: rublesToKopecks(4800),
					},
					{
						id: "item-2",
						serviceCode: "A16.07.030.001",
						serviceName: "Инструментальная и медикаментозная обработка корневого канала",
						toothNumber: "17",
						quantity: 3,
						unitPriceKopecks: rublesToKopecks(2200),
					},
					{
						id: "item-3",
						serviceCode: "A16.07.050",
						serviceName: "Клиническое отбеливание зубов фотоактивируемое (Zoom)",
						toothNumber: "11-21",
						quantity: 1,
						unitPriceKopecks: rublesToKopecks(18000),
					},
					{
						id: "item-4",
						serviceCode: "A16.07.006",
						serviceName: "Установка дентального имплантата (Osstem TS III)",
						toothNumber: "36",
						quantity: 1,
						unitPriceKopecks: rublesToKopecks(35000),
					},
				]);
			}
		}
	}, [isOpen, initialServices]);

	// Полис
	const currentPolicy: DmsPolicy = useMemo(() => {
		return {
			id: `pol-${patient?.id || "demo"}`,
			insurerId: selectedInsurerId,
			policySeries: policySeries.trim() || undefined,
			policyNumber: policyNumber.trim(),
			program: selectedProgram,
			liabilityLimitKopecks: DMS_PROGRAMS[selectedProgram].defaultLimitKopecks,
			franchiseType,
			franchisePercent: franchiseType === "percent" ? franchisePercent : undefined,
			franchiseFixedKopecks: franchiseType === "fixed" ? rublesToKopecks(franchiseFixedRub) : undefined,
			validFrom,
			validTo,
			patientFullName: patient?.fullName || "Иванов Иван Иванович",
			patientBirthDate: patient?.birthDate || "1990-05-14",
		};
	}, [
		patient,
		selectedInsurerId,
		policySeries,
		policyNumber,
		selectedProgram,
		franchiseType,
		franchisePercent,
		franchiseFixedRub,
		validFrom,
		validTo,
	]);

	// Валидация полиса
	const policyValidation = useMemo(() => {
		return validateDmsPolicy(currentPolicy);
	}, [currentPolicy]);

	// Гарантийное письмо
	const currentLetter: DmsGuaranteeLetter | undefined = useMemo(() => {
		if (!hasGuaranteeLetter) return undefined;
		const teeth = approvedTeethInput
			.split(/[,;\s]+/)
			.map((t) => t.trim())
			.filter(Boolean);
		const codes = approvedCodesInput
			.split(/[,;\s]+/)
			.map((c) => c.trim())
			.filter(Boolean);

		return {
			id: `let-${letterNumber}`,
			letterNumber,
			issueDate: letterIssueDate,
			validUntil: letterValidUntil,
			maxApprovedAmountKopecks: rublesToKopecks(approvedLimitRub),
			insurerId: selectedInsurerId,
			patientFullName: patient?.fullName || "Иванов Иван Иванович",
			patientPolicyNumber: policyNumber,
			approvedTeethFdi: teeth,
			approvedServiceCodes804n: codes,
			curatorFullName: curatorName || undefined,
			curatorPhone: curatorPhone || undefined,
		};
	}, [
		hasGuaranteeLetter,
		letterNumber,
		letterIssueDate,
		letterValidUntil,
		approvedLimitRub,
		selectedInsurerId,
		patient,
		policyNumber,
		approvedTeethInput,
		approvedCodesInput,
		curatorName,
		curatorPhone,
	]);

	// Расчет сплита
	const splitResult: DmsSplitCalculationResult = useMemo(() => {
		return calculateDmsCoPaymentSplit(billableItems, {
			policy: currentPolicy,
			guaranteeLetter: currentLetter,
		});
	}, [billableItems, currentPolicy, currentLetter]);

	// Добавление услуги в список
	const handleAddService = () => {
		if (!newServiceName.trim()) return;
		const newItem: DmsBillableLineItem = {
			id: `item-${Date.now()}`,
			serviceCode: newServiceCode.trim() || "A16.07.001",
			serviceName: newServiceName.trim(),
			toothNumber: newToothNumber.trim() || undefined,
			quantity: Math.max(1, newQuantity),
			unitPriceKopecks: rublesToKopecks(Math.max(0, newUnitPriceRub)),
		};
		setBillableItems((prev) => [...prev, newItem]);
		setNewServiceName("");
		setNewUnitPriceRub(2000);
	};

	// Удаление услуги
	const handleRemoveService = (id: string) => {
		setBillableItems((prev) => prev.filter((item) => item.id !== id));
	};

	// Экспорт реестра в CSV
	const handleExportCsv = () => {
		const registry = buildDmsReconciliationRegistry({
			registryNumber: `РЕЕСТР-${new Date().toISOString().slice(0, 10)}/${policyNumber}`,
			insurerId: selectedInsurerId,
			periodStart: validFrom,
			periodEnd: validTo,
			splitResults: splitResult.lineItems.map((item) => ({
				patientFullName: patient?.fullName || "Иванов Иван Иванович",
				policyNumber,
				guaranteeLetterNumber: hasGuaranteeLetter ? letterNumber : undefined,
				serviceDate: new Date().toISOString().slice(0, 10),
				lineItem: item,
			})),
		});

		const csvData = exportDmsRegistryToCsv(registry);
		const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Реестр_ДМС_${selectedInsurerId}_${policyNumber}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Подтверждение и применение сплита
	const handleConfirmPreAuth = () => {
		if (onClaimApproved) {
			onClaimApproved(splitResult);
		}
		onClose();
	};

	if (!isOpen) return null;

	const modalContent = (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="dms-preauth-title">
			<div className="dms-modal-window" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="dms-modal-header">
					<div className="dms-modal-title" id="dms-preauth-title">
						<Shield className="text-teal-600" size={24} />
						<div>
							<div className="font-bold text-lg leading-tight">Авторизация ДМС и Расчет Сооплаты</div>
							<div className="text-xs font-normal text-muted">
								Калькулятор разделения счетов, лимитов гарантийных писем и исключений
							</div>
						</div>
					</div>
					<button
						type="button"
						className="dms-btn dms-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно авторизации ДМС"
					>
						<X size={20} />
					</button>
				</header>

				{/* Body */}
				<div className="dms-modal-body">
					{/* 1. Блок Страховой компании и Полиса */}
					<div className="p-4 rounded-xl border border-line bg-paper-soft flex flex-col gap-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2 font-bold text-sm">
								<ShieldCheck size={18} className="text-teal-600" />
								<span>Страховой полис ДМС</span>
							</div>
							<div className="text-xs text-muted">Пациент: <span className="font-semibold text-ink">{patient?.fullName || "Иванов И.И."}</span></div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							{/* Страховщик */}
							<div>
								<label htmlFor="dms-insurer-select" className="text-xs font-semibold text-muted block mb-1">
									Страховая компания
								</label>
								<select
									id="dms-insurer-select"
									value={selectedInsurerId}
									onChange={(e) => setSelectedInsurerId(e.target.value)}
									className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
								>
									{RUSSIAN_TOP_DMS_INSURERS.map((ins) => (
										<option key={ins.id} value={ins.id}>
											{ins.shortName}
										</option>
									))}
								</select>
							</div>

							{/* Номер и серия полиса */}
							<div>
								<label htmlFor="dms-policy-number" className="text-xs font-semibold text-muted block mb-1">
									Серия и Номер полиса
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										placeholder="Серия"
										value={policySeries}
										onChange={(e) => setPolicySeries(e.target.value)}
										className="w-20 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
									<input
										id="dms-policy-number"
										type="text"
										placeholder="Номер полиса"
										value={policyNumber}
										onChange={(e) => setPolicyNumber(e.target.value)}
										className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>
							</div>

							{/* Программа страхования */}
							<div>
								<label htmlFor="dms-program-select" className="text-xs font-semibold text-muted block mb-1">
									Программа страхования
								</label>
								<select
									id="dms-program-select"
									value={selectedProgram}
									onChange={(e) => setSelectedProgram(e.target.value as DmsProgramType)}
									className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring"
								>
									<option value="base">Базовая (лимит 60 000 ₽)</option>
									<option value="extended">Расширенная (лимит 150 000 ₽)</option>
									<option value="vip">VIP / Премиум (лимит 400 000 ₽)</option>
								</select>
							</div>
						</div>

						{/* Франшиза и сроки */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-line">
							<div>
								<label htmlFor="dms-franchise-select" className="text-xs font-semibold text-muted block mb-1">
									Франшиза (Сооплата)
								</label>
								<div className="flex gap-2">
									<select
										id="dms-franchise-select"
										value={franchiseType}
										onChange={(e) => setFranchiseType(e.target.value as "none" | "percent" | "fixed")}
										className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									>
										<option value="none">Без франшизы (0%)</option>
										<option value="percent">Процентная (%)</option>
										<option value="fixed">Фиксированная (₽)</option>
									</select>
									{franchiseType === "percent" && (
										<input
											type="number"
											min={0}
											max={100}
											value={franchisePercent}
											onChange={(e) => setFranchisePercent(Number(e.target.value))}
											className="w-20 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center"
										/>
									)}
									{franchiseType === "fixed" && (
										<input
											type="number"
											min={0}
											value={franchiseFixedRub}
											onChange={(e) => setFranchiseFixedRub(Number(e.target.value))}
											className="w-24 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center"
										/>
									)}
								</div>
							</div>

							<div>
								<label htmlFor="dms-valid-from" className="text-xs font-semibold text-muted block mb-1">
									Действует с
								</label>
								<input
									id="dms-valid-from"
									type="date"
									value={validFrom}
									onChange={(e) => setValidFrom(e.target.value)}
									className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
								/>
							</div>

							<div>
								<label htmlFor="dms-valid-to" className="text-xs font-semibold text-muted block mb-1">
									Действует по
								</label>
								<input
									id="dms-valid-to"
									type="date"
									value={validTo}
									onChange={(e) => setValidTo(e.target.value)}
									className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
								/>
							</div>
						</div>

						{/* Ошибки валидации полиса */}
						{!policyValidation.isValid && (
							<div className="p-2.5 rounded-lg bg-bad-bg text-bad-fg text-xs flex items-center gap-2">
								<AlertTriangle size={16} className="shrink-0" />
								<span>{policyValidation.errors.join("; ")}</span>
							</div>
						)}
					</div>

					{/* 2. Блок Гарантийного письма */}
					<div className="p-4 rounded-xl border border-line bg-paper-soft flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={hasGuaranteeLetter}
									onChange={(e) => setHasGuaranteeLetter(e.target.checked)}
									className="w-4 h-4 text-teal-600 rounded focus:ring-focus-ring"
								/>
								<span className="font-bold text-sm flex items-center gap-1.5">
									<FileCheck size={18} className="text-teal-600" />
									Гарантийное письмо от страховой компании
								</span>
							</label>
							{hasGuaranteeLetter && (
								<span className="text-xs font-semibold text-teal-dark bg-teal-surface px-2.5 py-1 rounded-full">
									Лимит: {formatCurrencyRub(approvedLimitRub)}
								</span>
							)}
						</div>

						{hasGuaranteeLetter && (
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-line">
								<div>
									<label htmlFor="dms-letter-number" className="text-xs font-semibold text-muted block mb-1">
										Номер ГП
									</label>
									<input
										id="dms-letter-number"
										type="text"
										value={letterNumber}
										onChange={(e) => setLetterNumber(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="dms-letter-limit" className="text-xs font-semibold text-muted block mb-1">
										Согласованная сумма (₽)
									</label>
									<input
										id="dms-letter-limit"
										type="number"
										value={approvedLimitRub}
										onChange={(e) => setApprovedLimitRub(Number(e.target.value))}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="dms-approved-teeth" className="text-xs font-semibold text-muted block mb-1">
										Согласованные зубы (FDI)
									</label>
									<input
										id="dms-approved-teeth"
										type="text"
										placeholder="16, 17, 26..."
										value={approvedTeethInput}
										onChange={(e) => setApprovedTeethInput(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>

								<div>
									<label htmlFor="dms-approved-codes" className="text-xs font-semibold text-muted block mb-1">
										Коды 804н (через запятую)
									</label>
									<input
										id="dms-approved-codes"
										type="text"
										placeholder="A16.07.002, A16.07.030..."
										value={approvedCodesInput}
										onChange={(e) => setApprovedCodesInput(e.target.value)}
										className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
									/>
								</div>
							</div>
						)}
					</div>

					{/* 3. Таблица услуг и Live Co-Payment Split */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<div className="font-bold text-sm flex items-center gap-1.5">
								<Calculator size={18} className="text-teal-600" />
								<span>Назначенные услуги и расчет сооплаты</span>
							</div>
							<div className="text-xs text-muted">
								Позиций: <span className="font-bold text-ink">{billableItems.length}</span>
							</div>
						</div>

						{/* Таблица */}
						<div className="overflow-x-auto rounded-xl border border-line">
							<table className="w-full text-left text-sm border-collapse">
								<thead>
									<tr className="bg-paper-soft border-b border-line text-xs uppercase font-bold text-muted">
										<th className="py-2.5 px-3">Код / Услуга</th>
										<th className="py-2.5 px-2 text-center">Зуб</th>
										<th className="py-2.5 px-2 text-center">Кол-во</th>
										<th className="py-2.5 px-3 text-right">Сумма</th>
										<th className="py-2.5 px-3 text-right">Покрыто ДМС</th>
										<th className="py-2.5 px-3 text-right">Доплата пациентом</th>
										<th className="py-2.5 px-3 text-center">Статус</th>
										<th className="py-2.5 px-2 text-center"></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-line bg-paper">
									{splitResult.lineItems.map((item) => {
										return (
											<tr key={item.lineItemId} className="hover:bg-paper-soft transition-colors">
												<td className="py-2.5 px-3">
													<div className="font-semibold text-ink leading-tight">{item.serviceName}</div>
													<div className="text-xs text-muted font-mono">{item.serviceCode}</div>
													{item.splitReason && (
														<div className="text-[11px] text-muted-dark mt-0.5">{item.splitReason}</div>
													)}
												</td>
												<td className="py-2.5 px-2 text-center font-bold text-teal-dark">
													{item.toothNumber || "—"}
												</td>
												<td className="py-2.5 px-2 text-center font-medium">
													{item.quantity}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-ink whitespace-nowrap">
													{formatCurrencyRub(item.totalKopecks, true)}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-ok-fg whitespace-nowrap bg-ok-bg/30">
													{formatCurrencyRub(item.insuranceCoveredKopecks, true)}
												</td>
												<td className="py-2.5 px-3 text-right font-bold text-bad-fg whitespace-nowrap bg-bad-bg/30">
													{formatCurrencyRub(item.patientOutOfPocketKopecks, true)}
												</td>
												<td className="py-2.5 px-3 text-center whitespace-nowrap">
													{item.status === "full_dms" && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-ok-bg text-ok-fg border border-ok-fg/20">
															<Check size={12} /> ДМС 100%
														</span>
													)}
													{item.status === "co_payment" && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-soft text-amber border border-amber/30">
															Сооплата
														</span>
													)}
													{item.status === "patient_full" && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-bad-bg text-bad-fg border border-bad-fg/20">
															Пациент 100%
														</span>
													)}
												</td>
												<td className="py-2.5 px-2 text-center">
													<button
														type="button"
														onClick={() => handleRemoveService(item.lineItemId)}
														className="text-muted hover:text-bad-fg p-1.5 rounded transition-colors"
														title="Удалить услугу"
														aria-label="Удалить услугу"
													>
														<Trash2 size={16} />
													</button>
												</td>
											</tr>
										);
									})}
									{splitResult.lineItems.length === 0 && (
										<tr>
											<td colSpan={8} className="py-6 text-center text-muted">
												Список услуг пуст. Добавьте услуги ниже.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Строка быстрого добавления услуги */}
						<div className="p-3 rounded-xl border border-line bg-paper-soft flex flex-wrap gap-2 items-center">
							<input
								type="text"
								placeholder="Код 804н"
								value={newServiceCode}
								onChange={(e) => setNewServiceCode(e.target.value)}
								className="w-28 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-xs font-mono"
							/>
							<input
								type="text"
								placeholder="Наименование услуги"
								value={newServiceName}
								onChange={(e) => setNewServiceName(e.target.value)}
								className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm"
							/>
							<input
								type="text"
								placeholder="Зуб"
								value={newToothNumber}
								onChange={(e) => setNewToothNumber(e.target.value)}
								className="w-16 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center font-bold"
							/>
							<input
								type="number"
								placeholder="Цена, ₽"
								value={newUnitPriceRub}
								onChange={(e) => setNewUnitPriceRub(Number(e.target.value))}
								className="w-24 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-right font-semibold"
							/>
							<input
								type="number"
								min={1}
								value={newQuantity}
								onChange={(e) => setNewQuantity(Number(e.target.value))}
								className="w-16 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center"
							/>
							<button
								type="button"
								onClick={handleAddService}
								className="dms-btn dms-btn-secondary h-10"
							>
								<Plus size={16} /> Добавить
							</button>
						</div>
					</div>

					{/* 4. Сводная карточка баланса */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-teal-surface border border-teal-glow">
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Итого к оплате</span>
							<span className="text-lg font-extrabold text-ink">{formatCurrencyRub(splitResult.totalBillKopecks, true)}</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-ok-fg uppercase">Покрыто ДМС</span>
							<span className="text-xl font-black text-ok-fg">{formatCurrencyRub(splitResult.totalInsuranceCoveredKopecks, true)}</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-bad-fg uppercase">Доплата пациентом</span>
							<span className="text-xl font-black text-bad-fg">{formatCurrencyRub(splitResult.totalPatientOutOfPocketKopecks, true)}</span>
						</div>

						<div className="flex flex-col">
							<span className="text-xs font-semibold text-muted uppercase">Остаток лимита ГП</span>
							<span className="text-lg font-bold text-teal-dark">
								{hasGuaranteeLetter ? formatCurrencyRub(splitResult.letterRemainingLimitKopecks, true) : "Без лимита"}
							</span>
						</div>
					</div>
				</div>

				{/* Footer */}
				<footer className="dms-modal-footer">
					<button
						type="button"
						className="dms-btn dms-btn-secondary"
						onClick={handleExportCsv}
						title="Экспорт реестра услуг для страховой в формате CSV"
					>
						<FileSpreadsheet size={16} /> Экспорт реестра (CSV)
					</button>

					<button
						type="button"
						className="dms-btn dms-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>

					<button
						type="button"
						className="dms-btn dms-btn-primary"
						onClick={handleConfirmPreAuth}
					>
						<CheckCircle2 size={18} /> Применить авторизацию ДМС
					</button>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
