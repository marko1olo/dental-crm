import type React from "react";
import { Hash, MoreVertical, Phone } from "lucide-react";
import { useInboxLogic } from "./inbox/useInboxLogic";
import { NewChatModal } from "./inbox/NewChatModal";
import { InboxSidebar } from "./inbox/InboxSidebar";
import { InboxChatArea } from "./inbox/InboxChatArea";
import { InboxInputArea } from "./inbox/InboxInputArea";
import { getChannelLabel } from "./inbox/InboxUtils";

export function OmnichannelInboxView() {
	const {
		auth,
		dashboard,
		selectedPatientId,
		setSelectedPatientId,
		inputText,
		setInputText,
		searchQuery,
		setSearchQuery,
		activeChannelFilter,
		setActiveChannelFilter,
		showNewChat,
		setShowNewChat,
		messagesEndRef,
		fileInputRef,
		pendingAttachments,
		setPendingAttachments,
		handleSend,
		insertTemplate,
		handleNewChatSelect,
		filteredChats,
		messagesWithDateSeparators,
		selectedChatInfo,
		totalUnread,
	} = useInboxLogic();

	return (
		<>
			{showNewChat && (
				<NewChatModal
					onClose={() => setShowNewChat(false)}
					onSelect={handleNewChatSelect}
					authHeaders={auth.denteClinicalReadHeaders}
				/>
			)}
			<div
				style={{
					display: "flex",
					height: "calc(100vh - 80px)",
					background: "var(--paper-soft)",
					borderRadius: 16,
					overflow: "hidden",
					border: "1px solid var(--line)",
					margin: "0 auto",
					maxWidth: 1400,
				}}
			>
				<InboxSidebar
					totalUnread={totalUnread}
					setShowNewChat={setShowNewChat}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					activeChannelFilter={activeChannelFilter}
					setActiveChannelFilter={setActiveChannelFilter}
					filteredChats={filteredChats}
					selectedPatientId={selectedPatientId}
					setSelectedPatientId={setSelectedPatientId}
				/>

				{/* MAIN CHAT AREA */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						backgroundColor: "var(--paper-soft)",
					}}
				>
					{selectedPatientId ? (
						<>
							{/* CHAT HEADER */}
							<div
								style={{
									height: 64,
									background: "var(--glass-bg, var(--paper))",
									backdropFilter: "var(--glass-blur, blur(12px))",
									borderBottom: "1px solid var(--line)",
									padding: "0 20px",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									zIndex: 10,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
									<div
										style={{
											width: 38,
											height: 38,
											borderRadius: "50%",
											background: "var(--teal)",
											color: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: "bold",
											fontSize: 15,
										}}
									>
										{selectedChatInfo?.patientName?.charAt(0).toUpperCase() ?? "?"}
									</div>
									<div style={{ display: "flex", flexDirection: "column" }}>
										<a
											href="#patients"
											onClick={(e) => {
												if (selectedPatientId) {
													setSelectedPatientId(selectedPatientId);
													window.location.hash = "patients";
												} else {
													e.preventDefault();
												}
											}}
											style={{
												margin: 0,
												fontSize: 15,
												fontWeight: 600,
												color: "var(--ink)",
												textDecoration: "none",
												cursor: selectedPatientId ? "pointer" : "default",
											}}
										>
											{selectedChatInfo?.patientName || "Пациент"}
										</a>
										<div
											style={{
												fontSize: 12,
												color: "var(--muted)",
												display: "flex",
												alignItems: "center",
												gap: 6,
											}}
										>
											<div
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													background: "var(--teal)",
												}}
											/>
											{selectedChatInfo
												? `Диалог через ${getChannelLabel(selectedChatInfo.channel)}`
												: ""}
											{dashboard?.activeVisit?.patientId === selectedPatientId &&
												selectedPatientId && (
													<a
														href="#visit"
														onClick={(e) => {
															setSelectedPatientId(selectedPatientId);
															window.location.hash = "visit";
														}}
														style={{
															marginLeft: 8,
															fontSize: 11,
															background: "var(--brand-50, var(--paper-soft))",
															color: "var(--brand-600, var(--teal))",
															padding: "2px 6px",
															borderRadius: 4,
															textDecoration: "none",
															fontWeight: 600,
														}}
														title="Перейти к активному визиту"
													>
														Активный визит
													</a>
												)}
										</div>
									</div>
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									<button
										type="button"
										title="Позвонить"
										style={{
											background: "var(--paper)",
											border: "1px solid var(--line)",
											width: 36,
											height: 36,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted)",
											cursor: "pointer",
										}}
									>
										<Phone size={16} />
									</button>
									<button
										type="button"
										title="Дополнительно"
										style={{
											background: "var(--paper)",
											border: "1px solid var(--line)",
											width: 36,
											height: 36,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted)",
											cursor: "pointer",
										}}
									>
										<MoreVertical size={16} />
									</button>
								</div>
							</div>

							<InboxChatArea
								messagesWithDateSeparators={messagesWithDateSeparators}
								messagesEndRef={messagesEndRef}
							/>

							{/* QUICK REPLIES */}
							<div
								style={{
									padding: "0 20px 10px",
									display: "flex",
									gap: 6,
									overflowX: "auto",
								}}
							>
								{[
									{
										label: "Напоминание о приёме",
										text: "Здравствуйте! Напоминаем о вашем визите завтра в",
									},
									{
										label: "Подтверждение записи",
										text: "Отлично, записали вас! Ждём вас в клинике.",
									},
									{
										label: "Контроль после приёма",
										text: "Как ваше самочувствие после лечения?",
									},
									{
										label: "Рекомендации",
										text: "Не забудьте выполнять рекомендации врача:",
									},
								].map((tpl) => (
									<button
										key={tpl.label}
										type="button"
										onClick={() => insertTemplate(tpl.text)}
										style={{
											whiteSpace: "nowrap",
											padding: "5px 11px",
											background: "var(--paper)",
											border: "1px solid var(--line)",
											borderRadius: 20,
											fontSize: 12,
											color: "var(--muted)",
											cursor: "pointer",
											transition: "all 0.15s",
										}}
									>
										{tpl.label}
									</button>
								))}
							</div>

							<InboxInputArea
								inputText={inputText}
								setInputText={setInputText}
								handleSend={handleSend}
								fileInputRef={fileInputRef}
								pendingAttachments={pendingAttachments}
								setPendingAttachments={setPendingAttachments}
							/>
						</>
					) : (
						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--muted)",
								gap: 16,
							}}
						>
							<div
								style={{
									width: 80,
									height: 80,
									borderRadius: "50%",
									background: "rgba(0,0,0,0.04)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Hash size={36} color="var(--line)" />
							</div>
							<h2
								style={{
									margin: 0,
									color: "var(--ink)",
									fontWeight: 600,
									fontSize: 18,
								}}
							>
								Омниканальный Inbox
							</h2>
							<p
								style={{
									margin: 0,
									maxWidth: 280,
									textAlign: "center",
									lineHeight: 1.5,
									fontSize: 14,
								}}
							>
								Выберите диалог слева или нажмите{" "}
								<strong style={{ color: "var(--teal)" }}>+</strong> чтобы начать
								новый.
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
