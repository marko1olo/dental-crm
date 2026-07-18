import React from "react";
import { MessageSquarePlus, Search, CheckCheck } from "lucide-react";
import type { ChatSummary } from "./InboxTypes";
import { getChannelColor, getChannelLetter, formatTime } from "./InboxUtils";

export function InboxSidebar({
	totalUnread,
	setShowNewChat,
	searchQuery,
	setSearchQuery,
	activeChannelFilter,
	setActiveChannelFilter,
	filteredChats,
	selectedPatientId,
	setSelectedPatientId,
}: {
	totalUnread: number;
	setShowNewChat: (v: boolean) => void;
	searchQuery: string;
	setSearchQuery: (v: string) => void;
	activeChannelFilter: string;
	setActiveChannelFilter: (v: string) => void;
	filteredChats: ChatSummary[];
	selectedPatientId: string | null;
	setSelectedPatientId: (id: string | null) => void;
}) {
	return (
		<div
			style={{
				width: 340,
				background: "var(--paper)",
				display: "flex",
				flexDirection: "column",
				borderRight: "1px solid var(--line)",
				zIndex: 10,
			}}
		>
			<div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 12,
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: 17,
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						Мессенджеры
						{totalUnread > 0 && (
							<span
								style={{
									background: "var(--teal)",
									color: "#fff",
									borderRadius: 10,
									fontSize: 11,
									fontWeight: 700,
									padding: "1px 7px",
									minWidth: 18,
									textAlign: "center",
								}}
							>
								{totalUnread > 99 ? "99+" : totalUnread}
							</span>
						)}
					</h2>
					<button
						type="button"
						title="Новый диалог"
						onClick={() => setShowNewChat(true)}
						style={{
							background: "var(--teal)",
							border: "none",
							color: "#fff",
							width: 34,
							height: 34,
							borderRadius: 8,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
							flexShrink: 0,
						}}
					>
						<MessageSquarePlus size={18} />
					</button>
				</div>

				<div style={{ position: "relative", marginBottom: 10 }}>
					<Search
						size={15}
						color="var(--muted)"
						style={{
							position: "absolute",
							left: 10,
							top: "50%",
							transform: "translateY(-50%)",
						}}
					/>
					<input
						type="text"
						placeholder="Поиск диалогов..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						style={{
							width: "100%",
							padding: "9px 10px 9px 32px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							outline: "none",
							fontSize: 13,
							boxSizing: "border-box",
						}}
					/>
				</div>

				<div style={{ display: "flex", gap: 6 }}>
					{[
						{ value: "all", label: "Все" },
						{ value: "whatsapp", label: "WA", color: "#25D366" },
						{ value: "telegram", label: "TG", color: "#0088cc" },
						{ value: "vk", label: "VK", color: "#0077FF" },
						{ value: "sms", label: "SMS", color: "var(--muted)" },
					].map((f) => (
						<button
							key={f.value}
							type="button"
							onClick={() => setActiveChannelFilter(f.value)}
							style={{
								flex: 1,
								padding: "5px 4px",
								fontSize: 12,
								borderRadius: 6,
								border: "1px solid var(--line)",
								background:
									activeChannelFilter === f.value
										? (f.color ?? "var(--teal)")
										: "transparent",
								color: activeChannelFilter === f.value ? "#fff" : "var(--muted)",
								cursor: "pointer",
								fontWeight: activeChannelFilter === f.value ? 600 : 400,
								transition: "all 0.15s",
							}}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			<div style={{ flex: 1, overflowY: "auto" }}>
				{filteredChats.length === 0 ? (
					<div
						style={{
							padding: 32,
							textAlign: "center",
							color: "var(--muted)",
							fontSize: 13,
						}}
					>
						Диалогов не найдено
					</div>
				) : (
					filteredChats.map((chat) => (
						<div
							key={chat.patientId}
							onClick={() => setSelectedPatientId(chat.patientId)}
							style={{
								padding: "12px 16px",
								cursor: "pointer",
								borderBottom: "1px solid var(--line)",
								background:
									selectedPatientId === chat.patientId
										? "rgba(14, 165, 233, 0.06)"
										: "transparent",
								display: "flex",
								gap: 10,
								transition: "background 0.15s",
							}}
						>
							<div
								style={{
									width: 42,
									height: 42,
									borderRadius: "50%",
									background: "var(--paper-soft)",
									border: "1px solid var(--line)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--muted)",
									flexShrink: 0,
									position: "relative",
								}}
							>
								<span style={{ fontWeight: 600, fontSize: 15 }}>
									{chat.patientName ? chat.patientName.charAt(0).toUpperCase() : "?"}
								</span>
								<div
									style={{
										position: "absolute",
										bottom: -2,
										right: -2,
										width: 15,
										height: 15,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: 8,
										color: "#fff",
										fontWeight: "bold",
										background: getChannelColor(chat.channel),
									}}
								>
									{getChannelLetter(chat.channel)}
								</div>
							</div>

							<div style={{ flex: 1, minWidth: 0 }}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: 3,
									}}
								>
									<div
										style={{
											fontWeight: chat.unreadCount > 0 ? 700 : 600,
											color: "var(--ink)",
											fontSize: 13,
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{chat.patientName || "Неизвестный пациент"}
									</div>
									<div
										style={{
											fontSize: 11,
											color: "var(--muted)",
											flexShrink: 0,
											marginLeft: 6,
										}}
									>
										{formatTime(chat.createdAt)}
									</div>
								</div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 4,
										justifyContent: "space-between",
									}}
								>
									<div
										style={{
											fontSize: 12,
											color: chat.unreadCount > 0 ? "var(--ink)" : "var(--muted)",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											fontWeight: chat.unreadCount > 0 ? 500 : 400,
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										{chat.direction === "outbound" && (
											<CheckCheck
												size={13}
												color="var(--teal)"
												style={{ flexShrink: 0 }}
											/>
										)}
										{chat.message || "Диалог открыт"}
									</div>
									{chat.unreadCount > 0 && (
										<span
											style={{
												background: "var(--teal)",
												color: "#fff",
												borderRadius: 10,
												fontSize: 10,
												fontWeight: 700,
												padding: "1px 6px",
												flexShrink: 0,
												minWidth: 16,
												textAlign: "center",
											}}
										>
											{chat.unreadCount > 99 ? "99+" : chat.unreadCount}
										</span>
									)}
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
