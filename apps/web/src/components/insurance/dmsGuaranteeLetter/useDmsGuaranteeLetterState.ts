/**
 * useDmsGuaranteeLetterState.ts — Хук управления состоянием, гидратацией из API
 * и бизнес-логикой модального окна гарантийного письма ДМС.
 */

import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { RUSSIAN_DMS_INSURERS, type DmsGuaranteeLetter } from "../insuranceMath";
import {
	type DmsFranchiseKind,
	type DmsGuaranteeLetterModalProps,
	type DmsLetterLifecycleStatus,
	type ExpressDmsGuaranteePreset,
	type SplitEngineGuaranteeLetter,
	fetchPatientGuaranteeLettersFromApi,
	saveGuaranteeLetterToApi,
} from "./types";

export function useDmsGuaranteeLetterState({
	isOpen,
	onClose,
	patient,
	initialLetter,
	onSave,
}: Pick<
	DmsGuaranteeLetterModalProps,
	"isOpen" | "onClose" | "patient" | "initialLetter" | "onSave"
>) {
	const todayStr = useMemo(
		() => new Date().toISOString().split("T")[0] ?? "2026-08-22",
		[],
	);
	const nextMonthStr = useMemo(() => {
		const d = new Date();
		d.setMonth(d.getMonth() + 1);
		return d.toISOString().split("T")[0] ?? "2026-09-22";
	}, []);

	const [insurerKey, setInsurerKey] = useState<string>(
		initialLetter?.insurerKey ||
			(patient?.insuranceCompany ? "custom" : RUSSIAN_DMS_INSURERS[0]?.key || "sogaz"),
	);
	const [customInsurerName, setCustomInsurerName] = useState<string>(
		initialLetter?.insurerName || patient?.insuranceCompany || "",
	);
	const [policyNumber, setPolicyNumber] = useState<string>(
		initialLetter?.policyNumber || patient?.policyNumber || "",
	);
	const [letterNumber, setLetterNumber] = useState<string>(
		initialLetter?.letterNumber ||
			`ГП-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
	);
	const [isEmergencyCare, setIsEmergencyCare] = useState<boolean>(false);
	const [isDeferredScan, setIsDeferredScan] = useState<boolean>(false);
	const [attachedScanFileName, setAttachedScanFileName] = useState<string>("");
	const [issueDate, setIssueDate] = useState<string>(
		initialLetter?.issueDate ?? todayStr ?? "",
	);
	const [validFrom, setValidFrom] = useState<string>(
		initialLetter?.validFrom ?? todayStr ?? "",
	);
	const [validUntil, setValidUntil] = useState<string>(
		initialLetter?.validUntil ?? nextMonthStr ?? "",
	);

	// Лимиты и франшиза
	const [maxCoverageRub, setMaxCoverageRub] = useState<number>(
		initialLetter?.maxCoverageRub ?? (isDemoShowcaseMode() ? 50000 : 0),
	);
	const [usedAmountRub, setUsedAmountRub] = useState<number>(
		initialLetter?.usedAmountRub ?? 0,
	);
	const [franchiseType, setFranchiseType] = useState<DmsFranchiseKind>(
		initialLetter?.franchiseType ?? "percent",
	);
	const [franchisePct, setFranchisePct] = useState<number>(
		initialLetter?.franchisePct ?? 0,
	);
	const [franchiseFixedRub, setFranchiseFixedRub] = useState<number>(
		initialLetter?.franchiseFixedRub ?? 0,
	);

	// Исключения и согласованные позиции (в боевом режиме 0% выдуманных услуг)
	const [selectedExclusions, setSelectedExclusions] = useState<string[]>(
		initialLetter?.programExclusions
			? [...initialLetter.programExclusions]
			: isDemoShowcaseMode()
			? [
					"orthodontics",
					"implantology",
					"whitening",
					"veneers",
					"prosthetics_precious",
				]
			: [],
	);
	const [approvedServiceCodes, setApprovedServiceCodes] = useState<string[]>(
		initialLetter?.approvedServiceCodes
			? [...initialLetter.approvedServiceCodes]
			: isDemoShowcaseMode()
			? [
					"A16.07.002.001",
					"A16.07.030.001",
					"A16.07.008.001",
					"B01.003.004.001",
				]
			: [],
	);
	const [approvedDiagnosisCodes, setApprovedDiagnosisCodes] = useState<string[]>(
		initialLetter?.approvedDiagnosisCodes
			? [...initialLetter.approvedDiagnosisCodes]
			: isDemoShowcaseMode()
			? ["K02.1", "K04.0"]
			: [],
	);
	const [approvedTeethFdi, setApprovedTeethFdi] = useState<string[]>(
		isDemoShowcaseMode() ? ["1.6", "2.6"] : [],
	);
	const [notes, setNotes] = useState<string>(initialLetter?.notes || "");
	const [status, setStatus] = useState<DmsLetterLifecycleStatus>(
		initialLetter?.status || "active",
	);

	// Гидратация существующего гарантийного письма пациента из PostgreSQL через Fastify API
	useEffect(() => {
		if (!isOpen || initialLetter || !patient?.id) return;
		let isCancelled = false;

		fetchPatientGuaranteeLettersFromApi(patient.id)
			.then((letters) => {
				if (isCancelled || !letters || letters.length === 0) return;
				const active =
					letters.find((l) => l.status === "active") || letters[0];
				if (!active) return;

				if (active.letterNumber) setLetterNumber(String(active.letterNumber));
				if (active.insurerKey) setInsurerKey(String(active.insurerKey));
				if (active.insurerName) setCustomInsurerName(String(active.insurerName));
				if (active.policyNumber) setPolicyNumber(String(active.policyNumber));
				if (active.issueDate) setIssueDate(String(active.issueDate).slice(0, 10));
				if (active.validFrom) setValidFrom(String(active.validFrom).slice(0, 10));
				if (active.validUntil) setValidUntil(String(active.validUntil).slice(0, 10));
				if (active.maxCoverageRub !== undefined)
					setMaxCoverageRub(Number(active.maxCoverageRub));
				if (active.usedAmountRub !== undefined)
					setUsedAmountRub(Number(active.usedAmountRub));
				if (active.franchisePct !== undefined)
					setFranchisePct(Number(active.franchisePct));
				if (active.franchiseType) setFranchiseType(active.franchiseType);
				if (active.franchiseFixedRub !== undefined)
					setFranchiseFixedRub(Number(active.franchiseFixedRub));
				if (Array.isArray(active.approvedServiceCodes))
					setApprovedServiceCodes([...active.approvedServiceCodes]);
				if (Array.isArray(active.approvedDiagnosisCodes))
					setApprovedDiagnosisCodes([...active.approvedDiagnosisCodes]);
				if (Array.isArray(active.programExclusions))
					setSelectedExclusions([...active.programExclusions]);
				if (active.notes) setNotes(String(active.notes));
				if (active.status) setStatus(active.status);
			})
			.catch(() => {});

		return () => {
			isCancelled = true;
		};
	}, [isOpen, initialLetter, patient?.id]);

	const activeInsurer = useMemo(
		() => RUSSIAN_DMS_INSURERS.find((i) => i.key === insurerKey),
		[insurerKey],
	);

	const insurerDisplayName =
		insurerKey === "custom"
			? customInsurerName || "Пользовательская страховая компания"
			: activeInsurer?.shortName || "Страховая компания";

	const remainingLimitRub = Math.max(0, maxCoverageRub - usedAmountRub);
	const usagePercent =
		maxCoverageRub > 0
			? Math.min(100, Math.round((usedAmountRub / maxCoverageRub) * 100))
			: 0;

	const letterForSplit: SplitEngineGuaranteeLetter = useMemo(
		() => ({
			id: initialLetter?.id || "preview-letter",
			patientId: patient?.id || "preview-patient",
			patientFullName: patient?.fullName || "Пациент ДМС",
			insurerId: insurerKey,
			insurerName: insurerDisplayName,
			letterNumber: letterNumber || "ГП-ПРЕВЬЮ",
			policyNumber: policyNumber || "ПОЛИС",
			issueDate: issueDate || todayStr,
			validFrom: validFrom || todayStr,
			validUntil: validUntil || nextMonthStr,
			maxCoverageKopecks: Math.round(maxCoverageRub * 100),
			usedAmountKopecks: Math.round(usedAmountRub * 100),
			franchisePercent: franchiseType === "percent" ? franchisePct : 0,
			franchiseFixedKopecks:
				franchiseType === "fixed_rub" ? Math.round(franchiseFixedRub * 100) : 0,
			approvedTeethFdi,
			approvedServiceCodes804n: approvedServiceCodes,
			programExclusions: selectedExclusions,
			notes,
			status,
		}),
		[
			initialLetter?.id,
			patient?.id,
			patient?.fullName,
			insurerKey,
			insurerDisplayName,
			letterNumber,
			policyNumber,
			issueDate,
			todayStr,
			validFrom,
			validUntil,
			nextMonthStr,
			maxCoverageRub,
			usedAmountRub,
			franchiseType,
			franchisePct,
			franchiseFixedRub,
			approvedTeethFdi,
			approvedServiceCodes,
			selectedExclusions,
			notes,
			status,
		],
	);

	const toggleExclusion = (exclusionKey: string) => {
		setSelectedExclusions((prev) =>
			prev.includes(exclusionKey)
				? prev.filter((k) => k !== exclusionKey)
				: [...prev, exclusionKey],
		);
	};

	const toggleApprovedService = (code: string) => {
		setApprovedServiceCodes((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	const toggleDiagnosis = (code: string) => {
		setApprovedDiagnosisCodes((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	const toggleApprovedTooth = (toothFdi: string) => {
		setApprovedTeethFdi((prev) =>
			prev.includes(toothFdi)
				? prev.filter((t) => t !== toothFdi)
				: [...prev, toothFdi],
		);
	};

	const handleActivateEmergencyPainMode = () => {
		setIsEmergencyCare(true);
		const emergencyLetterNumber =
			letterNumber.trim() && !letterNumber.startsWith("ГП-")
				? letterNumber
				: `ГП-ЭКСТРЕННО-${Date.now().toString().slice(-6)} (ГАРАНТИЯ В ПУТИ)`;
		setLetterNumber(emergencyLetterNumber);
		if (!policyNumber.trim()) {
			setPolicyNumber(patient?.policyNumber || "ПОЛИС-ДМС-ОСТРАЯ-БОЛЬ");
		}
		setMaxCoverageRub((prev) => (prev < 35000 ? 50000 : prev));
		setStatus("active");
		const acuteServiceCodes = [
			"A16.07.030.001",
			"A11.07.010",
			"A16.07.011",
			"A16.07.008.001",
			"A16.07.002.001",
			"B01.003.004.001",
		];
		setApprovedServiceCodes((prev) =>
			Array.from(new Set([...prev, ...acuteServiceCodes])),
		);
		const acuteDiagnoses = ["K04.0", "K04.4"];
		setApprovedDiagnosisCodes((prev) =>
			Array.from(new Set([...prev, ...acuteDiagnoses])),
		);
		setNotes(
			"Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора). Временное согласование неотложных манипуляций (депульпирование, анестезия, вскрытие абсцесса) без блокировки кассы или приёма.",
		);
		showToast(
			"Экстренный приём / Гарантия в пути: лечение начато без ожидания письма, устное подтверждение куратора зафиксировано, приём разблокирован!",
			"success",
		);
	};

	const handleApplyExpressPreset = (preset: ExpressDmsGuaranteePreset) => {
		setInsurerKey(preset.insurerKey);
		setCustomInsurerName(preset.insurerNameRu);
		setMaxCoverageRub(preset.maxCoverageRub);
		setFranchisePct(preset.franchisePct);
		setFranchiseType("percent");
		setApprovedServiceCodes([...preset.approvedServiceCodes804n]);
		setApprovedDiagnosisCodes([...preset.approvedDiagnosisMkb10]);
		setNotes(preset.noteRu);
		if (
			!letterNumber ||
			letterNumber.startsWith("ГП-") ||
			letterNumber.startsWith("ГП-ЭКСТРЕННО-")
		) {
			const prefixMap: Record<string, string> = {
				sogaz: "СОГАЗ-ГП",
				ingosstrakh: "ИНГОС-ГП",
				alfastrakhovanie: "АЛЬФА-ГП",
				reso_garantiya: "РЕСО-ГП",
			};
			const pfx = prefixMap[preset.insurerKey] ?? "ГП";
			setLetterNumber(
				`${pfx}-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
			);
		}
		showToast(`Экспресс-шаблон «${preset.labelRu}» применен в 1 клик`, "info");
	};

	const buildCurrentLetter = (): DmsGuaranteeLetter => {
		const resolvedPolicy =
			policyNumber.trim() ||
			patient?.policyNumber ||
			(isEmergencyCare
				? "ЭКСТРЕННЫЙ-ДМС-ОСТРАЯ-БОЛЬ"
				: isDeferredScan
				? "ДМС-ДОСЫЛКА-СКАНА"
				: "ПОЛИС-ДМС-БЕЗ-НОМЕРА");
		const resolvedLetterNum =
			letterNumber.trim() ||
			(isEmergencyCare
				? `ГП-ЭКСТРЕННО-${Date.now().toString().slice(-6)} (ДОСЫЛКА)`
				: isDeferredScan
				? `ГП-В-ПУТИ-${Date.now().toString().slice(-6)} (ДОСЫЛКА)`
				: `ГП-ДМС-${Date.now().toString().slice(-6)}`);
		const resolvedCoverage = maxCoverageRub > 0 ? maxCoverageRub : 50000;
		const resolvedNotes =
			isDeferredScan && !notes.includes("досылка")
				? `${notes.trim() ? notes.trim() + " • " : ""}Отложенный ввод скана (гарантия в пути / устное подтверждение куратора)`.trim()
				: notes.trim();

		return {
			id: initialLetter?.id || `letter-${Date.now()}`,
			organizationId: initialLetter?.organizationId,
			patientId: patient?.id || initialLetter?.patientId || "pat-1",
			patientFullName:
				patient?.fullName || initialLetter?.patientFullName || "Пациент",
			patientBirthDate: patient?.birthDate ?? initialLetter?.patientBirthDate,
			policyNumber: resolvedPolicy,
			insurerKey,
			insurerName: insurerDisplayName,
			letterNumber: resolvedLetterNum,
			issueDate,
			validFrom,
			validUntil,
			maxCoverageRub: resolvedCoverage,
			usedAmountRub,
			franchisePct: franchiseType === "percent" ? franchisePct : 0,
			franchiseType,
			franchiseFixedRub: franchiseType === "fixed_rub" ? franchiseFixedRub : 0,
			programExclusions: selectedExclusions,
			approvedServiceCodes,
			approvedDiagnosisCodes,
			notes: resolvedNotes,
			status,
		};
	};

	const persistLetterToBackend = (letter: DmsGuaranteeLetter) => {
		if (!patient?.id) return;
		saveGuaranteeLetterToApi({
			id: initialLetter?.id,
			patientId: patient.id,
			patientFullName: patient.fullName || "Пациент",
			patientBirthDate: patient.birthDate,
			policyNumber: letter.policyNumber,
			insurerKey: letter.insurerKey,
			insurerName: letter.insurerName,
			letterNumber: letter.letterNumber,
			issueDate: letter.issueDate,
			validFrom: letter.validFrom,
			validUntil: letter.validUntil,
			maxCoverageRub: letter.maxCoverageRub,
			usedAmountRub: letter.usedAmountRub,
			franchisePct: letter.franchisePct,
			franchiseType: letter.franchiseType,
			franchiseFixedRub: letter.franchiseFixedRub,
			programExclusions: letter.programExclusions,
			approvedServiceCodes: letter.approvedServiceCodes,
			approvedDiagnosisCodes: letter.approvedDiagnosisCodes,
			notes: letter.notes,
			status: letter.status,
		}).catch(() => {});
	};

	const handleSave = () => {
		const letter = buildCurrentLetter();
		persistLetterToBackend(letter);

		if (onSave) {
			onSave(letter);
		}
		showToast(
			isEmergencyCare
				? `Временное согласование по острой боли № ${letter.letterNumber} сохранено. Приём и касса разблокированы!`
				: isDeferredScan
				? `Гарантийное письмо № ${letter.letterNumber} сохранено с отложенным сканом (приём разблокирован)`
				: `Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) успешно сохранено`,
			"success",
		);
		onClose();
	};

	const handleAttachToCurrentVisit = () => {
		const letter = buildCurrentLetter();
		persistLetterToBackend(letter);
		if (onSave) {
			onSave(letter);
		}
		showToast(
			`Гарантийное письмо № ${letter.letterNumber} привязано к текущему визиту (${letter.insurerName})`,
			"success",
		);
		onClose();
	};

	const handleSendPreAuthRequest = () => {
		const letter = buildCurrentLetter();
		persistLetterToBackend(letter);
		showToast(
			`Запрос на согласование (${letter.approvedServiceCodes.length} усл.) отправлен куратору ${letter.insurerName}`,
			"info",
		);
	};

	return {
		insurerKey,
		setInsurerKey,
		customInsurerName,
		setCustomInsurerName,
		policyNumber,
		setPolicyNumber,
		letterNumber,
		setLetterNumber,
		isEmergencyCare,
		setIsEmergencyCare,
		isDeferredScan,
		setIsDeferredScan,
		attachedScanFileName,
		setAttachedScanFileName,
		issueDate,
		setIssueDate,
		validFrom,
		setValidFrom,
		validUntil,
		setValidUntil,
		maxCoverageRub,
		setMaxCoverageRub,
		usedAmountRub,
		setUsedAmountRub,
		remainingLimitRub,
		usagePercent,
		franchiseType,
		setFranchiseType,
		franchisePct,
		setFranchisePct,
		franchiseFixedRub,
		setFranchiseFixedRub,
		selectedExclusions,
		toggleExclusion,
		approvedServiceCodes,
		toggleApprovedService,
		approvedDiagnosisCodes,
		toggleDiagnosis,
		approvedTeethFdi,
		toggleApprovedTooth,
		notes,
		setNotes,
		status,
		setStatus,
		activeInsurer,
		insurerDisplayName,
		letterForSplit,
		handleActivateEmergencyPainMode,
		handleApplyExpressPreset,
		handleSave,
		handleAttachToCurrentVisit,
		handleSendPreAuthRequest,
	};
}
