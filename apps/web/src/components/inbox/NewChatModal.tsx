import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function NewChatModal({
	onClose,
	onSelect,
	authHeaders,
}: {
	onClose: () => void;
	onSelect: (patientId: string, patientName: string, channel: string) => void;
	authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ id: string; fullName: string; phone: string }[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<{ id: string; fullName: string } | null>(null);
	const [channel, setChannel] = useState<string>("whatsapp");
	const [searching, setSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (query.trim().length < 2) {
			setResults([]);
			return;
		}
		const t = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await fetch(
					`/api/communications/patients/search?q=${encodeURIComponent(query.trim())}`,
					{ headers: authHeaders() },
				);
				if (res.ok) setResults(await res.json());
			} finally {
				setSearching(false);
			}
		}, 300);
		return () => clearTimeout(t);
	}, [query, authHeaders]);

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.4)",
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				style={{
					width: 460,
					background: "var(--paper)",
					borderRadius: 16,
					boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "20px 24px 16px",
						borderBottom: "1px solid var(--line)",
					}}
				>
					<h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
						Новый диалог
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
					>
						<X size={20} />
					</button>
				</div>

				<div style={{ padding: "16px 24px" }}>
					{!selectedPatient ? (
						<>
							<div style={{ position: "relative", marginBottom: 12 }}>
								<Search
									size={16}
									color="var(--muted)"
									style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
								/>
								<input
									ref={inputRef}
									type="text"
									placeholder="Найти пациента по имени или телефону..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									style={{
										width: "100%",
										padding: "10px 12px 10px 36px",
										borderRadius: 8,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										color: "var(--ink)",
										outline: "none",
										fontSize: 14,
										boxSizing: "border-box",
									}}
								/>
							</div>
							{searching && (
								<div style={{ textAlign: "center", padding: 12, color: "var(--muted)", fontSize: 13 }}>
									Поиск...
								</div>
							)}
							{results.map((p) => (
								<div
									key={p.id}
									onClick={() => setSelectedPatient({ id: p.id, fullName: p.fullName })}
									style={{
										padding: "10px 12px",
										borderRadius: 8,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: 12,
										transition: "background 0.15s",
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.background = "var(--paper-soft)")
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.background = "transparent")
									}
								>
									<div
										style={{
											width: 36,
											height: 36,
											borderRadius: "50%",
											background: "var(--teal)",
											color: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: 700,
											fontSize: 15,
											flexShrink: 0,
										}}
									>
										{p.fullName.charAt(0).toUpperCase()}
									</div>
									<div>
										<div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
											{p.fullName}
										</div>
										<div style={{ fontSize: 12, color: "var(--muted)" }}>{p.phone}</div>
									</div>
								</div>
							))}
							{query.trim().length >= 2 && !searching && results.length === 0 && (
								<div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
									Пациенты не найдены
								</div>
							)}
						</>
					) : (
						<>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 12,
									padding: "12px",
									background: "var(--paper-soft)",
									borderRadius: 8,
									marginBottom: 20,
								}}
							>
								<div
									style={{
										width: 40,
										height: 40,
										borderRadius: "50%",
										background: "var(--teal)",
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontWeight: 700,
										fontSize: 16,
									}}
								>
									{selectedPatient.fullName.charAt(0).toUpperCase()}
								</div>
								<div style={{ flex: 1 }}>
									<div style={{ fontWeight: 600, color: "var(--ink)" }}>
										{selectedPatient.fullName}
									</div>
								</div>
								<button
									type="button"
									onClick={() => setSelectedPatient(null)}
									style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								>
									<X size={16} />
								</button>
							</div>

							<label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
								Канал связи
							</label>
							<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
								{[
									{ value: "whatsapp", label: "WhatsApp", color: "#25D366" },
									{ value: "telegram", label: "Telegram", color: "#0088cc" },
									{ value: "vk", label: "VK", color: "#0077FF" },
									{ value: "sms", label: "SMS", color: "var(--muted)" },
								].map((c) => (
									<button
										key={c.value}
										type="button"
										onClick={() => setChannel(c.value)}
										style={{
											flex: 1,
											padding: "8px 12px",
											borderRadius: 8,
											border: `1px solid ${channel === c.value ? c.color : "var(--line)"}`,
											background: channel === c.value ? `${c.color}15` : "transparent",
											color: channel === c.value ? c.color : "var(--muted)",
											cursor: "pointer",
											fontWeight: channel === c.value ? 600 : 400,
											fontSize: 13,
											transition: "all 0.15s",
										}}
									>
										{c.label}
									</button>
								))}
							</div>

							<button
								type="button"
								onClick={() =>
									onSelect(selectedPatient.id, selectedPatient.fullName, channel)
								}
								style={{
									width: "100%",
									padding: "12px",
									borderRadius: 10,
									background: "var(--teal)",
									color: "#fff",
									border: "none",
									cursor: "pointer",
									fontWeight: 600,
									fontSize: 15,
								}}
							>
								Открыть диалог
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
