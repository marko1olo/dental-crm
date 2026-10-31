/**
 * usePatientStudioState.ts — Хук состояния и бизнес-логики канонической студии пациентов.
 *
 * МАНДАТЫ:
 * - Мандат 8e (Автономия врача и администратора): экспресс-регистрация за 10 секунд (ФИО + телефон).
 *   Кнопка сохранения никогда не блокируется. Ноль бюрократии до кресла врача.
 * - Мандат 8n (Семейный баланс в 1 клик): покрытие задолженностей за счет родственников без заявлений.
 * - Мандат 8b (Sweet Spot: 120–220 строк).
 */

import { useState, useMemo, useRef, useCallback } from "react";
import {
	type PatientCatalogItem,
	type PatientCategory,
	type FamilyMember,
	type PatientFamilyGroup,
	DEMO_PATIENT_CATALOG,
	DEMO_FAMILY_GROUPS,
	transferFamilyBalance,
	validateExpressPatientRegistration,
} from "../patientCatalogData";
import { showToast } from "../../GlobalToast";

export type PatientStudioTab = "profile" | "family" | "history";

export interface UsePatientStudioStateParams {
	readonly initialPatientId?: string | null;
	readonly initialMode?: "view" | "edit" | "create";
	readonly onSavePatient?: (patient: PatientCatalogItem) => void;
}

export function usePatientStudioState({
	initialPatientId,
	initialMode = "view",
	onSavePatient,
}: UsePatientStudioStateParams) {
	const [patients, setPatients] = useState<PatientCatalogItem[]>(DEMO_PATIENT_CATALOG);
	const [families, setFamilies] = useState<PatientFamilyGroup[]>(DEMO_FAMILY_GROUPS);
	const [selectedPatientId, setSelectedPatientId] = useState<string>(
		initialPatientId || DEMO_PATIENT_CATALOG[0]?.id || "pat-001",
	);
	const [mode, setMode] = useState<"view" | "create">(initialMode === "create" ? "create" : "view");
	const [activeTab, setActiveTab] = useState<PatientStudioTab>("profile");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [showDocFields, setShowDocFields] = useState<boolean>(false);
	const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);

	// Поля экспресс-регистрации (Мандат 8e)
	const [draftName, setDraftName] = useState<string>("");
	const [draftPhone, setDraftPhone] = useState<string>("");
	const [draftBirthDate, setDraftBirthDate] = useState<string>("");
	const [draftCategory, setDraftCategory] = useState<PatientCategory>("primary");
	const [draftIsSomaticNorm, setDraftIsSomaticNorm] = useState<boolean>(true);
	const [draftNotes, setDraftNotes] = useState<string>("");
	const [draftPassportSeries, setDraftPassportSeries] = useState<string>("");
	const [draftPassportNumber, setDraftPassportNumber] = useState<string>("");
	const [draftSnils, setDraftSnils] = useState<string>("");

	const nameInputRef = useRef<HTMLInputElement>(null);
	const phoneInputRef = useRef<HTMLInputElement>(null);

	// Текущий выбранный пациент
	const currentPatient = useMemo(() => {
		return patients.find((p) => p.id === selectedPatientId) || patients[0];
	}, [patients, selectedPatientId]);

	// Семейная группа текущего пациента
	const currentFamily = useMemo(() => {
		if (!currentPatient?.familyId) return null;
		return families.find((f) => f.familyId === currentPatient.familyId) || null;
	}, [currentPatient, families]);

	// Поиск и фильтрация пациентов
	const filteredPatients = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return patients;
		return patients.filter((p) => p.fullName.toLowerCase().includes(q) || p.phone.includes(q));
	}, [patients, searchQuery]);

	// Переключение в режим создания нового пациента
	const handleStartCreate = useCallback(() => {
		setDraftName("");
		setDraftPhone("");
		setDraftBirthDate("");
		setDraftCategory("primary");
		setDraftIsSomaticNorm(true);
		setDraftNotes("");
		setDraftPassportSeries("");
		setDraftPassportNumber("");
		setDraftSnils("");
		setShowDocFields(false);
		setGuidanceMessage(null);
		setMode("create");
		setTimeout(() => nameInputRef.current?.focus(), 50);
	}, []);

	// Выбор пациента из списка
	const handleSelectPatient = useCallback((patientId: string) => {
		setSelectedPatientId(patientId);
		setMode("view");
	}, []);

	// Мягкое сохранение без блокировок (Мандат 8e)
	const handleSave = useCallback(() => {
		if (mode === "create") {
			const validation = validateExpressPatientRegistration({ fullName: draftName, phone: draftPhone });
			if (!validation.isValid) {
				setGuidanceMessage(validation.guidanceMessage || "Заполните обязательные поля");
				if (validation.errorField === "fullName") {
					nameInputRef.current?.focus();
				} else if (validation.errorField === "phone") {
					phoneInputRef.current?.focus();
				}
				return;
			}

			const newPatient: PatientCatalogItem = {
				id: `pat-${Date.now()}`,
				fullName: draftName.trim(),
				phone: draftPhone.trim(),
				birthDate: draftBirthDate || undefined,
				category: draftCategory,
				balanceKopecks: 0,
				allergies: [],
				isSomaticNorm: draftIsSomaticNorm,
				notes: draftNotes.trim() || undefined,
				passport: draftPassportSeries || draftPassportNumber
					? { series: draftPassportSeries, number: draftPassportNumber }
					: undefined,
				snils: draftSnils || undefined,
			};

			setPatients((prev) => [newPatient, ...prev]);
			setSelectedPatientId(newPatient.id);
			setMode("view");
			setGuidanceMessage(null);
			showToast(`Пациент ${newPatient.fullName} успешно зарегистрирован`, "success");
			onSavePatient?.(newPatient);
		} else {
			showToast("Данные пациента сохранены", "success");
			if (currentPatient) {
				onSavePatient?.(currentPatient);
			}
		}
	}, [
		mode,
		draftName,
		draftPhone,
		draftBirthDate,
		draftCategory,
		draftIsSomaticNorm,
		draftNotes,
		draftPassportSeries,
		draftPassportNumber,
		draftSnils,
		currentPatient,
		onSavePatient,
	]);

	// Покрытие задолженности с аванса родственника в 1 клик (Мандат 8n)
	const handlePayDebtFromRelative = useCallback((payer: FamilyMember) => {
		if (!currentFamily || !currentPatient || currentPatient.balanceKopecks >= 0) return;
		const debtAmount = Math.abs(currentPatient.balanceKopecks);
		const payAmount = Math.min(debtAmount, Math.max(0, payer.balanceKopecks));

		if (payAmount <= 0) {
			showToast(`На счёте родственника ${payer.fullName} нет доступного аванса`, "warning");
			return;
		}

		const result = transferFamilyBalance({
			fromMemberId: payer.id,
			toMemberId: currentPatient.id,
			amountKopecks: payAmount,
			members: currentFamily.members,
		});

		if (result.success) {
			setFamilies((prev) =>
				prev.map((f) => (f.familyId === currentFamily.familyId ? { ...f, members: result.updatedMembers } : f)),
			);
			setPatients((prev) =>
				prev.map((p) => (p.id === currentPatient.id ? { ...p, balanceKopecks: p.balanceKopecks + payAmount } : p)),
			);
			showToast(result.message, "success");
		} else {
			showToast(result.message, "error");
		}
	}, [currentFamily, currentPatient]);

	return {
		patients,
		families,
		selectedPatientId,
		currentPatient,
		currentFamily,
		mode,
		setMode,
		activeTab,
		setActiveTab,
		searchQuery,
		setSearchQuery,
		filteredPatients,
		showDocFields,
		setShowDocFields,
		guidanceMessage,
		draftName,
		setDraftName,
		draftPhone,
		setDraftPhone,
		draftBirthDate,
		setDraftBirthDate,
		draftCategory,
		setDraftCategory,
		draftIsSomaticNorm,
		setDraftIsSomaticNorm,
		draftNotes,
		setDraftNotes,
		draftPassportSeries,
		setDraftPassportSeries,
		draftPassportNumber,
		setDraftPassportNumber,
		draftSnils,
		setDraftSnils,
		nameInputRef,
		phoneInputRef,
		handleStartCreate,
		handleSelectPatient,
		handleSave,
		handlePayDebtFromRelative,
	};
}
