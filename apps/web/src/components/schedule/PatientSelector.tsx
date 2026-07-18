import React, { useState, useRef, useEffect } from "react";
import type { Patient } from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

interface PatientSelectorProps {
	patients: Patient[];
	value: string; // patientId
	onChange: (patientId: string) => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({ patients, value, onChange }) => {
	const { auth, loadDashboard } = useAppLogicContext();
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const selectedPatient = patients.find((p) => p.id === value);

	// Update query when value changes externally
	useEffect(() => {
		if (selectedPatient) {
			setQuery(selectedPatient.fullName);
		} else {
			setQuery("");
		}
	}, [selectedPatient]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setIsOpen(false);
				if (selectedPatient) {
					setQuery(selectedPatient.fullName);
				} else {
					setQuery("");
				}
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [selectedPatient]);

	const filteredPatients = patients
		.filter((p) => p.status === "active")
		.filter((p) => {
			const search = query.toLowerCase();
			return p.fullName.toLowerCase().includes(search) || (p.phone && p.phone.includes(search));
		})
		.slice(0, 10); // limit to 10 for performance

	return (
		<div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
			<input
				type="text"
				className="appointment-editor-select"
				style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line, #e2e8f0)", borderRadius: "6px" }}
				placeholder="Поиск по ФИО или телефону..."
				value={isOpen ? query : (selectedPatient?.fullName || "")}
				onChange={(e) => {
					setQuery(e.target.value);
					if (!isOpen) setIsOpen(true);
					if (e.target.value === "") onChange("");
				}}
				onFocus={() => setIsOpen(true)}
			/>
			{isOpen && query.length > 0 && (
				<div
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						width: "100%",
						maxHeight: "200px",
						overflowY: "auto",
						background: "var(--paper, #ffffff)",
						border: "1px solid var(--line, #e2e8f0)",
						borderRadius: "6px",
						boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
						zIndex: 100,
						marginTop: "4px"
					}}
				>
					{filteredPatients.length === 0 ? (
						<div style={{ padding: "8px 12px", color: "var(--muted)" }}>Не найдено</div>
					) : (
						filteredPatients.map((p) => (
							<div
								key={p.id}
								style={{
									padding: "8px 12px",
									cursor: "pointer",
									borderBottom: "1px solid var(--line-light, #f1f5f9)",
									display: "flex",
									justifyContent: "space-between"
								}}
								onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--paper-soft, #f8fafc)")}
								onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
								onClick={() => {
									onChange(p.id);
									setQuery(p.fullName);
									setIsOpen(false);
								}}
							>
								<span>{p.fullName}</span>
								{p.phone && <span style={{ color: "var(--muted)", fontSize: "0.85em" }}>{p.phone}</span>}
							</div>
						))
					)}
					{filteredPatients.length === 0 && query.length > 2 && (
						<div style={{ padding: "8px 12px", borderTop: "1px solid var(--line-light, #f1f5f9)", backgroundColor: "var(--paper-soft)" }}>
							<p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--muted)" }}>Пациент не найден.</p>
							<div style={{ display: "flex", gap: "8px" }}>
								<input 
									type="tel" 
									placeholder="+7 (___) ___-__-__" 
									className="appointment-editor-select"
									style={{ flex: 1, padding: "4px 8px", fontSize: "13px", border: "1px solid var(--line)", borderRadius: "4px" }}
									id="fast-patient-phone"
									onChange={(e) => {
										// Auto-format phone to +7 (999) 000-00-00
										let val = e.target.value.replace(/\D/g, "");
										if (val.startsWith("7") || val.startsWith("8")) val = val.slice(1);
										let formatted = "+7";
										if (val.length > 0) formatted += ` (${val.substring(0, 3)}`;
										if (val.length >= 4) formatted += `) ${val.substring(3, 6)}`;
										if (val.length >= 7) formatted += `-${val.substring(6, 8)}`;
										if (val.length >= 9) formatted += `-${val.substring(8, 10)}`;
										if (val.length > 0) e.target.value = formatted;
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											document.getElementById("fast-patient-create-btn")?.click();
										}
									}}
								/>
								<button
									id="fast-patient-create-btn"
									type="button"
									className="primary-button"
									style={{ padding: "4px 12px", fontSize: "13px", minHeight: "unset", whiteSpace: "nowrap" }}
									onClick={async (e) => {
										e.preventDefault();
										const phoneInput = document.getElementById("fast-patient-phone") as HTMLInputElement;
										const phoneVal = phoneInput?.value || "";
										const nameVal = query.trim();
										
										// Check duplicates
										const duplicate = patients.find(p => 
											p.fullName.toLowerCase() === nameVal.toLowerCase() || 
											(phoneVal && p.phone && p.phone === phoneVal)
										);
										if (duplicate) {
											if (window.confirm(`Найден похожий пациент: ${duplicate.fullName} ${duplicate.phone || ""}. Выбрать его?`)) {
												onChange(duplicate.id);
												setQuery(duplicate.fullName);
												setIsOpen(false);
												return;
											}
										}
										
										try {
											const res = await fetch("/api/patients", {
												method: "POST",
												headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
												body: JSON.stringify({ fullName: nameVal, phone: phoneVal || null })
											});
											if (res.ok) {
												const newPatient = await res.json();
												onChange(newPatient.id);
												setQuery(newPatient.fullName);
												setIsOpen(false);
												void loadDashboard();
											} else {
												showToast("Не удалось создать пациента, попробуйте ещё раз", "error");
											}
										} catch (err) {
											showToast("Нет связи с сервером", "error");
										}
									}}
								>
									+ Создать
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
