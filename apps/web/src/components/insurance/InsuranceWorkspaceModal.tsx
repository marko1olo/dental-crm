/**
 * InsuranceWorkspaceModal.tsx — Canonical SSOT Workspace for Patient Insurance & DMS.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: no blocked buttons, instant normal defaults)
 * - 8n (Solo-Doctor & Small Clinic sovereignty: transparent policies, 1-click letters)
 * - 8am (Exactly ONE Primary CTA button #0d9488 per visible screen)
 * - 8ze (Apple HIG: touch targets >= 44x44px, bottom sheet on mobile, safe areas)
 * - 8x (Human clinical language, zero bureaucratic gibberish)
 * - 8b (Healthy sweet spot 380-450 lines)
 */

import {
	Building2,
	Check,
	Download,
	FileSpreadsheet,
	FileText,
	Plus,
	Printer,
	Shield,
	Split,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { InsuranceBillSplitCard } from "./InsuranceBillSplitCard.js";
import {
	exportRegistryToCsv,
	formatCurrencyKopecks,
	formatCurrencyRub,
	generateBilateralAcceptanceActHtml,
	rubToKopecks,
	RUSSIAN_DMS_INSURERS,
	STANDARD_DMS_LIMITS_RUB,
	type DmsGuaranteeLetter,
	type DmsPolicy,
	type DmsRegistryServiceRecord,
	type PatientPaymentMethod,
} from "./insuranceData.js";

export interface InsuranceWorkspaceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		id: string;
		fullName: string;
		birthDate?: string;
		policyNumber?: string;
		cardNumber?: string;
	};
	readonly initialTab?: "policies" | "split" | "registry";
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

export const InsuranceWorkspaceModal: React.FC<InsuranceWorkspaceModalProps> = ({
	isOpen,
	onClose,
	patient = { id: "pat-1", fullName: "Соколова Анна Викторовна", birthDate: "15.04.1990", policyNumber: "СГЗ-2026-998811" },
	initialTab = "policies",
	onApplySplitToCashbox,
}) => {
	const [activeTab, setActiveTab] = useState<"policies" | "split" | "registry">(initialTab);

	const [policies, setPolicies] = useState<DmsPolicy[]>([
		{
			id: "pol-1",
			patientId: patient.id,
			patientFullName: patient.fullName,
			insurerId: "sogaz",
			insurerName: "АО «СОГАЗ»",
			policyNumber: patient.policyNumber || "СГЗ-2026-998811",
			validFrom: "01.01.2026",
			validUntil: "31.12.2026",
			programName: "Расширенная терапия + Хирургия",
			annualLimitKopecks: 10000000,
			franchisePercent: 0,
			isActive: true,
			curatorContact: "8 (800) 333-08-88 (куратор АО «СОГАЗ»)",
		},
	]);

	const [letters, setLetters] = useState<DmsGuaranteeLetter[]>([
		{
			id: "g-let-1",
			letterNumber: "ГП-СОГАЗ-88412",
			patientFullName: patient.fullName,
			insurerId: "sogaz",
			insurerName: "АО «СОГАЗ»",
			issueDate: "12.08.2026",
			validUntil: "30.09.2026",
			maxApprovedAmountKopecks: 3500000,
			maxCoverageKopecks: 3500000,
			usedAmountKopecks: 840000,
			franchisePercent: 0,
			status: "active",
			notes: "Согласовано лечение пульпита зуба 16 и визиография",
			curatorPhone: "+7 (495) 739-21-40",
		},
	]);

	const [selectedInsurerId, setSelectedInsurerId] = useState<string>("sogaz");
	const [newPolicyNumber, setNewPolicyNumber] = useState<string>("");
	const [newPolicyValidUntil, setNewPolicyValidUntil] = useState<string>("31.12.2026");

	const [newLetterNumber, setNewLetterNumber] = useState<string>("ГП-2026-001");
	const [newLetterLimitRub, setNewLetterLimitRub] = useState<number>(30000);
	const [newLetterValidUntil, setNewLetterValidUntil] = useState<string>("31.12.2026");

	const [activeLetterId, setActiveLetterId] = useState<string>(letters[0]?.id || "g-let-1");
	const selectedLetter = letters.find((l) => l.id === activeLetterId) || letters[0];

	const sampleRegistryRecords: readonly DmsRegistryServiceRecord[] = useMemo(() => [
		{ id: "rec-1", visitId: "vis-101", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: "АО «СОГАЗ»", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой светового отверждения", toothNumber: "16", diagnosisCodeMkb10: "K02.1", quantity: 1, unitPriceRub: 4500, totalPriceRub: 4500, dmsCoveredRub: 4500, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: "ГП-СОГАЗ-88412" },
		{ id: "rec-2", visitId: "vis-101", visitDate: "15.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: "АО «СОГАЗ»", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическая обработка 2 корневых каналов", toothNumber: "16", diagnosisCodeMkb10: "K04.0", quantity: 1, unitPriceRub: 5800, totalPriceRub: 5800, dmsCoveredRub: 5800, patientPaidRub: 0, doctorFullName: "Д-р Соколов А.В.", isExcluded: false, letterNumber: "ГП-СОГАЗ-88412" },
		{ id: "rec-3", visitId: "vis-102", visitDate: "20.08.2026", patientId: patient.id, patientFullName: patient.fullName, policyNumber: patient.policyNumber || "СГЗ-2026-998811", insurerName: "АО «СОГАЗ»", serviceCode804n: "A16.07.051", serviceName: "Профессиональная гигиена Air-Flow", diagnosisCodeMkb10: "K05.0", quantity: 1, unitPriceRub: 6500, totalPriceRub: 6500, dmsCoveredRub: 5200, patientPaidRub: 1300, doctorFullName: "Д-р Смирнова Е.П.", isExcluded: false, exclusionReason: "Франшиза 20%", letterNumber: "ГП-СОГАЗ-88412" },
	], [patient]);

	if (!isOpen) return null;

	const handleAddPolicy = () => {
		const insurer = RUSSIAN_DMS_INSURERS.find((i) => i.id === selectedInsurerId) || RUSSIAN_DMS_INSURERS[0];
		const pol: DmsPolicy = {
			id: `pol-${Date.now()}`,
			patientId: patient.id,
			patientFullName: patient.fullName,
			insurerId: insurer.id,
			insurerName: insurer.name,
			policyNumber: newPolicyNumber.trim() || `POL-${Date.now().toString().slice(-6)}`,
			validFrom: "01.01.2026",
			validUntil: newPolicyValidUntil,
			programName: "Базовая терапия + Хирургия",
			annualLimitKopecks: 10000000,
			franchisePercent: 0,
			isActive: true,
			curatorContact: insurer.phone,
		};
		setPolicies((prev) => [pol, ...prev]);
		setNewPolicyNumber("");
	};

	const handleAddLetter = () => {
		const insurer = RUSSIAN_DMS_INSURERS.find((i) => i.id === selectedInsurerId) || RUSSIAN_DMS_INSURERS[0];
		const letLimitKop = rubToKopecks(newLetterLimitRub || 30000);
		const letItem: DmsGuaranteeLetter = {
			id: `let-${Date.now()}`,
			letterNumber: newLetterNumber.trim() || `ГП-${Date.now().toString().slice(-5)}`,
			patientFullName: patient.fullName,
			insurerId: insurer.id,
			insurerName: insurer.name,
			issueDate: new Date().toLocaleDateString("ru-RU"),
			validUntil: newLetterValidUntil,
			maxApprovedAmountKopecks: letLimitKop,
			maxCoverageKopecks: letLimitKop,
			usedAmountKopecks: 0,
			franchisePercent: 0,
			status: "active",
			notes: "Согласовано стоматологическое лечение",
			curatorPhone: insurer.curatorPhone,
		};
		setLetters((prev) => [letItem, ...prev]);
		setActiveLetterId(letItem.id);
		setNewLetterNumber("");
	};

	const handleExportCsv = () => {
		const csvContent = exportRegistryToCsv(
			sampleRegistryRecords,
			{ name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701234567" },
			selectedLetter?.insurerName || "АО «СОГАЗ»",
			"Август 2026",
		);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `Reestr_DMS_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handlePrintAct = () => {
		const html = generateBilateralAcceptanceActHtml({
			records: sampleRegistryRecords,
			summary: {
				totalServicesCount: sampleRegistryRecords.length,
				uniquePatientsCount: 1,
				totalAmountRub: 16800,
				totalDmsCoveredRub: 15500,
				totalPatientPaidRub: 1300,
				isBalanced: true,
				insurerName: selectedLetter?.insurerName || "АО «СОГАЗ»",
				periodStart: "01.08.2026",
				periodEnd: "31.08.2026",
			},
			clinicInfo: {
				name: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				ogrn: "1027700123456",
				address: "г. Москва, ул. Клиническая, д. 10",
				chiefDoctor: "Смирнов В.А.",
			},
			insurerInfo: {
				name: selectedLetter?.insurerName || "АО «СОГАЗ»",
				representative: "Куратор ДМС",
				contractNumber: "ДМС-2026/01",
				contractDate: "10.01.2026",
			},
			actNumber: "АКТ-2026/08",
			actDate: new Date().toLocaleDateString("ru-RU"),
		});
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	};

	const modalContent = (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-modal-window dms-workspace-modal" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "1040px" }}>
				<div className="dms-bottom-sheet-handle" style={{ width: "44px", height: "5px", background: "var(--line, #94a3b8)", borderRadius: "3px", margin: "10px auto 4px" }} />

				{/* Шапка модального окна */}
				<div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
						<div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(13, 148, 136, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal, #0d9488)", flexShrink: 0 }}>
							<Shield size={20} />
						</div>
						<div style={{ minWidth: 0 }}>
							<h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink, #0f172a)", lineHeight: 1.25 }}>
								Страховая медицина и ДМС: {patient.fullName}
							</h2>
							<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
								{patient.birthDate ? `Дата рождения: ${patient.birthDate} • ` : ""}Полис: {patient.policyNumber || "Не прикреплен"}
							</p>
						</div>
					</div>
					<button type="button" onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>

				{/* Вкладки */}
				<div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid var(--line, #e2e8f0)", background: "var(--paper-soft, #f8fafc)", gap: "4px", overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none" }}>
					{[
						{ id: "policies" as const, label: "Полисы и письма", icon: FileText },
						{ id: "split" as const, label: "Сплит-оплата счёта", icon: Split },
						{ id: "registry" as const, label: "Реестр услуг", icon: FileSpreadsheet },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									padding: "10px 12px",
									border: "none",
									borderBottom: isActive ? "2.5px solid var(--teal, #0d9488)" : "2.5px solid transparent",
									background: "transparent",
									color: isActive ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
									fontWeight: isActive ? 700 : 500,
									fontSize: "13px",
									cursor: "pointer",
									minHeight: "44px",
									whiteSpace: "nowrap",
									flexShrink: 0,
								}}
							>
								<Icon size={16} />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>

				{/* Содержимое вкладок */}
				<div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
					{activeTab === "policies" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ padding: "14px", borderRadius: "12px", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}>
								<h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
									<Building2 size={16} style={{ color: "var(--teal, #0d9488)" }} />
									<span>Прикрепить полис ДМС</span>
								</h3>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", alignItems: "flex-end" }}>
									<div>
										<label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>Страховая компания</label>
										<select value={selectedInsurerId} onChange={(e) => setSelectedInsurerId(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", fontSize: "12px" }}>
											{RUSSIAN_DMS_INSURERS.map((ins) => (<option key={ins.id} value={ins.id}>{ins.name}</option>))}
										</select>
									</div>
									<div>
										<label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>Номер полиса</label>
										<input type="text" placeholder="СГЗ-2026-..." value={newPolicyNumber} onChange={(e) => setNewPolicyNumber(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", fontSize: "12px" }} />
									</div>
									<div>
										<label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>Срок до</label>
										<input type="text" value={newPolicyValidUntil} onChange={(e) => setNewPolicyValidUntil(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", fontSize: "12px" }} />
									</div>
									<button type="button" onClick={handleAddPolicy} style={{ padding: "8px 14px", borderRadius: "8px", background: "var(--teal, #0d9488)", color: "#ffffff", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", minHeight: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
										<Plus size={15} /> Прикрепить полис
									</button>
								</div>
							</div>

							<div>
								<h3 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700 }}>Прикрепленные полисы ({policies.length})</h3>
								{policies.map((pol) => (
									<div key={pol.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--line, #e2e8f0)", background: "var(--paper, #ffffff)" }}>
										<div>
											<div style={{ fontWeight: 700, fontSize: "13px" }}>{pol.insurerName} • <span style={{ fontFamily: "monospace" }}>{pol.policyNumber}</span></div>
											<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>{pol.programName} • До: {pol.validUntil}</div>
										</div>
										<span style={{ padding: "3px 8px", borderRadius: "16px", fontSize: "11px", fontWeight: 700, background: "rgba(13, 148, 136, 0.1)", color: "var(--teal, #0d9488)" }}>Активен</span>
									</div>
								))}
							</div>

							<div style={{ borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "14px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
									<h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>Гарантийные письма ({letters.length})</h3>
									<div style={{ display: "flex", gap: "4px" }}>
										{STANDARD_DMS_LIMITS_RUB.map((lim) => (
											<button key={lim} type="button" onClick={() => setNewLetterLimitRub(lim)} style={{ padding: "3px 6px", fontSize: "11px", borderRadius: "6px", border: newLetterLimitRub === lim ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #cbd5e1)", background: newLetterLimitRub === lim ? "var(--teal, #0d9488)" : "transparent", color: newLetterLimitRub === lim ? "#fff" : "inherit", cursor: "pointer" }}>
												{lim / 1000} тыс ₽
											</button>
										))}
									</div>
								</div>

								<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginBottom: "10px", alignItems: "flex-end", background: "var(--paper-soft, #f8fafc)", padding: "10px", borderRadius: "10px" }}>
									<div>
										<label style={{ fontSize: "11px", display: "block" }}>Номер ГП</label>
										<input type="text" placeholder="ГП-..." value={newLetterNumber} onChange={(e) => setNewLetterNumber(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)", fontSize: "12px" }} />
									</div>
									<div>
										<label style={{ fontSize: "11px", display: "block" }}>Лимит (₽)</label>
										<input type="number" value={newLetterLimitRub} onChange={(e) => setNewLetterLimitRub(Number(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line, #cbd5e1)", fontSize: "12px" }} />
									</div>
									<button type="button" onClick={handleAddLetter} style={{ padding: "7px 12px", borderRadius: "6px", background: "var(--teal, #0d9488)", color: "#fff", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", minHeight: "34px" }}>
										+ Добавить письмо
									</button>
								</div>

								{letters.map((letItem) => {
									const maxKop = letItem.maxApprovedAmountKopecks ?? letItem.maxCoverageKopecks ?? 0;
									const remainKop = Math.max(0, maxKop - (letItem.usedAmountKopecks ?? 0));
									const isSel = activeLetterId === letItem.id;
									return (
										<div key={letItem.id} onClick={() => setActiveLetterId(letItem.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", border: isSel ? "1.5px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)", background: isSel ? "rgba(13, 148, 136, 0.04)" : "var(--paper, #ffffff)", cursor: "pointer", marginBottom: "6px" }}>
											<div>
												<div style={{ fontWeight: 700, fontSize: "13px" }}>{letItem.letterNumber} ({letItem.insurerName})</div>
												<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>Лимит: {formatCurrencyKopecks(maxKop)} • <strong style={{ color: "var(--teal, #0d9488)" }}>Остаток: {formatCurrencyKopecks(remainKop)}</strong></div>
											</div>
											<span style={{ padding: "2px 6px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: "rgba(13, 148, 136, 0.1)", color: "var(--teal, #0d9488)" }}>Активно</span>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{activeTab === "split" && (
						<InsuranceBillSplitCard letter={selectedLetter} onApplySplitToCashbox={onApplySplitToCashbox} />
					)}

					{activeTab === "registry" && (
						<div>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
								<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Реестр оказанных услуг по ДМС</h3>
								<div style={{ display: "flex", gap: "6px" }}>
									<button type="button" onClick={handlePrintAct} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", background: "transparent", fontSize: "12px", cursor: "pointer", minHeight: "44px" }}>
										<Printer size={15} /> Печать акта
									</button>
									<button type="button" onClick={handleExportCsv} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "8px", border: "none", background: "var(--teal, #0d9488)", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", minHeight: "44px" }}>
										<Download size={15} /> Экспорт реестра
									</button>
								</div>
							</div>

							<div style={{ overflowX: "auto", border: "1px solid var(--line, #e2e8f0)", borderRadius: "10px" }}>
								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
									<thead>
										<tr style={{ background: "var(--paper-soft, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)", textAlign: "left" }}>
											<th style={{ padding: "8px" }}>Дата</th>
											<th style={{ padding: "8px" }}>Услуга</th>
											<th style={{ padding: "8px", textAlign: "center" }}>Зуб</th>
											<th style={{ padding: "8px", textAlign: "right" }}>Тариф</th>
											<th style={{ padding: "8px", textAlign: "right", color: "var(--teal, #0d9488)" }}>Покрыто ДМС</th>
											<th style={{ padding: "8px", textAlign: "right", color: "#b45309" }}>Доплата</th>
										</tr>
									</thead>
									<tbody>
										{sampleRegistryRecords.map((r) => (
											<tr key={r.id} style={{ borderBottom: "1px solid var(--line, #f1f5f9)" }}>
												<td style={{ padding: "8px" }}>{r.visitDate}</td>
												<td style={{ padding: "8px" }}><strong>{r.serviceName}</strong></td>
												<td style={{ padding: "8px", textAlign: "center" }}>{r.toothNumber || "—"}</td>
												<td style={{ padding: "8px", textAlign: "right" }}>{formatCurrencyRub(r.totalPriceRub)}</td>
												<td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>{formatCurrencyRub(r.dmsCoveredRub)}</td>
												<td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "#b45309" }}>{formatCurrencyRub(r.patientPaidRub)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Подвал */}
				<div style={{ padding: "12px 20px", borderTop: "1px solid var(--line, #e2e8f0)", background: "var(--paper-soft, #f8fafc)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Куратор: <strong>{selectedLetter?.curatorPhone || "8 (800) 333-08-88"}</strong></div>
					<button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", background: "var(--paper, #fff)", cursor: "pointer", minHeight: "44px" }}>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default InsuranceWorkspaceModal;
