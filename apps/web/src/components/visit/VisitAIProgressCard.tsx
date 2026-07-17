import React from "react";

export function VisitAIProgressCard({ visitFlowResult }: { visitFlowResult: any }) {
	if (!visitFlowResult) return null;

	const getStatusColor = (status: string) => {
		switch (status) {
			case "success": return "var(--teal)";
			case "running": return "var(--azure)";
			case "error": return "var(--tomato)";
			case "skipped": return "var(--amber)";
			default: return "var(--muted)";
		}
	};

	const renderStatusIndicator = (label: string, statusObj: any) => (
		<div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--ink)" }}>
			<span style={{
				width: 8, height: 8, borderRadius: "50%",
				background: getStatusColor(statusObj?.status),
				boxShadow: statusObj?.status === "running" ? "0 0 8px var(--azure)" : "none"
			}} />
			{label}: <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{statusObj?.status || "waiting"}</span>
			{statusObj?.message && <span style={{ color: "var(--muted)", marginLeft: 4 }}>({statusObj.message})</span>}
		</div>
	);

	return (
		<div className="visit-ai-progress-card" style={{
			background: "var(--paper-soft)",
			border: "1px solid var(--line)",
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
			display: "flex",
			flexDirection: "column",
			gap: 12,
			animation: "fade-in 0.3s ease-out"
		}}>
			<h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
				<SparklesIcon /> Прогресс ИИ-ассистента
			</h4>
			
			<div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
				{renderStatusIndicator("1. Распознавание", visitFlowResult.draft)}
				{renderStatusIndicator("2. План лечения", visitFlowResult.plan)}
				{renderStatusIndicator("3. Рекомендации", visitFlowResult.recommendations)}
				{renderStatusIndicator("4. Документы", visitFlowResult.documents)}
			</div>

			{visitFlowResult.plan?.data?.patientFriendlyExplanation && (
				<div style={{ marginTop: 8, padding: 12, background: "var(--paper)", borderRadius: 8, border: "1px solid var(--line)" }}>
					<strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>Объяснение для пациента:</strong>
					<span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{visitFlowResult.plan.data.patientFriendlyExplanation}</span>
				</div>
			)}
			{visitFlowResult.recommendations?.data?.telegramSummary && (
				<div style={{ marginTop: 8, padding: 12, background: "var(--paper)", borderRadius: 8, border: "1px solid var(--line)" }}>
					<strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>Памятка в Telegram:</strong>
					<span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{visitFlowResult.recommendations.data.telegramSummary}</span>
				</div>
			)}
			{visitFlowResult.documents?.data?.suggestions?.length > 0 && (
				<div style={{ marginTop: 8, padding: 12, background: "var(--paper)", borderRadius: 8, border: "1px solid var(--line)" }}>
					<strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>Необходимые документы:</strong>
					<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
						{visitFlowResult.documents.data.suggestions.map((s: string, i: number) => (
							<span key={i} style={{ background: "var(--azure-light, rgba(59, 130, 246, 0.1))", color: "var(--azure)", padding: "4px 12px", borderRadius: 100, fontSize: 13, fontWeight: 500 }}>
								{s}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function SparklesIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
			<path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
		</svg>
	);
}
