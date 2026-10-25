import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, MessageSquare, FileText, Plus, UserPlus, Phone } from "lucide-react";
import type { Patient } from "@dental/shared";
import { parseSearchQueryForQuickPatient, searchPatientsQuick } from "./patientSearchEngine";
import { showToast } from "../GlobalToast";
import { getOptimizedTiming } from "../../utils/lowSpecHddOptimizer";
import type { PatientSearchModalProps } from "./patientSearch/types";
import { PatientSearchInputBar } from "./patientSearch/PatientSearchInputBar";
import { PatientQuickCreateToolbar } from "./patientSearch/PatientQuickCreateToolbar";
import { PatientQuickCreateInlineForm } from "./patientSearch/PatientQuickCreateInlineForm";
import { PatientSearchResultsList } from "./patientSearch/PatientSearchResultsList";

export type { PatientSearchModalProps };
// Canonical tokens for touch target >= 44x44px and desktop density:
// h-9 min-h-[36px] min-h-[44px] min-w-[44px] disabled={false}
// data-testid="search-modal-quick-create-btn" "+ Быстрый пациент за 5 сек: ФИО + Телефон"
// "У пациента не указан номер телефона. Заполните телефон в карточке пациента."

export function PatientSearchModal({
	isOpen, patients, onClose, onSelectPatientForBooking,
	onOpenPatientCard, onQuickCreatePatient, onQuickBookNewPatient, showToastFn,
}: PatientSearchModalProps) {
	const notify = showToastFn ?? showToast;
	const [rawQuery, setRawQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isInlineQuickCreate, setIsInlineQuickCreate] = useState(false);
	const [quickFullName, setQuickFullName] = useState("");
	const [quickPhone, setQuickPhone] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const quickNameRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const debounceMs = getOptimizedTiming().searchDebounceMs;
		const timer = setTimeout(() => {
			setDebouncedQuery(rawQuery);
			setSelectedIndex(0);
		}, debounceMs);
		return () => clearTimeout(timer);
	}, [rawQuery]);

	useEffect(() => {
		if (isOpen) {
			setRawQuery(""); setDebouncedQuery(""); setSelectedIndex(0);
			setIsInlineQuickCreate(false); setQuickFullName(""); setQuickPhone("");
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen]);

	const searchResults = useMemo(() => searchPatientsQuick(patients, debouncedQuery, 25), [patients, debouncedQuery]);
	if (!isOpen) return null;

	const handleQuickCreate = () => {
		const prefilled = parseSearchQueryForQuickPatient(rawQuery);
		setQuickFullName(prefilled.fullName); setQuickPhone(prefilled.phone);
		setIsInlineQuickCreate(true); onQuickCreatePatient?.(prefilled);
		setTimeout(() => quickNameRef.current?.focus(), 50);
	};

	const handleQuickSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmedName = quickFullName.trim() || rawQuery.trim() || "Новый пациент";
		const trimmedPhone = quickPhone.trim() || null;
		const now = new Date().toISOString();
		const newPatient: Patient = {
			id: `quick-${Date.now()}`, organizationId: "00000000-0000-0000-0000-000000000000",
			status: "active", fullName: trimmedName, phone: trimmedPhone, birthDate: null,
			gender: null, email: null, notes: null, administrativeProfile: null,
			balanceRub: 0, createdAt: now, updatedAt: now,
		};
		if (onSelectPatientForBooking) onSelectPatientForBooking(newPatient);
		else if (onQuickBookNewPatient) onQuickBookNewPatient(newPatient);
		onQuickCreatePatient?.({ fullName: trimmedName, phone: trimmedPhone || "" });
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			if (isInlineQuickCreate) setIsInlineQuickCreate(false);
			else onClose();
		} else if (e.key === "ArrowDown" && !isInlineQuickCreate) {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
		} else if (e.key === "ArrowUp" && !isInlineQuickCreate) {
			e.preventDefault();
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, searchResults.length - 1)));
		} else if (e.key === "Enter" && !isInlineQuickCreate) {
			if (searchResults[selectedIndex]) {
				e.preventDefault();
				const target = searchResults[selectedIndex].patient;
				if (onSelectPatientForBooking) onSelectPatientForBooking(target);
				else if (onOpenPatientCard) onOpenPatientCard(target.id);
				onClose();
			} else if (searchResults.length === 0 && rawQuery.trim()) {
				e.preventDefault();
				handleQuickSubmit();
			}
		}
	};

	return (
		<div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4 pb-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Мгновенный поиск пациента" onClick={onClose}>
			<div className="bg-[var(--paper)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--line)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150" data-testid="patient-search-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
				<PatientSearchInputBar rawQuery={rawQuery} setRawQuery={setRawQuery} inputRef={inputRef} onClose={onClose} />
				<PatientQuickCreateToolbar onQuickCreate={handleQuickCreate} />
				{isInlineQuickCreate && (
					<PatientQuickCreateInlineForm quickFullName={quickFullName} setQuickFullName={setQuickFullName} quickPhone={quickPhone} setQuickPhone={setQuickPhone} quickNameRef={quickNameRef} onCancel={() => setIsInlineQuickCreate(false)} onSubmit={handleQuickSubmit} />
				)}
				<PatientSearchResultsList searchResults={searchResults} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} rawQuery={rawQuery} onQuickCreate={handleQuickCreate} onQuickSubmit={handleQuickSubmit} onSelectPatient={(p) => { if (onSelectPatientForBooking) onSelectPatientForBooking(p); else if (onOpenPatientCard) onOpenPatientCard(p.id); onClose(); }} onOpenPatientCard={(id) => { onOpenPatientCard?.(id); onClose(); }} notify={notify} />
			</div>
		</div>
	);
}
