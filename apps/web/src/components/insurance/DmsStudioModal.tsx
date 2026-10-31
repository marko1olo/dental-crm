/**
 * DmsStudioModal.tsx — Canonical Master Studio for Russian DMS Insurance, Guarantee Letters & Split Billing.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: buttons NEVER disabled, instant defaults)
 * - 8n (Solo-Doctor & Small Clinic 1-3 chairs sovereignty: zero bureaucracy)
 * - 8am (Exactly ONE Primary CTA button #0d9488 var(--teal) per visible context)
 * - 8ze / Apple HIG (Touch targets >= 44x44px, native Bottom Sheet on mobile, 0px horizontal scroll)
 * - 8x / 8ap (Human Russian clinical language, zero raw law numbers)
 * - 8b (Healthy sweet spot: 380-480 lines)
 */

import React, { useMemo, useState } from "react";
import {
	Building2,
	Check,
	CreditCard,
	Download,
	FileSpreadsheet,
	FileText,
	Plus,
	Printer,
	Shield,
	Split,
	X,
	Banknote,
	Wallet,
	Layers,
} from "lucide-react";
import {
	calculateDmsCoPaymentSplit,
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
	kopecksToRub,
	rubToKopecks,
	RUSSIAN_DMS_INSURERS,
	TOP_6_DMS_INSURER_CHIPS,
	STANDARD_DMS_LIMITS_RUB,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type DmsPolicy,
	type DmsRegistryServiceRecord,
	type PatientPaymentMethod,
} from "./dmsCatalogData.js";

export interface DmsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		id: string;
		fullName: string;
		birthDate?: string;
		policyNumber?: string;
		cardNumber?: string;
	};
	readonly initialTab?: "split" | "policies" | "registry";
	readonly onApplySplitToCashbox?: (splitData: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number;
		patientCardRub?: number;
		letterId?: string;
		letterNumber?: string;
		insurerName?: string;
	}) => void;
}

const DEFAULT_BILL_ITEMS: readonly DmsBillableItem[] = [
	{ id: "b-1", serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (световой композит)", toothNumber: "16", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "b-2", serviceCode: "A16.07.030.002", serviceName: "Эндодонтическое лечение (2 канала)", toothNumber: "16", quantity: 1, unitPriceKopecks: 580000 },
	{ id: "b-3", serviceCode: "A11.07.010", serviceName: "Анестезия проводниковая артикаин", toothNumber: "16", quantity: 2, unitPriceKopecks: 95000 },
	{ id: "b-4", serviceCode: "A06.07.012", serviceName: "Прицельная контрольная радиовизиография", toothNumber: "16", quantity: 1, unitPriceKopecks: 80000 },
	{ id: "b-5", serviceCode: "A16.07.051", serviceName: "Профессиональная гигиена Air-Flow", quantity: 1, unitPriceKopecks: 650000, isExcluded: false },
];

export const DmsStudioModal: React.FC<DmsStudioModalProps> = ({
	isOpen,
	onClose,
	patient = { id: "pat-1", fullName: "Соколова Анна Викторовна", birthDate: "15.04.1990", policyNumber: "СГЗ-2026-998811" },
	initialTab = "split",
	onApplySplitToCashbox,
}) => {
	const [activeTab, setActiveTab] = useState<"split" | "policies" | "registry">(initialTab);
	const [selectedInsurerId, setSelectedInsurerId] = useState<string>("sogaz");
	const [franchisePercent, setFranchisePercent] = useState<number>(0);
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRubInput, setMixedCashRubInput] = useState<string>("0");
	const [isSplitApproved, setIsSplitApproved] = useState<boolean>(false);

	const [letters, setLetters] = useState<DmsGuaranteeLetter[]>([
		{
			id: "g-let-1",
			letterNumber: "ГП-СОГАЗ-88412",
			patientFullName: patient.fullName,
			insurerId: "sogaz",
			insurerName: "АО «СОГАЗ»",
			issueDate: "12.08.2026",
			validUntil: "31.12.2026",
			maxApprovedAmountKopecks: 5000000,
			maxCoverageKopecks: 5000000,
			usedAmountKopecks: 840000,
			franchisePercent: 0,
			status: "active",
			notes: "Согласовано терапевтическое лечение зуба 16 и визиография",
			curatorPhone: "+7 (495) 739-21-40",
		},
	]);

	const [activeLetterId, setActiveLetterId] = useState<string>(letters[0]?.id || "g-let-1");
	const selectedLetter = letters.find((l) => l.id === activeLetterId) || letters[0];

	const [newLetterNumber, setNewLetterNumber] = useState<string>("ГП-2026-002");
	const [newLetterLimitRub, setNewLetterLimitRub] = useState<number>(50000);

	const registryRecords: readonly DmsRegistryServiceRecord[] = useMemo(() => [
		{ id: "r-1", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: selectedLetter?.insurerName || "АО «СОГАЗ»", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой светового отверждения", toothNumber: "16", diagnosisCodeMkb10: "K02.1", quantity: 1, unitPriceRub: 4500, totalPriceRub: 4500, dmsCoveredRub: 4500, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: selectedLetter?.letterNumber },
		{ id: "r-2", visitId: "v-1", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: selectedLetter?.insurerName || "АО «СОГАЗ»", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическая обработка 2 корневых каналов", toothNumber: "16", diagnosisCodeMkb10: "K04.0", quantity: 1, unitPriceRub: 5800, totalPriceRub: 5800, dmsCoveredRub: 5800, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: selectedLetter?.letterNumber },
		{ id: "r-3", visitId: "v-2", visitDate: "20.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: selectedLetter?.insurerName || "АО «СОГАЗ»", serviceCode804n: "A16.07.051", serviceName: "Профессиональная гигиена Air-Flow", diagnosisCodeMkb10: "K05.0", quantity: 1, unitPriceRub: 6500, totalPriceRub: 6500, dmsCoveredRub: 5200, patientPaidRub: 1300, doctorFullName: "Д-р Смирнова Е.П.", isExcluded: false, exclusionReason: "Франшиза 20%", letterNumber: selectedLetter?.letterNumber },
	], [patient, selectedLetter]);

	// Расчет сплита чека в целочисленных копейках
	const splitResult = useMemo(() => {
		return calculateDmsCoPaymentSplit(DEFAULT_BILL_ITEMS, {
			guaranteeLetter: selectedLetter,
			franchisePercent,
		});
	}, [selectedLetter, franchisePercent]);

	const { totalBillKopecks, totalInsuranceCoveredKopecks, totalPatientOutOfPocketKopecks, lineItems, remainingLimitKopecks } = splitResult;
	const patientDueRub = kopecksToRub(totalPatientOutOfPocketKopecks);
	const mixedCashRub = Math.max(0, Math.min(patientDueRub, Number(mixedCashRubInput) || 0));
	const mixedCardRub = Math.max(0, patientDueRub - mixedCashRub);

	if (!isOpen) return null;

	const handleAddLetter = () => {
		const insurer = RUSSIAN_DMS_INSURERS.find((i) => i.id === selectedInsurerId) || RUSSIAN_DMS_INSURERS[0];
		const limitKop = rubToKopecks(newLetterLimitRub || 50000);
		const letItem: DmsGuaranteeLetter = {
			id: `let-${Date.now()}`,
			letterNumber: newLetterNumber.trim() || `ГП-${Date.now().toString().slice(-5)}`,
			patientFullName: patient.fullName,
			insurerId: insurer.id,
			insurerName: insurer.name,
			issueDate: new Date().toLocaleDateString("ru-RU"),
			validUntil: "31.12.2026",
			maxApprovedAmountKopecks: limitKop,
			maxCoverageKopecks: limitKop,
			usedAmountKopecks: 0,
			franchisePercent,
			status: "active",
			notes: "Согласовано стоматологическое лечение",
			curatorPhone: insurer.curatorPhone,
		};
		setLetters((prev) => [letItem, ...prev]);
		setActiveLetterId(letItem.id);
		setNewLetterNumber(`ГП-${Date.now().toString().slice(-4)}`);
	};

	const handleExportCsv = () => {
		const csv = exportRegistryToCsv(registryRecords, { name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701234567" }, selectedLetter?.insurerName || "АО «СОГАЗ»", "Август 2026");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Reestr_DMS_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handlePrintAct = () => {
		const html = generateBilateralAcceptanceActHtml({
			records: registryRecords,
			summary: { totalServicesCount: registryRecords.length, uniquePatientsCount: 1, totalAmountRub: 16800, totalDmsCoveredRub: 15500, totalPatientPaidRub: 1300, isBalanced: true, insurerName: selectedLetter?.insurerName || "АО «СОГАЗ»", periodStart: "01.08.2026", periodEnd: "31.08.2026" },
			clinicInfo: { name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701234567", ogrn: "1027700123456", address: "г. Москва, ул. Клиническая, д. 10", chiefDoctor: "Смирнов В.А." },
			insurerInfo: { name: selectedLetter?.insurerName || "АО «СОГАЗ»", representative: "Куратор ДМС", contractNumber: "ДМС-2026/01", contractDate: "10.01.2026" },
			actNumber: "АКТ-2026/08",
			actDate: new Date().toLocaleDateString("ru-RU"),
		});
		const w = window.open("", "_blank");
		if (w) { w.document.write(html); w.document.close(); w.print(); }
	};

	const handleApplySplit = () => {
		setIsSplitApproved(true);
		if (onApplySplitToCashbox) {
			onApplySplitToCashbox({
				totalDueRub: kopecksToRub(totalBillKopecks),
				dmsRub: kopecksToRub(totalInsuranceCoveredKopecks),
				patientRub: patientDueRub,
				patientMethod: paymentMethod,
				patientCashRub: paymentMethod === "cash" ? patientDueRub : paymentMethod === "mixed" ? mixedCashRub : 0,
				patientCardRub: paymentMethod === "card" ? patientDueRub : paymentMethod === "mixed" ? mixedCardRub : 0,
				letterId: selectedLetter?.id,
				letterNumber: selectedLetter?.letterNumber,
				insurerName: selectedLetter?.insurerName,
			});
		}
		window.dispatchEvent(new CustomEvent("dente:cashbox-apply-split", {
			detail: { totalKopecks: totalBillKopecks, dmsCoveredKopecks: totalInsuranceCoveredKopecks, patientKopecks: totalPatientOutOfPocketKopecks, insurerName: selectedLetter?.insurerName },
		}));
	};

	return (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", backdropFilter: "blur(4px)" }}>
			<div className="dms-modal-window" onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderRadius: "20px", width: "100%", maxWidth: "1020px", maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
				{/* Apple HIG Drag Handle for mobile */}
				<div className="dms-bottom-sheet-handle" style={{ width: "36px", height: "5px", background: "var(--line, #cbd5e1)", borderRadius: "3px", margin: "10px auto 2px" }} />

				{/* Header */}
				<div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
						<div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(13,148,136,0.12)", color: "var(--teal, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							<Shield size={22} />
						</div>
						<div style={{ minWidth: 0 }}>
							<h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
								ДМС и страховые полисы: {patient.fullName}
							</h2>
							<div style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{patient.birthDate ? `Дата рождения: ${patient.birthDate} • ` : "15.04.1990 • "}Полис: {patient.policyNumber || "Не указан"} • Статус: <span style={{ color: "var(--teal, #0d9488)", fontWeight: 700 }}>Активен</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} style={{ minWidth: "44px", minHeight: "44px", borderRadius: "10px", border: "1px solid var(--line, #e2e8f0)", background: "transparent", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				{/* Navigation Tabs (Apple HIG mobile touch & scroll compliant) */}
				<div style={{ display: "flex", gap: "8px", padding: "10px 16px", borderBottom: "1px solid var(--line, #e2e8f0)", background: "var(--paper-subtle, #f8fafc)", overflowX: "auto", scrollbarWidth: "none" }}>
					<button type="button" onClick={() => setActiveTab("split")} style={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid", borderColor: activeTab === "split" ? "var(--teal, #0d9488)" : "transparent", background: activeTab === "split" ? "rgba(13,148,136,0.1)" : "transparent", color: activeTab === "split" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
						<Split size={16} /> Сплит оплаты
					</button>
					<button type="button" onClick={() => setActiveTab("policies")} style={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid", borderColor: activeTab === "policies" ? "var(--teal, #0d9488)" : "transparent", background: activeTab === "policies" ? "rgba(13,148,136,0.1)" : "transparent", color: activeTab === "policies" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
						<Building2 size={16} /> Гарантийное письмо
					</button>
					<button type="button" onClick={() => setActiveTab("registry")} style={{ flexShrink: 0, whiteSpace: "nowrap", minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid", borderColor: activeTab === "registry" ? "var(--teal, #0d9488)" : "transparent", background: activeTab === "registry" ? "rgba(13,148,136,0.1)" : "transparent", color: activeTab === "registry" ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
						<FileSpreadsheet size={16} /> Реестр счетов
					</button>
				</div>

				{/* Modal Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
					{activeTab === "split" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							{/* Top 6 Insurers Bar */}
							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								<span style={{ fontWeight: 600 }}>Страховые компании:</span>
								{TOP_6_DMS_INSURER_CHIPS.map((ins) => (
									<button key={ins.id} type="button" onClick={() => setSelectedInsurerId(ins.id)} style={{ minHeight: "32px", padding: "0 10px", borderRadius: "8px", border: "1px solid", borderColor: selectedInsurerId === ins.id ? "var(--teal, #0d9488)" : "var(--line, #cbd5e1)", background: selectedInsurerId === ins.id ? "rgba(13,148,136,0.1)" : "transparent", color: selectedInsurerId === ins.id ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
										{ins.name}
									</button>
								))}
							</div>

							{/* Franchise and Letter Limit bar */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--paper-subtle, #f8fafc)", padding: "12px 16px", borderRadius: "14px", border: "1px solid var(--line, #e2e8f0)" }}>
								<div>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", textTransform: "uppercase", fontWeight: 700 }}>Остаток гарантийного письма</div>
									<div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink, #0f172a)", marginTop: "2px" }}>
										{formatCurrencyKopecks(remainingLimitKopecks)}
									</div>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)" }}>Франшиза полиса:</span>
									{[0, 10, 20, 30, 50].map((pct) => (
										<button key={pct} type="button" onClick={() => setFranchisePercent(pct)} style={{ minWidth: "44px", minHeight: "44px", borderRadius: "8px", border: "1px solid", borderColor: franchisePercent === pct ? "var(--teal, #0d9488)" : "var(--line, #cbd5e1)", background: franchisePercent === pct ? "var(--teal, #0d9488)" : "var(--paper, #fff)", color: franchisePercent === pct ? "#fff" : "var(--ink, #0f172a)", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
											{pct}%
										</button>
									))}
								</div>
							</div>

							{/* Bill Items Breakdown Table */}
							<div style={{ border: "1px solid var(--line, #e2e8f0)", borderRadius: "14px", overflow: "hidden" }}>
								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
									<thead>
										<tr style={{ background: "var(--paper-subtle, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)", color: "var(--muted, #64748b)", textAlign: "left" }}>
											<th style={{ padding: "10px 14px", fontWeight: 600 }}>Услуга</th>
											<th style={{ padding: "10px 14px", fontWeight: 600, width: "60px" }}>Зуб</th>
											<th style={{ padding: "10px 14px", fontWeight: 600, width: "70px" }}>Кол-во</th>
											<th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right", width: "100px" }}>Всего</th>
											<th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right", width: "110px", color: "var(--teal, #0d9488)" }}>Страховая</th>
											<th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right", width: "110px", color: "var(--amber-ink, #b45309)" }}>Пациент</th>
										</tr>
									</thead>
									<tbody>
										{lineItems.map((item) => (
											<tr key={item.lineItemId} style={{ borderBottom: "1px solid var(--line, #f1f5f9)" }}>
												<td style={{ padding: "10px 14px" }}>
													<div style={{ fontWeight: 600, color: "var(--ink, #0f172a)" }}>{item.serviceName}</div>
													<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>{item.splitReason}</div>
												</td>
												<td style={{ padding: "10px 14px", color: "var(--muted, #64748b)" }}>{item.toothNumber || "—"}</td>
												<td style={{ padding: "10px 14px" }}>{item.quantity}</td>
												<td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>{formatCurrencyKopecks(item.totalKopecks)}</td>
												<td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>{formatCurrencyKopecks(item.insuranceCoveredKopecks)}</td>
												<td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: item.patientOutOfPocketKopecks > 0 ? "var(--amber-ink, #b45309)" : "var(--muted, #64748b)" }}>{formatCurrencyKopecks(item.patientOutOfPocketKopecks)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Summary Totals & Payment Method */}
							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
								<div style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: "14px", padding: "14px" }}>
									<div style={{ fontSize: "12px", color: "var(--teal, #0d9488)", fontWeight: 700 }}>ПОКРЫВАЕТСЯ СТРАХОВКОЙ</div>
									<div style={{ fontSize: "24px", fontWeight: 800, color: "var(--teal, #0d9488)", marginTop: "4px" }}>
										{formatCurrencyKopecks(totalInsuranceCoveredKopecks)}
									</div>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "4px" }}>Безналичное перечисление от {selectedLetter?.insurerName}</div>
								</div>

								<div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "14px", padding: "14px" }}>
									<div style={{ fontSize: "12px", color: "var(--amber-ink, #b45309)", fontWeight: 700 }}>ДОПЛАТА ПАЦИЕНТА НА КАССЕ</div>
									<div style={{ fontSize: "24px", fontWeight: 800, color: "var(--amber-ink, #b45309)", marginTop: "4px" }}>
										{formatCurrencyKopecks(totalPatientOutOfPocketKopecks)}
									</div>
									<div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
										{(["card", "cash", "mixed"] as const).map((m) => (
											<button key={m} type="button" onClick={() => setPaymentMethod(m)} style={{ minHeight: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid", borderColor: paymentMethod === m ? "var(--amber-ink, #b45309)" : "var(--line, #cbd5e1)", background: paymentMethod === m ? "var(--amber-ink, #b45309)" : "var(--paper, #fff)", color: paymentMethod === m ? "#fff" : "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
												{m === "card" ? "Карта" : m === "cash" ? "Наличные" : "Смешанная"}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "policies" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>Выберите страховую компанию РФ:</div>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
								{TOP_6_DMS_INSURER_CHIPS.map((ins) => (
									<button key={ins.id} type="button" onClick={() => setSelectedInsurerId(ins.id)} style={{ minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid", borderColor: selectedInsurerId === ins.id ? "var(--teal, #0d9488)" : "var(--line, #cbd5e1)", background: selectedInsurerId === ins.id ? "rgba(13,148,136,0.1)" : "var(--paper, #fff)", color: selectedInsurerId === ins.id ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
										{ins.name}
									</button>
								))}
							</div>

							<div style={{ background: "var(--paper-subtle, #f8fafc)", padding: "16px", borderRadius: "14px", border: "1px solid var(--line, #e2e8f0)", display: "flex", flexDirection: "column", gap: "12px" }}>
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>Прикрепить новое гарантийное письмо</div>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
									<div>
										<label style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>Номер гарантийного письма</label>
										<input type="text" value={newLetterNumber} onChange={(e) => setNewLetterNumber(e.target.value)} style={{ width: "100%", minHeight: "44px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", padding: "0 12px", fontSize: "13px", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)" }} />
									</div>
									<div>
										<label style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>Лимит покрытия (₽)</label>
										<input type="number" value={newLetterLimitRub} onChange={(e) => setNewLetterLimitRub(Number(e.target.value) || 0)} style={{ width: "100%", minHeight: "44px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", padding: "0 12px", fontSize: "13px", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)" }} />
									</div>
								</div>
								<button type="button" onClick={handleAddLetter} style={{ alignSelf: "flex-start", minHeight: "44px", padding: "0 18px", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
									<Plus size={16} /> Прикрепить гарантийное письмо
								</button>
							</div>
						</div>
					)}

					{activeTab === "registry" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
								<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>Оказанные услуги по ДМС за текущий период</div>
								<div style={{ display: "flex", gap: "8px" }}>
									<button type="button" onClick={handleExportCsv} style={{ minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)", fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
										<Download size={15} /> Экспорт реестра в CSV
									</button>
									<button type="button" onClick={handlePrintAct} style={{ minHeight: "44px", padding: "0 14px", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)", fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
										<Printer size={15} /> Печать акта для страховой
									</button>
								</div>
							</div>

							<div style={{ border: "1px solid var(--line, #e2e8f0)", borderRadius: "14px", overflow: "hidden" }}>
								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
									<thead>
										<tr style={{ background: "var(--paper-subtle, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)", color: "var(--muted, #64748b)", textAlign: "left" }}>
											<th style={{ padding: "8px 12px" }}>Дата</th>
											<th style={{ padding: "8px 12px" }}>Пациент</th>
											<th style={{ padding: "8px 12px" }}>Услуга</th>
											<th style={{ padding: "8px 12px", textAlign: "right" }}>Всего</th>
											<th style={{ padding: "8px 12px", textAlign: "right", color: "var(--teal, #0d9488)" }}>ДМС</th>
											<th style={{ padding: "8px 12px", textAlign: "right", color: "var(--amber-ink, #b45309)" }}>Пациент</th>
										</tr>
									</thead>
									<tbody>
										{registryRecords.map((r) => (
											<tr key={r.id} style={{ borderBottom: "1px solid var(--line, #f1f5f9)" }}>
												<td style={{ padding: "8px 12px" }}>{r.visitDate}</td>
												<td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.patientFullName}</td>
												<td style={{ padding: "8px 12px" }}>{r.serviceName}</td>
												<td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrencyRub(r.totalPriceRub)}</td>
												<td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>{formatCurrencyRub(r.dmsCoveredRub)}</td>
												<td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: r.patientPaidRub > 0 ? "var(--amber-ink, #b45309)" : "var(--muted, #64748b)" }}>{formatCurrencyRub(r.patientPaidRub)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Footer with EXACTLY ONE PRIMARY CTA BUTTON */}
				<div style={{ padding: "14px 20px", borderTop: "1px solid var(--line, #e2e8f0)", background: "var(--paper-subtle, #f8fafc)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Итого к сплиту: <strong>{formatCurrencyKopecks(totalBillKopecks)}</strong> (Страховая: {formatCurrencyKopecks(totalInsuranceCoveredKopecks)} • Пациент: {formatCurrencyKopecks(totalPatientOutOfPocketKopecks)})
					</div>
					<div style={{ display: "flex", gap: "10px" }}>
						<button type="button" onClick={onClose} style={{ minHeight: "44px", padding: "0 18px", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", color: "var(--ink, #0f172a)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
							Закрыть
						</button>
						{/* EXACTLY ONE PRIMARY CTA: Мандат 8am & 8e (never disabled) */}
						<button type="button" onClick={handleApplySplit} style={{ minHeight: "44px", padding: "0 22px", borderRadius: "10px", border: "none", background: "var(--teal, #0d9488)", color: "#ffffff", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: "0 4px 12px rgba(13,148,136,0.25)" }}>
							<Check size={18} /> {isSplitApproved ? "✓ Сплит утвержден в кассе" : "✓ Утвердить ДМС-сплит"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

DmsStudioModal.displayName = "DmsStudioModal";
export default DmsStudioModal;
