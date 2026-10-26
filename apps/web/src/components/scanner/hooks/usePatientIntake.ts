/**
 * usePatientIntake.ts
 *
 * Patient search, electronic card creation, and document attachment upload hook.
 */

import { useCallback, useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { ExtractedOmsData, ExtractedPassportData, ExtractedSnilsData } from "../documentScannerEngine";
import { DEMO_COCKPIT_PATIENTS, type NewPatientIntakeDraft, type ScannerAttachmentSummary, type ScannerPatientSummary } from "../scannerTypes";
import { uploadPatientAttachment } from "./patientAttachmentUploader";

export function usePatientIntake(
	capturedBlob: Blob | null, presetTitle: string,
	extractedPassport: ExtractedPassportData | null, extractedOms: ExtractedOmsData | null, extractedSnils: ExtractedSnilsData | null,
) {
	const [intakeMode, setIntakeMode] = useState<"existing" | "new">("existing");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<ScannerPatientSummary[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedPatient, setSelectedPatient] = useState<ScannerPatientSummary | null>(null);
	const [recentAttachments, setRecentAttachments] = useState<ScannerAttachmentSummary[]>([]);
	const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [newPatientForm, setNewPatientForm] = useState<NewPatientIntakeDraft>({
		fullName: "", phone: "", birthDate: "", passportSeries: "", passportNumber: "",
		passportIssuerCode: "", snils: "", omsPolicy: "",
	});

	const loadPatientAttachments = useCallback(async (patientId: string) => {
		if (!patientId) return;
		setIsLoadingAttachments(true);
		try {
			const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/attachments`, { headers: denteAdminSecretRequestHeaders() });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) setRecentAttachments(data.slice(0, 5));
			}
		} catch {} finally { setIsLoadingAttachments(false); }
	}, []);
	useEffect(() => {
		const query = searchQuery.trim();
		if (!query) { setSearchResults(isDemoShowcaseMode() ? DEMO_COCKPIT_PATIENTS : []); return; }
		let isCancelled = false;
		setIsSearching(true);
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`, { headers: denteAdminSecretRequestHeaders() });
				if (res.ok && !isCancelled) {
					const data = await res.json();
					if (Array.isArray(data)) {
						setSearchResults(data.map((p: Record<string, unknown>) => ({
							id: String(p.id ?? ""), fullName: String(p.fullName ?? p.name ?? "Пациент"), phone: String(p.phone ?? ""),
							birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined, cardNumber: typeof p.cardNumber === "string" ? p.cardNumber : undefined,
						})));
						return;
					}
				}
				if (isDemoShowcaseMode() && !isCancelled) setSearchResults(DEMO_COCKPIT_PATIENTS.filter((p) => p.fullName.toLowerCase().includes(query.toLowerCase())));
			} catch {
				if (isDemoShowcaseMode() && !isCancelled) setSearchResults(DEMO_COCKPIT_PATIENTS);
			} finally { if (!isCancelled) setIsSearching(false); }
		}, 200);
		return () => { isCancelled = true; clearTimeout(timer); };
	}, [searchQuery]);
	const handleSelectPatient = useCallback((patient: ScannerPatientSummary) => {
		setSelectedPatient(patient);
		setSearchQuery("");
		void loadPatientAttachments(patient.id);
	}, [loadPatientAttachments]);
	const applyOcrToNewPatientForm = useCallback(() => {
		setNewPatientForm((prev) => ({
			...prev,
			passportSeries: extractedPassport?.series || prev.passportSeries, passportNumber: extractedPassport?.number || prev.passportNumber,
			passportIssuerCode: extractedPassport?.issuerCode || prev.passportIssuerCode, birthDate: extractedPassport?.birthDate || prev.birthDate,
			snils: extractedSnils?.formatted || extractedSnils?.raw || prev.snils, omsPolicy: extractedOms?.policyNumber || prev.omsPolicy,
		}));
		showToast("Распознанные реквизиты перенесены в форму регистрации пациента.", "success");
	}, [extractedOms, extractedPassport, extractedSnils]);
	const handleSaveAttachmentToPatient = useCallback(async () => {
		if (isUploading || !capturedBlob || !selectedPatient) return;
		setIsUploading(true);
		try {
			await uploadPatientAttachment(selectedPatient.id, capturedBlob, presetTitle);
			showToast(`Документ прикреплен к медкарте пациента ${selectedPatient.fullName}.`, "success", 6000);
			void loadPatientAttachments(selectedPatient.id);
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось сохранить скан", "error");
		} finally { setIsUploading(false); }
	}, [capturedBlob, isUploading, loadPatientAttachments, presetTitle, selectedPatient]);
	const handleCreatePatientAndAttach = useCallback(async () => {
		if (isUploading) return;
		const fullName = newPatientForm.fullName.trim();
		if (!fullName) { showToast("Введите ФИО нового пациента для заведения медкарты", "info"); return; }
		setIsUploading(true);
		try {
			const createRes = await fetch("/api/patients", {
				method: "POST", headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ fullName, phone: newPatientForm.phone.trim() || undefined, birthDate: newPatientForm.birthDate.trim() || undefined }),
			});
			const createdData = createRes.ok ? await createRes.json() : null;
			const createdId = createdData?.id ? String(createdData.id) : (isDemoShowcaseMode() ? `pat-demo-${Date.now()}` : null);
			if (createdId && capturedBlob) await uploadPatientAttachment(createdId, capturedBlob, presetTitle);
			showToast(`Карта пациента «${fullName}» создана, скан прикреплен.`, "success", 7000);
			if (createdId) { setSelectedPatient({ id: createdId, fullName }); setIntakeMode("existing"); void loadPatientAttachments(createdId); }
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Не удалось создать карту пациента", "error");
		} finally { setIsUploading(false); }
	}, [capturedBlob, isUploading, loadPatientAttachments, newPatientForm, presetTitle]);

	return {
		intakeMode, setIntakeMode, searchQuery, setSearchQuery, searchResults, isSearching, selectedPatient, setSelectedPatient,
		handleSelectPatient, recentAttachments, isLoadingAttachments, newPatientForm, setNewPatientForm, applyOcrToNewPatientForm,
		handleSaveAttachmentToPatient, handleCreatePatientAndAttach, isUploading,
	};
}
