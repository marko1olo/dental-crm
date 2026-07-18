import React, { useState, useRef, useEffect } from "react";
import type { Patient } from "@dental/shared";

interface PatientSelectorProps {
	patients: Patient[];
	value: string; // patientId
	onChange: (patientId: string) => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({ patients, value, onChange }) => {
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
				</div>
			)}
		</div>
	);
};
