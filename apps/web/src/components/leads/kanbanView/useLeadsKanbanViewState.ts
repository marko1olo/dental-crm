/**
 * DENTE Dental CRM — Leads Kanban View State Hook
 * Filters, Websocket, Staff & Chairs, View Mode
 * Mandate 8b (<= 120 lines)
 */

import { useEffect, useMemo, useState } from "react";
import { dateInputValuePlusDays } from "../../../AppHelpers";
import { useWebsocket } from "../../../hooks/useWebsocket";
import type { Lead } from "../../../store/leadsStore";

export function useLeadsKanbanViewState(leads: Lead[], fetchLeads: () => void, clinicTimeZone?: string | null) {
	const [viewMode, setViewMode] = useState<"funnel" | "all">("funnel");
	const [expandedColumnId, setExpandedColumnId] = useState<any>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [sourceFilter, setSourceFilter] = useState("");
	const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
	const [isLeakDetectorOpen, setIsLeakDetectorOpen] = useState(false);
	const [isConvertOpen, setIsConvertOpen] = useState(false);
	const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
	const [isBooking, setIsBooking] = useState(false);
	const [appointmentDate, setAppointmentDate] = useState("");
	const [appointmentTime, setAppointmentTime] = useState("10:00");

	const { lastMessage } = useWebsocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule");
	useEffect(() => {
		if (lastMessage?.type === "LEAD_CREATED" || lastMessage?.type === "LEAD_UPDATED" || lastMessage?.type === "LEAD_DELETED" || lastMessage?.type === "TELEPHONY_MISSED_CALL") fetchLeads();
	}, [lastMessage, fetchLeads]);
	useEffect(() => { fetchLeads(); setAppointmentDate(dateInputValuePlusDays(1, clinicTimeZone)); }, [fetchLeads, clinicTimeZone]);

	const filteredLeads = useMemo(() => leads.filter((l) => {
		const q = searchQuery.toLowerCase();
		return (!q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q)) && (!sourceFilter || l.source === sourceFilter);
	}), [leads, searchQuery, sourceFilter]);

	const uniqueSources = useMemo(() => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))), [leads]);
	const secondaryLeadsCount = useMemo(() => leads.filter((l) => l.status === "no_answer" || l.status === "trash").length, [leads]);

	return {
		viewMode, setViewMode, expandedColumnId, setExpandedColumnId, searchQuery, setSearchQuery,
		sourceFilter, setSourceFilter, isAnalyticsOpen, setIsAnalyticsOpen, isLeakDetectorOpen,
		setIsLeakDetectorOpen, isConvertOpen, setIsConvertOpen, convertingLeadId, setConvertingLeadId,
		isBooking, setIsBooking, appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime,
		filteredLeads, uniqueSources, secondaryLeadsCount,
	};
}
