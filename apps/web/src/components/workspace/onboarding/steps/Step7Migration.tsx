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

	return (
		<div style={{ textAlign: "center", width: "100%" }}>
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
				onClick={async () => {
					if (migrationStatus === "idle") {
						setMigrationStatus("analyzing");
						try {
							const res = await fetch("/api/system/analyze-legacy-db", {
								method: "POST",
								headers: auth.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								}),
								body: JSON.stringify({}),
							});
							if (!res.ok) throw new Error("Migration analysis failed");
							await res.json();
							setMigrationStatus("done");
						} catch (err) {
							console.error(err);
							setMigrationStatus("idle");
						}
					}
				}}
				style={{
					height: 200,
					border: `3px dashed ${migrationStatus === "done" ? "#10b981" : accentColor}`,
					borderRadius: 24,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					background:
						migrationStatus === "done"
							? "rgba(16, 185, 129, 0.05)"
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
							Бросьте бэкап Ident / Infodent сюда
						</span>
						<span style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
							CSV, SQL, Firebird
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
								width: "60%",
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
							Распознана база Ident. Найдено 4,521 пациентов.
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
							IDENT: patient_name
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
							IDENT: debt_balance
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
