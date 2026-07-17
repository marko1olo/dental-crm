import React from "react";
import { BrainCircuit, Check, ChevronRight, DownloadCloud, Loader2 } from "lucide-react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function Step7Migration({
	migrationStatus,
	setMigrationStatus,
	accentColor,
	isDark,
}: any) {
	const { auth } = useAppLogicContext();
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [detectedSummary, setDetectedSummary] = React.useState<any>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	const handleUpload = async (file: File) => {
		if (migrationStatus === "done" || migrationStatus === "analyzing") return;
		setMigrationStatus("analyzing");
		try {
			const base64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const result = reader.result as string;
					resolve(result.split(",")[1] || "");
				};
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});

			const res = await fetch("/api/system/analyze-legacy-db", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					fileName: file.name,
					fileBase64: base64,
				}),
			});
			if (!res.ok) throw new Error("Migration analysis failed");
			const data = await res.json();
			setDetectedSummary({
				detectedKind: data.detectedKind || "Ident",
				patientsFound: data.summary?.patientsFound || 0,
				visitsFound: data.summary?.visitsFound || 0,
				pricelistItems: data.summary?.pricelistItems || 0,
			});
			setMigrationStatus("done");
		} catch (err) {
			console.error(err);
			setMigrationStatus("idle");
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			await handleUpload(file);
		}
	};

	return (
		<div style={{ textAlign: "center", width: "100%" }}>
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: "none" }}
				onChange={async (e) => {
					const file = e.target.files?.[0];
					if (file) {
						await handleUpload(file);
					}
				}}
			/>
			<div style={{ textAlign: "center", marginBottom: 24 }}>
				<p
					style={{
						margin: 0,
						fontSize: 18,
						color: accentColor,
						fontWeight: 700,
					}}
				>
					БЕСШОВНАЯ МИГРАЦИЯ БАЗЫ
				</p>
				<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
					Перенесите пациентов, приемы и прайс-листы из вашей старой системы в 1
					клик.
				</p>
			</div>

			<div
				onClick={() => {
					if (migrationStatus === "idle") {
						fileInputRef.current?.click();
					}
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				style={{
					height: 200,
					border: `3px dashed ${migrationStatus === "done" ? "#10b981" : isDragging ? "var(--teal)" : accentColor}`,
					borderRadius: 24,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					cursor: migrationStatus === "idle" ? "pointer" : "default",
					background:
						migrationStatus === "done"
							? "rgba(16, 185, 129, 0.05)"
							: isDragging
								? "rgba(0, 128, 128, 0.1)"
								: isDark
									? "rgba(255,255,255,0.02)"
									: "rgba(0,0,0,0.02)",
					transition: "all 0.3s",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{migrationStatus === "idle" && (
					<>
						<DownloadCloud size={64} color={accentColor} />
						<span
							style={{
								marginTop: 16,
								fontSize: 18,
								fontWeight: 600,
								padding: "0 16px",
							}}
						>
							Перетащите бэкап Ident / Infodent сюда или кликните
						</span>
						<span style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
							CSV, SQL, Firebird, 1C
						</span>
					</>
				)}

				{migrationStatus === "analyzing" && (
					<>
						<div
							style={{
								position: "absolute",
								bottom: 0,
								left: 0,
								height: "100%",
								width: "100%",
								background: `${accentColor}22`,
								transition: "width 3s linear",
							}}
						/>
						<Loader2
							className="lucide-spin"
							size={64}
							color={accentColor}
							style={{ zIndex: 1 }}
						/>
						<span
							style={{
								marginTop: 16,
								fontSize: 16,
								fontWeight: 600,
								zIndex: 1,
								padding: "0 16px",
							}}
						>
							Анализ схемы БД... Извлечение пациентов...
						</span>
					</>
				)}

				{migrationStatus === "done" && (
					<>
						<Check size={64} color="#10b981" />
						<span
							style={{
								marginTop: 16,
								fontSize: 18,
								fontWeight: 600,
								color: "#10b981",
								padding: "0 16px",
							}}
						>
							Распознана база {detectedSummary?.detectedKind || "Ident"}. Найдено {detectedSummary?.patientsFound || 0} пациентов.
						</span>
					</>
				)}
			</div>

			{migrationStatus === "done" && (
				<div
					style={{
						marginTop: 24,
						padding: 16,
						borderRadius: 16,
						background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
						border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
						textAlign: "left",
					}}
				>
					<div
						style={{
							fontWeight: 600,
							marginBottom: 12,
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<BrainCircuit size={18} color={accentColor} /> AI Маппинг полей
						(Preview)
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr auto 1fr",
							gap: 12,
							fontSize: 13,
							alignItems: "center",
						}}
					>
						<div
							style={{
								padding: "8px 4px",
								background: "rgba(0,0,0,0.2)",
								borderRadius: 6,
								color: "#aaa",
								textAlign: "center",
							}}
						>
							{(detectedSummary?.detectedKind || "IDENT").toUpperCase()}: patient_name
						</div>
						<ChevronRight size={16} color="#888" />
						<div
							style={{
								padding: "8px 4px",
								background: `${accentColor}22`,
								borderRadius: 6,
								color: accentColor,
								textAlign: "center",
							}}
						>
							DENTE: fullName
						</div>

						<div
							style={{
								padding: "8px 4px",
								background: "rgba(0,0,0,0.2)",
								borderRadius: 6,
								color: "#aaa",
								textAlign: "center",
							}}
						>
							{(detectedSummary?.detectedKind || "IDENT").toUpperCase()}: debt_balance
						</div>
						<ChevronRight size={16} color="#888" />
						<div
							style={{
								padding: "8px 4px",
								background: `${accentColor}22`,
								borderRadius: 6,
								color: accentColor,
								textAlign: "center",
							}}
						>
							DENTE: financialBalance
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
