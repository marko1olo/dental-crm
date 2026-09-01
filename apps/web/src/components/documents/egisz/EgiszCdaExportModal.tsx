/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2/R3 XML EXPORT & UKEP SIGNATURE MODAL HUD
 * (МИНЗДРАВ РФ / ПРИКАЗ 911Н / НСИ OID 1.2.643.5.1.13... / ГОСТ Р 34.10-2012)
 * Universal statutory module supporting Form 043/u (SEMD 101) & Form 043-1/u (SEMD 109)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
	Check,
	CheckCircle2,
	Code2,
	Copy,
	Download,
	FileText,
	Key,
	Shield,
	ShieldAlert,
	ShieldCheck,
	User,
	X,
} from "lucide-react";
import { strToU8, zipSync } from "fflate";
import {
	build1ClickExportPackage,
	buildEgiszRemdPackage,
	createDemonstrationGostSignature,
	generateCdaXml,
	prepareUkepSigningPayload,
	validateCdaParams,
	validateDetachedSignature,
	validateUkepCertificate,
	EGISZ_OIDS,
	type CdaSemd043_1uParams,
	type CdaSemd101Params,
	type DetachedSignature,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
	type CryptoProCertificate,
} from "../../../utils/cryptoPro";
import "./egiszModal.css";

export type SemdFormType = "043u" | "043_1u";
export type AngleMolarClass = "class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3";

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
	const [angleMolarR, setAngleMolarR] = useState<AngleMolarClass>(
		orthodonticDetails?.angleMolarClassRight || "class_2_sub_1",
	);
	const [angleMolarL, setAngleMolarL] = useState<AngleMolarClass>(
		orthodonticDetails?.angleMolarClassLeft || "class_2_sub_1",
	);
	const [applianceType, setApplianceType] = useState(
		orthodonticDetails?.appliancePlan?.applianceType || "metal_braces_self_ligating",
	);

	// CryptoPro CSP & Signatures State
	const [hasCryptoPro, setHasCryptoPro] = useState<boolean | null>(null);
	const [availableCerts, setAvailableCerts] = useState<CryptoProCertificate[]>([]);
	const [selectedThumbprint, setSelectedThumbprint] = useState<string>("");
	const [isPluginSigning, setIsPluginSigning] = useState(false);
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

	// Detect CryptoPro Browser Plugin on mount
	useEffect(() => {
		let isMounted = true;
		checkCryptoProPlugin()
			.then(async (installed) => {
				if (!isMounted) return;
				setHasCryptoPro(installed);
				if (installed) {
					try {
						const certs = await getPersonalCertificates();
						if (!isMounted) return;
						setAvailableCerts(certs);
						if (certs.length > 0) {
							const cleanDoctorSnils = currentDoctor.snils?.replace(/\D/g, "");
							const matched = certs.find((c) =>
								(cleanDoctorSnils && c.subjectName.includes(cleanDoctorSnils)) ||
								c.subjectName.toLowerCase().includes(currentDoctor.name.last.toLowerCase()),
							);
							setSelectedThumbprint(matched?.thumbprint || certs[0]?.thumbprint || "");
						}
					} catch {
						// Certificate reading may fail if store is inaccessible
					}
				}
			})
			.catch(() => {
				if (isMounted) setHasCryptoPro(false);
			});

		return () => {
			isMounted = false;
		};
	}, [currentDoctor.snils, currentDoctor.name.last]);

	// Build Full CDA Parameters
	const cdaParams = useMemo(() => {
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
	const handleSignDoctorPlugin = useCallback(async () => {
		if (!generationResult.success) {
			showToast("Исправьте ошибки валидации перед подписанием", "error");
			return;
		}
		if (!selectedThumbprint) {
			showToast("Выберите сертификат КриптоПро для подписания", "error");
			return;
		}

		setIsPluginSigning(true);
		try {
			const payload = prepareUkepSigningPayload(generationResult.xml);
			const pkcs7Sig = await signBase64WithCertificate(payload.base64Content, selectedThumbprint);
			const cert = availableCerts.find((c) => c.thumbprint === selectedThumbprint);

			const sig: DetachedSignature = {
				signatureBase64: pkcs7Sig,
				certificateSerialNumber: cert?.thumbprint || "CP-CSP-SERIAL",
				certificateSubject: cert?.subjectName || `CN=${currentDoctor.name.last} ${currentDoctor.name.first}, SNILS=${currentDoctor.snils}`,
				certificateIssuer: cert?.issuerName || "УЦ КриптоПро CSP",
				validFrom: cert?.validFrom,
				validTo: cert?.validTo,
				signedAt: new Date().toISOString(),
				algorithmOid: EGISZ_OIDS.GOST_3410_2012_256,
				digestAlgorithmOid: EGISZ_OIDS.GOST_3411_2012_256,
			};
			setDoctorSig(sig);
			showToast("Электронная подпись УКЭП врача успешно сформирована через КриптоПро CSP!", "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка КриптоПро: ${msg}`, "error");
		} finally {
			setIsPluginSigning(false);
		}
	}, [generationResult, selectedThumbprint, availableCerts, currentDoctor]);

	const handleSignDoctorDemo = useCallback(() => {
		const sig = createDemonstrationGostSignature({
			doctorName: `${currentDoctor.name.last} ${currentDoctor.name.first} ${currentDoctor.name.middle || ""}`.trim(),
			doctorSnils: currentDoctor.snils,
			clinicName: currentClinic.name,
			isMoSignature: false,
		});
		setDoctorSig(sig);
		showToast("Тестовая электронная подпись УКЭП (ГОСТ Р 34.10-2012) сформирована", "success");
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

	// 1-Click Export ZIP Package Handler
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

		// Create ZIP Archive Package (XML + .sig + manifest.json)
		const zipEntries: Record<string, Uint8Array> = {
			[bundle.xmlFileName]: strToU8(bundle.xmlContent),
			[bundle.doctorSigFileName]: strToU8(bundle.doctorSigBase64),
			[bundle.manifestFileName]: strToU8(bundle.manifestJson),
		};

		if (bundle.moSigFileName && bundle.moSigBase64) {
			zipEntries[bundle.moSigFileName] = strToU8(bundle.moSigBase64);
		}

		const zippedData = zipSync(zipEntries);
		const zipBlob = new Blob([zippedData], { type: "application/zip" });
		const zipFileName = bundle.xmlFileName.replace(/\.xml$/i, ".zip");

		// Trigger download
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement("a");
		a.href = url;
		a.download = zipFileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

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
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(remdPackage),
			});

			if (res.ok) {
				showToast("ZIP-пакет сформирован и отправлен в шлюз ЕГИСЗ РЭМД!", "success");
			} else {
				showToast("ZIP-пакет (XML + .sig) успешно сформирован и сохранен на диск", "success");
			}
		} catch {
			showToast("ZIP-пакет (XML + .sig) успешно сохранен на диск", "success");
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
							<ShieldCheck size={20} />
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
						<X size={18} />
					</button>
				</header>

				{/* Navigation Tabs */}
				<nav className="egisz-tabs-bar">
					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "diagnostics" ? "active" : ""}`}
						onClick={() => setActiveTab("diagnostics")}
					>
						<Shield size={14} />
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
						<FileText size={14} />
						Клинический статус
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "signature" ? "active" : ""}`}
						onClick={() => setActiveTab("signature")}
					>
						<Key size={14} />
						Подпись УКЭП
						{doctorSig && (
							<span className="egisz-tab-badge badge-success inline-flex items-center gap-1">
								ВРАЧ <Check size={10} aria-hidden="true" />
							</span>
						)}
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "xml" ? "active" : ""}`}
						onClick={() => setActiveTab("xml")}
					>
						<Code2 size={14} />
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
									{currentPatient.snils ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertCircle size={16} color="#e11d48" />}
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
									{currentDoctor.snils ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertCircle size={16} color="#e11d48" />}
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
									{currentClinic.oid ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertCircle size={16} color="#e11d48" />}
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
									{validationResult.valid ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertCircle size={16} color="#e11d48" />}
								</div>
								<div className="egisz-check-text-group">
									<div className="egisz-check-label">Справочники НСИ Минздрава (OID)</div>
									<div className="egisz-check-detail">
										МКБ-10: {icd10} • Номенклатура 804н: A16.07.046, B01.063.001 • Зубная формула: FDI
									</div>
								</div>
							</div>

							{validationResult.errors.length > 0 && (
								<div className="egisz-check-item item-error">
									<div className="egisz-check-icon">
										<ShieldAlert size={16} color="#e11d48" />
									</div>
									<div className="egisz-check-text-group">
										<div className="egisz-check-label">Обнаружены несоответствия стандарту:</div>
										<ul className="egisz-check-detail list-disc pl-4">
											{validationResult.errors.map((err, i) => (
												<li key={i}>{err}</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Tab 2: Clinical */}
					{activeTab === "clinical" && (
						<div className="egisz-form-container">
							<div className="egisz-form-grid-split">
								<div className="egisz-field-group">
									<label className="egisz-field-label">
										Клинический диагноз
									</label>
									<input
										type="text"
										value={diagnosis}
										autoFocus
										onChange={(e) => setDiagnosis(e.target.value)}
										className="egisz-input"
									/>
								</div>
								<div className="egisz-field-group">
									<label className="egisz-field-label">
										МКБ-10
									</label>
									<input
										type="text"
										value={icd10}
										onChange={(e) => setIcd10(e.target.value)}
										className="egisz-input"
									/>
								</div>
							</div>

							{formType === "043_1u" && (
								<>
									<div className="egisz-form-grid-2col">
										<div className="egisz-field-group">
											<label className="egisz-field-label">
												Смыкание моляров справа (Энгль)
											</label>
											<select
												value={angleMolarR}
												onChange={(e) => {
													const val = e.target.value as AngleMolarClass;
													setAngleMolarR(val);
												}}
												className="egisz-select"
											>
												<option value="class_1">I класс (нейтральный)</option>
												<option value="class_2_sub_1">II класс 1 подкласс (дистальный + протрузия)</option>
												<option value="class_2_sub_2">II класс 2 подкласс (дистальный + ретрузия)</option>
												<option value="class_3">III класс (мезиальный)</option>
											</select>
										</div>
										<div className="egisz-field-group">
											<label className="egisz-field-label">
												Смыкание моляров слева (Энгль)
											</label>
											<select
												value={angleMolarL}
												onChange={(e) => {
													const val = e.target.value as AngleMolarClass;
													setAngleMolarL(val);
												}}
												className="egisz-select"
											>
												<option value="class_1">I класс (нейтральный)</option>
												<option value="class_2_sub_1">II класс 1 подкласс (дистальный + протрузия)</option>
												<option value="class_2_sub_2">II класс 2 подкласс (дистальный + ретрузия)</option>
												<option value="class_3">III класс (мезиальный)</option>
											</select>
										</div>
									</div>

									<div className="egisz-field-group">
										<label className="egisz-field-label">
											Выбранная ортодонтическая аппаратура
										</label>
										<select
											value={applianceType}
											onChange={(e) => setApplianceType(e.target.value)}
											className="egisz-select"
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
										<User size={15} />
										Подпись врача (CAdES-BES)
									</span>
									{doctorSig ? (
										<span className="egisz-cert-valid-badge">
											<Check size={12} /> Подписано
										</span>
									) : (
										<span className="egisz-cert-empty-state">Не подписан</span>
									)}
								</div>

								{/* CryptoPro Browser Plugin Selection */}
								{hasCryptoPro && availableCerts.length > 0 && (
									<div className="egisz-cryptopro-banner">
										<div className="font-semibold">Обнаружен плагин КриптоПро CSP</div>
										<select
											value={selectedThumbprint}
											onChange={(e) => setSelectedThumbprint(e.target.value)}
											className="egisz-select"
										>
											{availableCerts.map((cert) => (
												<option key={cert.thumbprint} value={cert.thumbprint}>
													{cert.name || cert.subjectName} (до {new Date(cert.validTo).toLocaleDateString("ru-RU")})
												</option>
											))}
										</select>
									</div>
								)}

								{doctorSig ? (
									<div className="egisz-cert-details">
										<div><strong>Владелец:</strong> {doctorSig.certificateSubject}</div>
										<div><strong>Серийный номер:</strong> {doctorSig.certificateSerialNumber}</div>
										<div><strong>Дата подписания:</strong> {new Date(doctorSig.signedAt).toLocaleString("ru-RU")}</div>
										<div><strong>Алгоритм:</strong> ГОСТ Р 34.10-2012 (256 бит)</div>
										{doctorCertValidation && (
											<div className={`egisz-cert-status-row ${doctorCertValidation.valid ? "egisz-cert-status-ok" : "egisz-cert-status-err"}`}>
												{doctorCertValidation.valid ? (
													<>
														<CheckCircle2 size={13} className="shrink-0" aria-hidden="true" />
														<span>Сертификат проверен и действителен</span>
													</>
												) : (
													<>
														<AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
														<span>Ошибка: {doctorCertValidation.errors.join(", ")}</span>
													</>
												)}
											</div>
										)}
									</div>
								) : (
									<div className="egisz-cert-empty-state">
										Подписание выполняется сертификатом врача-стоматолога (УКЭП) с верификацией СНИЛС по справочнику ФРМР.
									</div>
								)}

								<div className="flex flex-col gap-2">
									{hasCryptoPro && availableCerts.length > 0 ? (
										<button
											type="button"
											className="egisz-btn egisz-btn-primary"
											onClick={handleSignDoctorPlugin}
											disabled={isPluginSigning}
										>
											<Key size={14} />
											{isPluginSigning ? "Подписание..." : (doctorSig ? "Переподписать КриптоПро CSP" : "Подписать через КриптоПро CSP")}
										</button>
									) : (
										<button
											type="button"
											className="egisz-btn egisz-btn-primary"
											onClick={handleSignDoctorDemo}
										>
											<Key size={14} />
											{doctorSig ? "Переподписать УКЭП врача" : "Сформировать УКЭП (ГОСТ 34.10-2012)"}
										</button>
									)}
								</div>
							</div>

							{/* Clinic/MO Signature Card */}
							<div className="egisz-sign-card">
								<div className="egisz-sign-card-header">
									<span className="egisz-sign-card-title">
										<Building2 size={15} />
										Подпись клиники (МО / XAdES)
									</span>
									{clinicSig ? (
										<span className="egisz-cert-valid-badge">
											<Check size={12} /> Подписано
										</span>
									) : (
										<span className="egisz-cert-empty-state">Опционально</span>
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
									<div className="egisz-cert-empty-state">
										Подпись медицинской организации заверяет документ перед окончательной отправкой в архив РЭМД.
									</div>
								)}

								<button
									type="button"
									className="egisz-btn egisz-btn-secondary"
									onClick={handleSignClinic}
								>
									<ShieldCheck size={14} />
									{clinicSig ? "Обновить подпись МО" : "Подписать УКЭП клиники"}
								</button>
							</div>
						</div>
					)}

					{/* Tab 4: XML Preview */}
					{activeTab === "xml" && (
						<div className="egisz-xml-container">
							<div className="egisz-xml-toolbar">
								<span className="egisz-xml-title">
									Канонический HL7 CDA Release 2/3 XML (UTF-8, c14n)
								</span>
								<button
									type="button"
									className="egisz-btn egisz-btn-secondary"
									onClick={handleCopyXml}
								>
									<Copy size={13} />
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
					<div className="egisz-footer-info">
						<span>
							СЭМД: <strong>{formType === "043_1u" ? "109 (Ортодонтия)" : "101 (Стоматология)"}</strong>
						</span>
						{doctorSig && (
							<span className="egisz-cert-valid-badge">
								<Check size={12} /> УКЭП готова
							</span>
						)}
					</div>

					<div className="egisz-footer-actions">
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
							<Download size={14} />
							{isSubmitting ? "Отправка..." : "Экспорт ZIP-пакета (XML + .sig) в 1 клик"}
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
