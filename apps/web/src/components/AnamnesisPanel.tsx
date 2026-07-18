import {
	AlertTriangle,
	Baby,
	HeartPulse,
	Pill,
	Plus,
	Save,
	ShieldAlert,
	Stethoscope,
	Syringe,
	X,
} from "lucide-react";
import React, { useEffect } from "react";
import { usePatientStore } from "../store/patientStore";
import { AnamnesisAlertBanner } from "./patients/AnamnesisAlertBanner";
import { AnamnesisTagsEditor } from "./patients/AnamnesisTagsEditor";
import { AnamnesisPregnancyEditor } from "./patients/AnamnesisPregnancyEditor";

const QUICK_ALLERGIES = [
	"Лидокаин",
	"Артикаин",
	"Пенициллин",
	"Ибупрофен",
	"Латекс",
	"Йод",
	"Амоксициллин",
];
const QUICK_DISEASES = [
	"Сахарный диабет",
	"Гипертония",
	"Бронхиальная астма",
	"Гепатит B/C",
	"ВИЧ",
	"Эпилепсия",
];
const QUICK_MEDICATIONS = [
	"Варфарин (Антикоагулянт)",
	"Ксарелто (Антикоагулянт)",
	"Инсулин",
	"Бифосфонаты",
];

export function AnamnesisPanel({ patientId }: { patientId: string }) {
	const {
		anamnesisDraft,
		setAnamnesisDraft,
		anamnesisSaveState,
		loadAnamnesis,
		saveAnamnesis,
	} = usePatientStore();

	// Tag inputs moved to AnamnesisTagsEditor

	useEffect(() => {
		void loadAnamnesis(patientId);
	}, [patientId, loadAnamnesis]);

	const draft = anamnesisDraft as any;
	const allergies: string[] = draft.allergies || [];
	const systemicDiseases: string[] = draft.systemicDiseases || [];
	const medications: string[] = draft.medications || [];
	const hasCriticalAlerts: boolean = draft.hasCriticalAlerts || false;
	const criticalAlertNote: string = draft.criticalAlertNote || "";
	const pregnancyStatus: string = draft.pregnancyStatus || "none";

	const isSaving = anamnesisSaveState === "saving";

	const addTag = (
		field: "allergies" | "systemicDiseases" | "medications",
		val: string,
	) => {
		const trimmed = val.trim();
		if (!trimmed) return;
		setAnamnesisDraft((prev: any) => {
			const arr = prev[field] || [];
			if (arr.includes(trimmed)) return prev;
			return { ...prev, [field]: [...arr, trimmed] };
		});
	};

	const removeTag = (
		field: "allergies" | "systemicDiseases" | "medications",
		val: string,
	) => {
		setAnamnesisDraft((prev: any) => ({
			...prev,
			[field]: (prev[field] || []).filter((item: string) => item !== val),
		}));
	};

	const handleSave = () => saveAnamnesis(patientId);

	return (
		<section
			className="dashboard-card animate-fade-in"
			style={{
				padding: "24px",
				display: "flex",
				flexDirection: "column",
				gap: "24px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h3
					style={{
						margin: 0,
						fontSize: "1.2rem",
						fontWeight: 600,
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Stethoscope size={20} color="var(--primary)" /> Медицинская карта /
					Анамнез
				</h3>
			</div>

			{/* Critical Alert Banner */}
			<AnamnesisAlertBanner
				hasCriticalAlerts={hasCriticalAlerts}
				criticalAlertNote={criticalAlertNote}
				setHasCriticalAlerts={(val) =>
					setAnamnesisDraft((prev: any) => ({ ...prev, hasCriticalAlerts: val }))
				}
				setCriticalAlertNote={(val) =>
					setAnamnesisDraft((prev: any) => ({ ...prev, criticalAlertNote: val }))
				}
			/>

			{/* Allergies */}
			<AnamnesisTagsEditor
				title="Аллергические реакции"
				icon={<Syringe size={16} color="var(--rose-500)" />}
				quickTags={QUICK_ALLERGIES}
				tags={allergies}
				colorTheme="rose"
				onAddTag={(val) => addTag("allergies", val)}
				onRemoveTag={(val) => removeTag("allergies", val)}
				placeholder="Добавить аллергию вручную..."
			/>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Systemic Diseases */}
			<AnamnesisTagsEditor
				title="Системные заболевания"
				icon={<HeartPulse size={16} color="var(--blue-500)" />}
				quickTags={QUICK_DISEASES}
				tags={systemicDiseases}
				colorTheme="blue"
				onAddTag={(val) => addTag("systemicDiseases", val)}
				onRemoveTag={(val) => removeTag("systemicDiseases", val)}
				placeholder="Добавить заболевание вручную..."
			/>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Medications */}
			<AnamnesisTagsEditor
				title="Принимаемые препараты"
				icon={<Pill size={16} color="var(--indigo-500)" />}
				quickTags={QUICK_MEDICATIONS}
				tags={medications}
				colorTheme="indigo"
				onAddTag={(val) => addTag("medications", val)}
				onRemoveTag={(val) => removeTag("medications", val)}
				placeholder="Добавить препарат вручную..."
			/>

			<hr style={{ borderTop: "1px solid var(--slate-200)", margin: 0 }} />

			{/* Pregnancy Status */}
			<AnamnesisPregnancyEditor
				pregnancyStatus={pregnancyStatus}
				setPregnancyStatus={(val) =>
					setAnamnesisDraft((prev: any) => ({ ...prev, pregnancyStatus: val }))
				}
			/>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "12px",
					marginTop: "16px",
					paddingTop: "16px",
					borderTop: "1px solid var(--slate-100)",
				}}
			>
				<button
					type="button"
					className="primary-button"
					onClick={handleSave}
					disabled={isSaving}
					style={{ flex: 1, justifyContent: "center", padding: "12px" }}
				>
					<Save size={18} />
					{isSaving ? "Сохранение..." : "Сохранить Анамнез"}
				</button>
				{anamnesisSaveState === "saved" && (
					<span style={{ color: "var(--emerald-600)", fontWeight: 500 }}>
						Успешно сохранено
					</span>
				)}
				{anamnesisSaveState === "error" && (
					<span style={{ color: "var(--red-600)", fontWeight: 500 }}>
						<AlertTriangle
							size={16}
							style={{ display: "inline", marginBottom: "-3px" }}
						/>{" "}
						Ошибка
					</span>
				)}
			</div>
		</section>
	);
}
