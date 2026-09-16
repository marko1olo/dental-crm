import {
	type MdlpCarpuleQueueItem,
	type SeniorNurseDisposalActData,
	formatSeniorNurseDisposalActData,
	generateSeniorNurseDisposalActHtml,
} from "@dental/shared";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Copy,
	Download,
	FileText,
	MoreVertical,
	Printer,
	ShieldAlert,
	ShieldCheck,
	ShoppingCart,
	UserCheck,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../../GlobalToast.js";
import {
	type DeductionLineItem,
	type SupplierPurchaseOrderView,
	createSupplierPurchaseOrderFromLines,
	formatSupplierPurchaseOrderTextRu,
} from "../inventoryMath.js";
import "./mdlpInventory.css";

export interface SeniorNurseDisposalActModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly organizationName?: string | undefined;
	readonly organizationInn?: string | undefined;
	readonly organizationAddress?: string | undefined;
	readonly departmentName?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly initialSeniorNurseName?: string | undefined;
	readonly initialChiefDoctorName?: string | undefined;
	readonly initialDentistName?: string | undefined;
	readonly onApproveAct?: ((actData: SeniorNurseDisposalActData) => void | Promise<void>) | undefined;
	readonly initialApproverRole?: "doctor" | "senior_nurse" | "administrator" | "authorized_staff" | undefined;
	readonly initialPaperJournalAcknowledged?: boolean | undefined;
}

export const SeniorNurseDisposalActModal: React.FC<
	SeniorNurseDisposalActModalProps
> = ({
	isOpen,
	onClose,
	items,
	organizationName = "",
	organizationInn = "",
	organizationAddress = "",
	departmentName = "Стоматологическое отделение",
	cabinetName = "Кабинет №1 (Терапия / Хирургия)",
	initialSeniorNurseName = "Старшая медсестра",
	initialChiefDoctorName = "Главный врач",
	initialDentistName = "Врач-стоматолог",
	onApproveAct,
	initialApproverRole = "doctor",
	initialPaperJournalAcknowledged = true,
}) => {
	const now = new Date();
	const [actNumber, setActNumber] = useState<string>(
		() =>
			`СПИС-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-001`,
	);
	const [actDate, setActDate] = useState<string>(
		() => now.toISOString().slice(0, 10),
	);
	const [approverRole, setApproverRole] = useState<
		"doctor" | "senior_nurse" | "administrator" | "authorized_staff"
	>(initialApproverRole);
	const [paperJournalAcknowledged, setPaperJournalAcknowledged] =
		useState<boolean>(initialPaperJournalAcknowledged);
	const [approverName, setApproverName] = useState<string>(() => {
		if (initialApproverRole === "senior_nurse") {
			return initialSeniorNurseName || "Старшая медсестра";
		}
		return initialDentistName || initialSeniorNurseName || "Врач-стоматолог";
	});
	const [seniorNurseName, setSeniorNurseName] = useState<string>(
		initialSeniorNurseName,
	);
	const [chiefDoctorName, setChiefDoctorName] = useState<string>(
		initialChiefDoctorName,
	);
	const [dentistName, setDentistName] = useState<string>(initialDentistName);
	const [isSingleSigner, setIsSingleSigner] = useState<boolean>(true);
	const [isApproved, setIsApproved] = useState<boolean>(false);
	const [notes, setNotes] = useState<string>("");

	// 1-Click заказ поставщику
	const [showPoModal, setShowPoModal] = useState<boolean>(false);
	const [copiedPo, setCopiedPo] = useState<boolean>(false);
	const [showMoreActions, setShowMoreActions] = useState<boolean>(false);

	const handleApproveAct = async (isPaperLog = paperJournalAcknowledged) => {
		setIsApproved(true);
		const message = isPaperLog
			? `Акт списания №${actNumber} утверждён: бумажный журнал учтён, участие старшей медсестры опционально`
			: `Акт списания №${actNumber} утверждён единолично (без комиссии из 3 человек)`;
		showToast(message, "info");
		if (onApproveAct) {
			await onApproveAct(actData);
		}
	};

	const handleApproveSolo = () => handleApproveAct(false);

	const actData: SeniorNurseDisposalActData = useMemo(() => {
		let rolePositionRu: string | undefined;
		if (approverRole === "doctor") {
			rolePositionRu = "Врач-стоматолог (дежурный)";
		} else if (approverRole === "administrator") {
			rolePositionRu = "Администратор клиники";
		} else if (approverRole === "authorized_staff") {
			rolePositionRu = "Уполномоченный сотрудник клиники";
		} else {
			rolePositionRu = isSingleSigner ? "Дежурная медицинская сестра" : "Старшая медицинская сестра";
		}

		return formatSeniorNurseDisposalActData({
			actNumber,
			actDate,
			organizationName,
			organizationInn,
			organizationAddress,
			departmentName,
			cabinetName,
			seniorNurseName: approverRole === "senior_nurse" ? approverName : seniorNurseName,
			chiefDoctorName: isSingleSigner ? undefined : chiefDoctorName,
			dentistName: approverRole === "doctor" ? approverName : dentistName,
			approverRole,
			approverName,
			approvedByFullName: approverName,
			approvedByPositionRu: rolePositionRu,
			paperJournalAcknowledged,
			isSingleSigner,
			notes: notes.trim() || undefined,
			items,
		});
	}, [
		actNumber,
		actDate,
		organizationName,
		organizationInn,
		organizationAddress,
		departmentName,
		cabinetName,
		seniorNurseName,
		chiefDoctorName,
		dentistName,
		approverRole,
		approverName,
		paperJournalAcknowledged,
		isSingleSigner,
		notes,
		items,
	]);

	const actHtml = useMemo(() => {
		return generateSeniorNurseDisposalActHtml(actData);
	}, [actData]);

	// Преобразование списанных позиций в строки списания для расчета неснижаемого остатка
	const deductionLines = useMemo<DeductionLineItem[]>(() => {
		if (!items || items.length === 0) {
			// Демо/стандартная позиция анестетика при пустом списке
			return [
				{
					id: "anes-disposal-def",
					materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте)",
					category: "anesthesia",
					unit: "карп.",
					quantity: 10,
					standardQuantity: 10,
					unitCostKopecks: 23000,
					stockQuantity: 2, // остаток ниже критического порога
					criticalThreshold: 10,
					source: "tech_map",
					mandatory: true,
				},
			];
		}

		return items.map((it, idx) => ({
			id: `mdlp-item-${it.id || idx}`,
			materialName:
				it.drugInfo?.tradeName || "Анестетик артикаиновый 1.7 мл (карпула)",
			category: "anesthesia" as const,
			unit: "карп.",
			quantity: 1,
			standardQuantity: 1,
			unitCostKopecks: 23000,
			stockQuantity: 0, // списано в 0
			criticalThreshold: 5,
			lotNumber: it.series ?? undefined,
			expirationDate: it.expirationDate ?? undefined,
			source: "tech_map" as const,
			mandatory: true,
		}));
	}, [items]);

	// Автоматический проект заказа поставщику при срабатывании порога
	const generatedPurchaseOrder = useMemo<SupplierPurchaseOrderView | null>(() => {
		return createSupplierPurchaseOrderFromLines(
			deductionLines,
			organizationName,
		);
	}, [deductionLines, organizationName]);

	const handlePrint = () => {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	const handleDownloadHtml = () => {
		const blob = new Blob([actHtml], { type: "text/html;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Акт_списания_${actNumber}.html`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleCopyPoText = () => {
		if (!generatedPurchaseOrder) return;
		const text = formatSupplierPurchaseOrderTextRu(generatedPurchaseOrder);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
		setCopiedPo(true);
		setTimeout(() => setCopiedPo(false), 2500);
	};

	const handlePrintPo = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	if (!isOpen) return null;

	if (showPoModal && generatedPurchaseOrder) {
		const poContent = (
			<div
				className="mdlp-modal-overlay"
				onClick={() => setShowPoModal(false)}
				role="dialog"
				aria-modal="true"
				data-testid="senior-nurse-po-modal"
			>
				<div
					className="mdlp-modal-container"
					style={{ maxWidth: "800px" }}
					onClick={(e) => e.stopPropagation()}
				>
					<header className="mdlp-modal-header">
						<div className="mdlp-modal-title">
							<ShoppingCart size={22} className="text-teal-600" />
							<div>
								<div className="font-bold text-base">
									Заказ поставщику {generatedPurchaseOrder.orderNumber}
								</div>
								<div className="text-xs text-muted">
									Автоматическое пополнение неснижаемого остатка (СанПиН 3.3686-21)
								</div>
							</div>
						</div>
						<button
							type="button"
							className="mdlp-btn mdlp-btn-ghost p-1.5"
							onClick={() => setShowPoModal(false)}
							aria-label="Назад к акту списания"
						>
							<X size={18} />
						</button>
					</header>

					<div className="mdlp-modal-body">
						<table
							style={{
								width: "100%",
								borderCollapse: "collapse",
								fontSize: 12,
							}}
						>
							<thead>
								<tr style={{ background: "var(--paper-soft)", borderBottom: "1px solid var(--line)" }}>
									<th style={{ padding: "6px 8px", textAlign: "left" }}>Материал</th>
									<th style={{ padding: "6px 8px", textAlign: "center" }}>Ед.</th>
									<th style={{ padding: "6px 8px", textAlign: "right" }}>Остаток</th>
									<th style={{ padding: "6px 8px", textAlign: "right" }}>К заказу</th>
									<th style={{ padding: "6px 8px", textAlign: "right" }}>Сумма</th>
								</tr>
							</thead>
							<tbody>
								{generatedPurchaseOrder.items.map((item) => (
									<tr key={item.sku} style={{ borderBottom: "1px solid var(--line)" }}>
										<td style={{ padding: "6px 8px", fontWeight: 600 }}>{item.materialName}</td>
										<td style={{ padding: "6px 8px", textAlign: "center" }}>{item.unit}</td>
										<td style={{ padding: "6px 8px", textAlign: "right" }}>{item.currentStock}</td>
										<td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--teal-dark, #0f766e)" }}>
											{item.suggestedOrderQuantity}
										</td>
										<td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
											{item.totalCostFormatted}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div
							style={{
								marginTop: 16,
								display: "flex",
								justifyContent: "flex-end",
								gap: 20,
								fontSize: 14,
								fontWeight: 700,
							}}
						>
							<div>Позиций: {generatedPurchaseOrder.totalItemsCount}</div>
							<div style={{ color: "var(--teal-dark, #0f766e)" }}>
								Итого: {generatedPurchaseOrder.totalCostFormatted}
							</div>
						</div>
					</div>

					<footer className="mdlp-modal-footer">
						<div className="flex gap-2">
							<button
								type="button"
								className="mdlp-btn mdlp-btn-secondary"
								onClick={handleCopyPoText}
							>
								{copiedPo ? <Check size={16} /> : <Copy size={16} />}
								{copiedPo ? "Скопировано" : "Копировать"}
							</button>
							<button
								type="button"
								className="mdlp-btn mdlp-btn-secondary"
								onClick={handlePrintPo}
							>
								<Printer size={16} /> Печать
							</button>
						</div>
						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary"
							onClick={() => setShowPoModal(false)}
						>
							← Назад к акту
						</button>
					</footer>
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(poContent, document.body)
			: poContent;
	}

	const modalContent = (
		<div
			className="mdlp-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="mdlp-act-title"
			data-testid="senior-nurse-disposal-act-modal"
		>
			<div
				className="mdlp-modal-container"
				style={{ maxWidth: "1000px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<header className="mdlp-modal-header">
					<div className="mdlp-modal-title" id="mdlp-act-title">
						<FileText size={24} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="font-bold text-lg leading-tight">
								Акт списания медикаментов и анестетиков (Старшая медсестра)
							</div>
							<div className="text-xs text-muted mt-0.5">
								СанПиН 3.3686-21 • Честный ЗНАК (Схема 10560) •
								Позиций: {items.length}
							</div>
						</div>
					</div>

					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost p-2"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</header>

				<div className="mdlp-modal-body">
					{/* Опциональность медсестры & Бумажный журнал учтён Banner */}
					<div
						style={{
							marginBottom: 12,
							padding: "10px 14px",
							borderRadius: 10,
							background: paperJournalAcknowledged
								? "rgba(13, 148, 136, 0.08)"
								: "rgba(245, 158, 11, 0.08)",
							border: paperJournalAcknowledged
								? "1px solid rgba(13, 148, 136, 0.3)"
								: "1px solid rgba(245, 158, 11, 0.3)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<CheckCircle2
								size={20}
								style={{
									color: paperJournalAcknowledged
										? "var(--teal, #0d9488)"
										: "var(--warn-fg, #d97706)",
									flexShrink: 0,
								}}
							/>
							<div>
								<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
									{paperJournalAcknowledged
										? "Бумажный журнал учтён • Старшая медсестра опциональна"
										: "СанПиН 3.3686-21: Контроль неснижаемого остатка медикаментов"}
								</div>
								<div style={{ fontSize: 12, color: "var(--muted)" }}>
									{paperJournalAcknowledged
										? "Медсестра ведёт локальный бумажный журнал или отсутствует. Акт списания утверждается в 1 клик дежурным врачом или администратором."
										: "При списании зафиксировано достижение порога остатков. Рекомендуется 1-кликовое пополнение."}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<label
								className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-100/70 border border-teal-300 rounded px-2.5 py-1.5 cursor-pointer select-none"
								title="Отметьте, если учёт карпул ведётся в физическом бумажном журнале отделения (старшая медсестра в CRM опциональна)"
							>
								<input
									type="checkbox"
									checked={paperJournalAcknowledged}
									onChange={(e) => setPaperJournalAcknowledged(e.target.checked)}
									className="rounded border-teal-400 text-teal-600 focus:ring-teal-500 h-4 w-4"
								/>
								<span>Бумажный журнал учтён</span>
							</label>

							{generatedPurchaseOrder && (
								<button
									type="button"
									className="mdlp-btn mdlp-btn-primary"
									style={{ fontSize: 12, padding: "6px 12px" }}
									onClick={() => setShowPoModal(true)}
								>
									<ShoppingCart size={15} />
									Заказ (1 клик)
								</button>
							)}
						</div>
					</div>

					{/* Паспорт и состав подписантов */}
					<div className="p-3 rounded-lg border border-line bg-paper-soft space-y-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-ink">
									Параметры списания карпул
								</span>
								{isApproved && (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-300 text-teal-800 text-[11px] font-bold">
										<CheckCircle2 size={13} className="text-teal-600" />
										{paperJournalAcknowledged ? "Акт утверждён (бумажный журнал учтён)" : "Акт утверждён единолично"}
									</span>
								)}
							</div>
							<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold">
								<CheckCircle2 size={13} className="text-teal-600" />
								<span>Единоличное утверждение (без комиссии из 3 человек)</span>
							</span>
						</div>

						<div className="text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 rounded px-2.5 py-1.5 leading-relaxed">
							<strong>СанПиН 3.3686-21:</strong> Списание пустых карпул анестетиков проводится в 1 клик врачом, администратором или старшей медсестрой единолично без бюрократического требования комиссии из 3 человек.
						</div>

						<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
							<div>
								<label
									htmlFor="act-approver-role"
									className="text-xs font-semibold text-muted block mb-1"
								>
									Кто утверждает списание
								</label>
								<select
									id="act-approver-role"
									value={approverRole}
									onChange={(e) => {
										const newRole = e.target.value as typeof approverRole;
										setApproverRole(newRole);
										if (newRole === "doctor") {
											setApproverName(dentistName || initialDentistName || "Врач-стоматолог");
										} else if (newRole === "senior_nurse") {
											setApproverName(seniorNurseName || initialSeniorNurseName || "Старшая медсестра");
										} else if (newRole === "administrator") {
											setApproverName("Администратор клиники");
										} else if (newRole === "authorized_staff") {
											setApproverName("Уполномоченный сотрудник");
										}
									}}
									className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-bold text-ink"
								>
									<option value="doctor">Врач-стоматолог (дежурный)</option>
									<option value="senior_nurse">Старшая медсестра</option>
									<option value="administrator">Администратор клиники</option>
									<option value="authorized_staff">Уполномоченный сотрудник</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="act-approver-name"
									className="text-xs font-semibold text-muted block mb-1"
								>
									ФИО утверждающего лица
								</label>
								<input
									id="act-approver-name"
									type="text"
									value={approverName}
									onChange={(e) => setApproverName(e.target.value)}
									placeholder="ФИО сотрудника..."
									className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-semibold text-ink"
								/>
							</div>

							<div>
								<label
									htmlFor="act-number-input"
									className="text-xs font-semibold text-muted block mb-1"
								>
									Номер акта
								</label>
								<input
									id="act-number-input"
									type="text"
									value={actNumber}
									onChange={(e) => setActNumber(e.target.value)}
									className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs font-mono font-bold text-ink"
								/>
							</div>

							<div>
								<label
									htmlFor="act-date-input"
									className="text-xs font-semibold text-muted block mb-1"
								>
									Дата акта
								</label>
								<input
									id="act-date-input"
									type="date"
									value={actDate}
									onChange={(e) => setActDate(e.target.value)}
									className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs text-ink"
								/>
							</div>

							<div className="col-span-1 md:col-span-4">
								<label
									htmlFor="act-notes-input"
									className="text-xs font-semibold text-muted block mb-1"
								>
									Примечание
								</label>
								<input
									id="act-notes-input"
									type="text"
									placeholder="Плановое списание карпул..."
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="w-full min-h-[44px] px-2.5 rounded border border-line bg-paper text-xs text-ink"
								/>
							</div>
						</div>
					</div>

					{/* Предпросмотр печатной формы */}
					<div className="border border-line rounded-lg overflow-hidden bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] mt-3">
						<iframe
							title="Предпросмотр акта списания"
							srcDoc={actHtml}
							className="w-full h-[380px] border-0"
						/>
					</div>
				</div>

				<footer className="mdlp-modal-footer">
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>
					</div>

					<div className="flex items-center gap-2 relative">
						{/* Secondary: Печать акта списания */}
						<button
							type="button"
							className="mdlp-btn mdlp-btn-secondary"
							onClick={handlePrint}
						>
							<Printer size={18} /> Печать акта списания
						</button>

						{/* Secondary menu ... */}
						<div className="relative">
							<button
								type="button"
								className="mdlp-btn mdlp-btn-secondary p-2.5"
								onClick={() => setShowMoreActions((v) => !v)}
								title="Дополнительные действия..."
								aria-label="Дополнительные действия"
							>
								<MoreVertical size={16} />
							</button>

							{showMoreActions && (
								<div
									className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1"
									onClick={() => setShowMoreActions(false)}
								>
									<button
										type="button"
										onClick={handleDownloadHtml}
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
									>
										<Download size={14} className="text-teal-600" />
										<span>Скачать HTML</span>
									</button>
									<button
										type="button"
										onClick={() => {
											if (typeof navigator !== "undefined" && navigator.clipboard) {
												navigator.clipboard.writeText(actNumber);
												showToast(`Номер акта ${actNumber} скопирован`, "success");
											}
										}}
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
									>
										<Copy size={14} className="text-teal-600" />
										<span>Копировать № акта</span>
									</button>
								</div>
							)}
						</div>

						{/* Primary: Утвердить списание */}
						<button
							type="button"
							className="mdlp-btn mdlp-btn-primary font-bold"
							style={{ height: 44, padding: "0 18px", fontSize: 13 }}
							onClick={() => handleApproveAct(paperJournalAcknowledged)}
							data-testid="approve-act-paper-journal-btn"
							title={
								paperJournalAcknowledged
									? "Утвердить списание в 1 клик (бумажный журнал учтён, старшая медсестра опциональна)"
									: "Утвердить акт единолично в 1 клик (без комиссии из 3 человек)"
							}
						>
							<CheckCircle2 size={18} />
							{isApproved
								? paperJournalAcknowledged
									? "Списание утверждено (бумажный журнал учтён)"
									: "Акт утверждён единолично"
								: paperJournalAcknowledged
									? "Утвердить списание (бумажный журнал учтён)"
									: "Утвердить акт единолично (1 клик)"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};
