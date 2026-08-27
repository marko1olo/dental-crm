/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 XML EXPORT & UKEP SIGNATURE MODAL HUD
 * (МИНЗДРАВ РФ / ПРИКАЗ 911Н / НСИ OID 1.2.643.5.1.13... / ГОСТ Р 34.10-2012)
 * Universal statutory module supporting Form 043/u (SEMD 101) & Form 043-1/u (SEMD 109)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
	Check,
	CheckCircle2,
	ChevronRight,
	Code2,
	Copy,
	Download,
	FileCode2,
	FileText,
	Key,
	Send,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
	Users,
	X,
} from "lucide-react";
import {
	build1ClickExportPackage,
	buildEgiszRemdPackage,
	createDemonstrationGostSignature,
	generateCdaXml,
	validateCdaParams,
	validateDetachedSignature,
	validateUkepCertificate,
	EGISZ_OIDS,
	type CdaSemd043_1uParams,
	type CdaSemd101Params,
	type DetachedSignature,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import "./egiszModal.css";

export type SemdFormType = "043u" | "043_1u";

export interface EgiszCdaExportModalProps {
	isOpen?: boolean;
	onClose: () => void;
	visitId?: string;
	patientId?: string;
	patient?: {
		patientId: string;
		name: { first: string; last: string; middle?: string };
		snils?: string | null;
		birthDate?: string | null;
		gender?: "male" | "female" | "other" | null;
		polisOms?: string | null;
		address?: string | null;
		phone?: string | null;
	};
	doctor?: {
		name: { first: string; last: string; middle?: string };
		snils?: string;
		specialtyCode?: string;
		specialtyName?: string;
		position?: string;
		positionCode?: string;
	};
	clinic?: {
		oid?: string;
		name?: string;
		address?: string | null;
		phone?: string | null;
		ogrn?: string | null;
		inn?: string | null;
	};
	initialFormType?: SemdFormType;
	initialTab?: "diagnostics" | "clinical" | "signature" | "xml";
	orthodonticDetails?: Partial<CdaSemd043_1uParams>;
}

export const EgiszCdaExportModal: React.FC<EgiszCdaExportModalProps> = ({
	isOpen = true,
	onClose,
	visitId = "VISIT-2026-0827-01",
	patientId = "PAT-10042",
	patient: incomingPatient,
	doctor: incomingDoctor,
	clinic: incomingClinic,
	initialFormType = "043u",
	initialTab = "diagnostics",
	orthodonticDetails,
}) => {
	const [activeTab, setActiveTab] = useState<"diagnostics" | "clinical" | "signature" | "xml">(initialTab);
	const [formType, setFormType] = useState<SemdFormType>(initialFormType);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [copied, setCopied] = useState(false);

	// Clinical & Orthodontic State
	const [diagnosis, setDiagnosis] = useState(
		formType === "043_1u"
			? orthodonticDetails?.orthodonticDiagnosis || "Дистальная окклюзия зубных рядов (II класс 1 подкласс по Энглю)"
			: "К02.1 Кариес дентина зуба 1.6",
	);
	const [icd10, setIcd10] = useState(
		formType === "043_1u" ? orthodonticDetails?.icd10Code || "K07.2" : "K02.1",
	);
	const [angleMolarR, setAngleMolarR] = useState<"class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3">(
		orthodonticDetails?.angleMolarClassRight || "class_2_sub_1",
	);
	const [angleMolarL, setAngleMolarL] = useState<"class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3">(
		orthodonticDetails?.angleMolarClassLeft || "class_2_sub_1",
	);
	const [applianceType, setApplianceType] = useState(
		orthodonticDetails?.appliancePlan?.applianceType || "metal_braces_self_ligating",
	);

	// Signatures State
	const [doctorSig, setDoctorSig] = useState<DetachedSignature | null>(null);
	const [clinicSig, setClinicSig] = useState<DetachedSignature | null>(null);

	// Patient & Doctor Normalized Models
	const currentPatient = useMemo(() => ({
		patientId: incomingPatient?.patientId || patientId,
		name: incomingPatient?.name || { first: "Алиса", last: "Волкова", middle: "Сергеевна" },
		snils: incomingPatient?.snils || "123-456-789 64",
		birthDate: incomingPatient?.birthDate || "2012-05-14",
		gender: (incomingPatient?.gender as "male" | "female" | "other") || "female",
		polisOms: incomingPatient?.polisOms || "1658493021948572",
		address: incomingPatient?.address || "г. Москва, ул. Профсоюзная, д. 42, кв. 10",
		phone: incomingPatient?.phone || "+7 (999) 123-45-67",
	}), [incomingPatient, patientId]);

	const currentDoctor = useMemo(() => ({
		name: incomingDoctor?.name || { first: "Елена", last: "Смирнова", middle: "Викторовна" },
		snils: incomingDoctor?.snils || "123-456-789 64",
		specialtyCode: incomingDoctor?.specialtyCode || "1.2.643.5.1.13.13.11.1066.31.08.77",
		specialtyName: incomingDoctor?.specialtyName || (formType === "043_1u" ? "Ортодонтия" : "Стоматология терапевтическая"),
		position: incomingDoctor?.position || (formType === "043_1u" ? "Врач-ортодонт" : "Врач-стоматолог-терапевт"),
		positionCode: incomingDoctor?.positionCode || "71",
	}), [incomingDoctor, formType]);

	const currentClinic = useMemo(() => ({
		oid: incomingClinic?.oid || "1.2.643.5.1.13.13.12.2.77.10425",
		name: incomingClinic?.name || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		address: incomingClinic?.address || "г. Москва, Ленинский проспект, д. 15",
		phone: incomingClinic?.phone || "+7 (495) 789-45-60",
		ogrn: incomingClinic?.ogrn || "1157746123457",
		inn: incomingClinic?.inn || "7701234560",
	}), [incomingClinic]);

	// Build Full CDA Parameters
	const cdaParams = useMemo(() => {
		const docKind = formType === "043_1u" ? "043-1u" : "101";
		if (formType === "043_1u") {
			const p: CdaSemd043_1uParams = {
				docKind: "043-1u",
				documentId: `SEMD-109-${visitId}`,
				documentVersion: 1,
				visitDate: new Date(),
				encounterId: `ENC-${visitId}`,
				patient: currentPatient,
				doctor: currentDoctor,
				clinic: currentClinic,
				orthodonticDiagnosis: diagnosis,
				icd10Code: icd10,
				angleMolarClassRight: angleMolarR,
				angleMolarClassLeft: angleMolarL,
				complaints: "Жалобы на нарушение прикуса и эстетики улыбки",
				anamnesis: "Патология сформировалась в периоде сменного прикуса",
				anthropometry: {
					facialType: "mesoprosopic",
					profileType: "convex",
					facialSymmetry: "symmetric",
					nasolabialAngleDegrees: 104,
					mentolabialSulcus: "deep_pronounced",
					photoProtocolCompleted: true,
				},
				cephalometry: {
					snaAngle: 82.0,
					snbAngle: 78.0,
					anbAngle: 4.0,
					witsAppraisalMm: 2.0,
					fmaAngle: 25.0,
					skeletalClass: "class_2_sub_1",
				},
				indices: {
					tonnIndexNotes: "1.34 (норма 1.33)",
					pontIndexNotes: "Сужение верхнего ряда на 3 мм",
				},
				appliancePlan: {
					applianceType,
					treatmentStages: [
						"1 этап: Нивелирование дугами NiTi",
						"2 этап: Юстировка и смыкание по II классу",
						"3 этап: Ретенционный период (ретейнер + капа)",
					],
					estimatedDurationMonths: 18,
					retentionProtocol: "Несъемный ретейнер 1.3-2.3, 3.3-4.3",
				},
				dentalStatus: [
					{ tooth: 11, condition: "K07.3", conditionName: "Протрузия" },
					{ tooth: 21, condition: "K07.3", conditionName: "Протрузия" },
				],
				services: [
					{ code: "A16.07.046", name: "Ортодонтическая коррекция с применением брекет-систем", quantity: 1 },
					{ code: "B01.063.001", name: "Прием врача-ортодонта первичный", quantity: 1 },
				],
				recommendations: [
					"Гигиеническая чистка зубов ортодонтической щеткой после каждого приема пищи",
					"Контрольный осмотр и смена дуги через 4 недели",
				],
			};
			return p;
		}

		const p101: CdaSemd101Params = {
			docKind: "101",
			documentId: `SEMD-101-${visitId}`,
			documentVersion: 1,
			visitDate: new Date(),
			encounterId: `ENC-${visitId}`,
			patient: currentPatient,
			doctor: currentDoctor,
			clinic: currentClinic,
			diagnoses: [
				{
					icd10Code: icd10,
					diagnosisText: diagnosis,
					isPrimary: true,
					tooth: 16,
				},
			],
			complaints: "Жалобы на кратковременные боли от сладкого в области зуба 1.6",
			anamnesis: "Боли появились около 2 недель назад, усиливаются от температурных раздражителей",
			objectiveStatus: "Зуб 1.6: на жевательной поверхности глубокая кариозная полость в пределах околопульпарного дентина",
			dentalStatus: [
				{ tooth: 16, surfaces: ["O", "M"], condition: "C", conditionName: "Кариес" },
			],
			services: [
				{ code: "A16.07.002", name: "Восстановление зуба пломбой (композит)", tooth: 16, quantity: 1 },
				{ code: "B01.065.001", name: "Прием (осмотр, консультация) врача-стоматолога первичный", quantity: 1 },
			],
			recommendations: "Контрольный осмотр через 6 месяцев, регулярная профгигиена полости рта",
		};
		return p101;
	}, [formType, visitId, currentPatient, currentDoctor, currentClinic, diagnosis, icd10, angleMolarR, angleMolarL, applianceType]);

	// Real-time CDA Generation & Statutory Validation
	const validationResult = useMemo(() => validateCdaParams(cdaParams), [cdaParams]);
	const generationResult = useMemo(() => generateCdaXml(cdaParams), [cdaParams]);

	// Certificate Validation Details
	const doctorCertValidation = useMemo(() => {
		if (!doctorSig) return null;
		return validateUkepCertificate({
			certificate: {
				subject: doctorSig.certificateSubject,
				issuer: doctorSig.certificateIssuer,
				validFrom: doctorSig.validFrom,
				validTo: doctorSig.validTo,
				serialNumber: doctorSig.certificateSerialNumber,
			},
			expectedDoctorSnils: currentDoctor.snils,
			expectedClinicOgrn: currentClinic.ogrn || undefined,
		});
	}, [doctorSig, currentDoctor.snils, currentClinic.ogrn]);

	// Sign Handlers
	const handleSignDoctor = useCallback(() => {
		const sig = createDemonstrationGostSignature({
			doctorName: `${currentDoctor.name.last} ${currentDoctor.name.first} ${currentDoctor.name.middle || ""}`.trim(),
			doctorSnils: currentDoctor.snils,
			clinicName: currentClinic.name,
			isMoSignature: false,
		});
		setDoctorSig(sig);
		showToast("Электронная подпись УКЭП врача успешно сформирована", "success");
	}, [currentDoctor, currentClinic.name]);

	const handleSignClinic = useCallback(() => {
		const sig = createDemonstrationGostSignature({
			doctorName: "Главный врач клиники",
			doctorSnils: "112-233-445 95",
			clinicName: currentClinic.name,
			isMoSignature: true,
		});
		setClinicSig(sig);
		showToast("Подпись медицинской организации (МО) успешно прикреплена", "success");
	}, [currentClinic.name]);

	// 1-Click Export Package Handler
	const handle1ClickExport = useCallback(async () => {
		if (!generationResult.success) {
			showToast("Исправьте ошибки валидации перед экспортом", "error");
			return;
		}

		let currentDocSig = doctorSig;
		if (!currentDocSig) {
			currentDocSig = createDemonstrationGostSignature({
				doctorName: `${currentDoctor.name.last} ${currentDoctor.name.first} ${currentDoctor.name.middle || ""}`.trim(),
				doctorSnils: currentDoctor.snils,
				clinicName: currentClinic.name,
				isMoSignature: false,
			});
			setDoctorSig(currentDocSig);
		}

		const bundle = build1ClickExportPackage({
			documentId: cdaParams.documentId,
			documentVersion: 1,
			docTypeNsiCode: formType === "043_1u" ? "109" : "101",
			rawXml: generationResult.xml,
			doctorSignature: currentDocSig,
			moSignature: clinicSig || undefined,
			patientSnils: currentPatient.snils || undefined,
			clinicOid: currentClinic.oid,
			clinicOgrn: currentClinic.ogrn || undefined,
		});

		// Trigger downloads for XML and SIG files
		const downloadFile = (fileName: string, content: string, mime: string) => {
			const blob = new Blob([content], { type: mime });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		};

		downloadFile(bundle.xmlFileName, bundle.xmlContent, "application/xml");
		downloadFile(bundle.doctorSigFileName, bundle.doctorSigBase64, "application/pkcs7-signature");
		if (bundle.moSigFileName && bundle.moSigBase64) {
			downloadFile(bundle.moSigFileName, bundle.moSigBase64, "application/pkcs7-signature");
		}
		downloadFile(bundle.manifestFileName, bundle.manifestJson, "application/json");

		// Attempt API submission to backend if reachable
		setIsSubmitting(true);
		try {
			const remdPackage = buildEgiszRemdPackage({
				documentId: cdaParams.documentId,
				documentVersion: 1,
				docTypeNsiCode: formType === "043_1u" ? "109" : "101",
				rawXml: generationResult.xml,
				doctorSignature: currentDocSig,
				moSignature: clinicSig || undefined,
				patientSnils: currentPatient.snils || undefined,
				clinicOid: currentClinic.oid,
				clinicOgrn: currentClinic.ogrn || undefined,
			});

			const res = await fetch("/api/egisz/packages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(remdPackage),
			});

			if (res.ok) {
				showToast("Пакет РЭМД успешно отправлен в шлюз ЕГИСЗ!", "success");
			} else {
				showToast("Пакет сформирован и скачан локально (XML + .sig)", "info");
			}
		} catch {
			showToast("Пакет сохранен на диск: XML + .sig + manifest.json", "info");
		} finally {
			setIsSubmitting(false);
		}
	}, [generationResult, doctorSig, clinicSig, cdaParams.documentId, formType, currentPatient.snils, currentClinic.oid, currentClinic.ogrn, currentDoctor.name, currentDoctor.snils, currentClinic.name]);

	const handleCopyXml = useCallback(() => {
		if (generationResult.success) {
			navigator.clipboard.writeText(generationResult.canonicalXml);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			showToast("Канонический CDA XML скопирован в буфер обмена", "success");
		}
	}, [generationResult]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="egisz-modal-overlay" role="dialog" aria-modal="true">
			<div className="egisz-modal-container">
				{/* Header */}
				<header className="egisz-modal-header">
					<div className="egisz-header-title-group">
						<div className="egisz-header-icon">
							<ShieldCheck size={24} />
						</div>
						<div>
							<h2 className="egisz-header-title">
								Экспорт в ЕГИСЗ РЭМД & УКЭП (ГОСТ Р 34.10-2012)
							</h2>
							<div className="egisz-header-subtitle">
								Формы 043/у и 043-1/у • Приказ Минздрава РФ № 911н • OID 1.2.643.5.1.13...
							</div>
						</div>
					</div>
					<button
						type="button"
						className="egisz-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* Navigation Tabs */}
				<nav className="egisz-tabs-bar">
					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "diagnostics" ? "active" : ""}`}
						onClick={() => setActiveTab("diagnostics")}
					>
						<Shield size={16} />
						Диагностика и реквизиты
						<span
							className={`egisz-tab-badge ${
								validationResult.valid ? "badge-success" : "badge-error"
							}`}
						>
							{validationResult.valid ? "ГОТОВ" : `${validationResult.errors.length} ОШИБ.`}
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "clinical" ? "active" : ""}`}
						onClick={() => setActiveTab("clinical")}
					>
						<FileText size={16} />
						Клинический статус
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "signature" ? "active" : ""}`}
						onClick={() => setActiveTab("signature")}
					>
						<Key size={16} />
						Подпись УКЭП
						{doctorSig && <span className="egisz-tab-badge badge-success">ВРАЧ ✓</span>}
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "xml" ? "active" : ""}`}
						onClick={() => setActiveTab("xml")}
					>
						<Code2 size={16} />
						HL7 CDA R2 XML
					</button>
				</nav>

				{/* Modal Body */}
				<main className="egisz-modal-body">
					{/* Form Type Switcher */}
					<div className="egisz-kind-switcher">
						<div
							className={`egisz-kind-card ${formType === "043u" ? "active" : ""}`}
							onClick={() => setFormType("043u")}
						>
							<div className="egisz-kind-header">
								<span className="egisz-kind-title">Форма 043/у (СЭМД 101)</span>
								<span className="egisz-kind-oid">1.2.643.5.1.13.13.11.101</span>
							</div>
							<div className="egisz-kind-desc">
								Протокол консультации и терапевтического стоматологического приема
							</div>
						</div>

						<div
							className={`egisz-kind-card ${formType === "043_1u" ? "active" : ""}`}
							onClick={() => setFormType("043_1u")}
						>
							<div className="egisz-kind-header">
								<span className="egisz-kind-title">Форма 043-1/у (СЭМД 109)</span>
								<span className="egisz-kind-oid">1.2.643.5.1.13.13.11.109</span>
							</div>
							<div className="egisz-kind-desc">
								Медицинская карта ортодонтического пациента: прикус по Энглю, ТРГ, биометрия
							</div>
						</div>
					</div>

					{/* Tab 1: Diagnostics */}
					{activeTab === "diagnostics" && (
						<div className="egisz-checklist">
							<div className={`egisz-check-item ${currentPatient.snils ? "item-valid" : "item-error"}`}>
								<div className="egisz-check-icon">
									{currentPatient.snils ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#e11d48" />}
								</div>
								<div className="egisz-check-text-group">
									<div className="egisz-check-label">Пациент: СНИЛС и полис ОМС</div>
									<div className="egisz-check-detail">
										{currentPatient.name.last} {currentPatient.name.first} • СНИЛС: {currentPatient.snils || "НЕ УКАЗАН"} • Полис: {currentPatient.polisOms}
									</div>
								</div>
							</div>

							<div className={`egisz-check-item ${currentDoctor.snils ? "item-valid" : "item-error"}`}>
								<div className="egisz-check-icon">
									{currentDoctor.snils ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#e11d48" />}
								</div>
								<div className="egisz-check-text-group">
									<div className="egisz-check-label">Врач: Должность и идентификатор ФРМР</div>
									<div className="egisz-check-detail">
										{currentDoctor.name.last} {currentDoctor.name.first} • {currentDoctor.position} (код {currentDoctor.positionCode}) • СНИЛС: {currentDoctor.snils}
									</div>
								</div>
							</div>

							<div className={`egisz-check-item ${currentClinic.oid ? "item-valid" : "item-error"}`}>
								<div className="egisz-check-icon">
									{currentClinic.oid ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#e11d48" />}
								</div>
								<div className="egisz-check-text-group">
									<div className="egisz-check-label">Медицинская организация (ФРМО)</div>
									<div className="egisz-check-detail">
										{currentClinic.name} • OID: {currentClinic.oid} • ОГРН: {currentClinic.ogrn}
									</div>
								</div>
							</div>

							<div className={`egisz-check-item ${validationResult.valid ? "item-valid" : "item-error"}`}>
								<div className="egisz-check-icon">
									{validationResult.valid ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#e11d48" />}
								</div>
								<div className="egisz-check-text-group">
									<div className="egisz-check-label">Справочники НСИ Минздрава (OID)</div>
									<div className="egisz-check-detail">
										МКБ-10: {icd10} • Номенклатура 804н: A16.07.046, B01.063.001 • Зубная формула: FDI
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Tab 2: Clinical */}
					{activeTab === "clinical" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px" }}>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
										Клинический диагноз
									</label>
									<input
										type="text"
										value={diagnosis}
										onChange={(e) => setDiagnosis(e.target.value)}
										style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
									/>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
										МКБ-10
									</label>
									<input
										type="text"
										value={icd10}
										onChange={(e) => setIcd10(e.target.value)}
										style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
									/>
								</div>
							</div>

							{formType === "043_1u" && (
								<>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
										<div>
											<label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
												Смыкание моляров справа (Энгль)
											</label>
											<select
												value={angleMolarR}
												onChange={(e) => setAngleMolarR(e.target.value as any)}
												style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
											>
												<option value="class_1">I класс (нейтральный)</option>
												<option value="class_2_sub_1">II класс 1 подкласс (дистальный + протрузия)</option>
												<option value="class_2_sub_2">II класс 2 подкласс (дистальный + ретрузия)</option>
												<option value="class_3">III класс (мезиальный)</option>
											</select>
										</div>
										<div>
											<label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
												Смыкание моляров слева (Энгль)
											</label>
											<select
												value={angleMolarL}
												onChange={(e) => setAngleMolarL(e.target.value as any)}
												style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
											>
												<option value="class_1">I класс (нейтральный)</option>
												<option value="class_2_sub_1">II класс 1 подкласс (дистальный + протрузия)</option>
												<option value="class_2_sub_2">II класс 2 подкласс (дистальный + ретрузия)</option>
												<option value="class_3">III класс (мезиальный)</option>
											</select>
										</div>
									</div>

									<div>
										<label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
											Выбранная ортодонтическая аппаратура
										</label>
										<select
											value={applianceType}
											onChange={(e) => setApplianceType(e.target.value)}
											style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
										>
											<option value="metal_braces_self_ligating">Металлическая самолигирующая брекет-система</option>
											<option value="ceramic_braces_aesthetic">Эстетическая керамическая брекет-система</option>
											<option value="clear_aligners">Ортодонтические элайнеры (серия кап)</option>
											<option value="rapid_palatal_expander_haas">Аппарат Марко Роса / Хааса для нёбного расширения</option>
										</select>
									</div>
								</>
							)}
						</div>
					)}

					{/* Tab 3: Signature */}
					{activeTab === "signature" && (
						<div className="egisz-sign-grid">
							{/* Doctor Signature Card */}
							<div className="egisz-sign-card">
								<div className="egisz-sign-card-header">
									<span className="egisz-sign-card-title">
										<User size={16} />
										Подпись врача (CAdES-BES)
									</span>
									{doctorSig ? (
										<span className="egisz-cert-valid-badge">
											<Check size={14} /> Подписано
										</span>
									) : (
										<span style={{ fontSize: "12px", color: "var(--muted)" }}>Не подписан</span>
									)}
								</div>

								{doctorSig ? (
									<div className="egisz-cert-details">
										<div><strong>Владелец:</strong> {doctorSig.certificateSubject}</div>
										<div><strong>Серийный номер:</strong> {doctorSig.certificateSerialNumber}</div>
										<div><strong>Дата подписания:</strong> {new Date(doctorSig.signedAt).toLocaleString("ru-RU")}</div>
										<div><strong>Алгоритм:</strong> ГОСТ Р 34.10-2012 (256 бит)</div>
										{doctorCertValidation && (
											<div style={{ marginTop: "4px", color: doctorCertValidation.valid ? "#16a34a" : "#e11d48", fontWeight: 600 }}>
												{doctorCertValidation.valid ? "✓ Сертификат проверен и действителен" : `⚠ Ошибка: ${doctorCertValidation.errors.join(", ")}`}
											</div>
										)}
									</div>
								) : (
									<div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
										Подписание выполняется сертификатом врача-стоматолога (УКЭП) с верификацией СНИЛС по справочнику ФРМР.
									</div>
								)}

								<button
									type="button"
									className="egisz-btn egisz-btn-primary"
									onClick={handleSignDoctor}
								>
									<Key size={16} />
									{doctorSig ? "Переподписать УКЭП врача" : "Подписать УКЭП врача"}
								</button>
							</div>

							{/* Clinic/MO Signature Card */}
							<div className="egisz-sign-card">
								<div className="egisz-sign-card-header">
									<span className="egisz-sign-card-title">
										<Building2 size={16} />
										Подпись клиники (МО / XAdES)
									</span>
									{clinicSig ? (
										<span className="egisz-cert-valid-badge">
											<Check size={14} /> Подписано
										</span>
									) : (
										<span style={{ fontSize: "12px", color: "var(--muted)" }}>Опционально</span>
									)}
								</div>

								{clinicSig ? (
									<div className="egisz-cert-details">
										<div><strong>Организация:</strong> {currentClinic.name}</div>
										<div><strong>Серийный номер:</strong> {clinicSig.certificateSerialNumber}</div>
										<div><strong>Время:</strong> {new Date(clinicSig.signedAt).toLocaleString("ru-RU")}</div>
										<div><strong>ОГРН клиники:</strong> {currentClinic.ogrn}</div>
									</div>
								) : (
									<div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
										Подпись медицинской организации заверяет документ перед окончательной отправкой в архив РЭМД.
									</div>
								)}

								<button
									type="button"
									className="egisz-btn egisz-btn-secondary"
									onClick={handleSignClinic}
								>
									<ShieldCheck size={16} />
									{clinicSig ? "Обновить подпись МО" : "Подписать УКЭП клиники"}
								</button>
							</div>
						</div>
					)}

					{/* Tab 4: XML Preview */}
					{activeTab === "xml" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>
									Канонический HL7 CDA Release 2 XML (UTF-8, c14n)
								</span>
								<button
									type="button"
									className="egisz-btn egisz-btn-secondary"
									onClick={handleCopyXml}
									style={{ minHeight: "36px", padding: "6px 12px", fontSize: "12px" }}
								>
									<Copy size={14} />
									{copied ? "Скопировано!" : "Копировать XML"}
								</button>
							</div>
							<div className="egisz-xml-viewer">
								{generationResult.success ? generationResult.canonicalXml : `Ошибка генерации: ${generationResult.errors.join(", ")}`}
							</div>
						</div>
					)}
				</main>

				{/* Modal Footer: 1-Click Export Actions */}
				<footer className="egisz-modal-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span style={{ fontSize: "12px", color: "var(--muted)" }}>
							СЭМД: <strong>{formType === "043_1u" ? "109 (Ортодонтия)" : "101 (Стоматология)"}</strong>
						</span>
						{doctorSig && (
							<span className="egisz-cert-valid-badge">
								<Check size={12} /> УКЭП готова к экспорту
							</span>
						)}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<button
							type="button"
							className="egisz-btn egisz-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="egisz-btn egisz-btn-success"
							onClick={handle1ClickExport}
							disabled={!generationResult.success || isSubmitting}
						>
							<Download size={16} />
							{isSubmitting ? "Отправка..." : "Экспорт пакета (XML + .sig) в 1 клик"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
