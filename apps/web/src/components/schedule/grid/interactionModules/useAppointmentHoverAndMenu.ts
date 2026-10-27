/**
 * useAppointmentHoverAndMenu.ts — Hook managing hover states, menus, status pickers, and click dismissal.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Appointment } from "@dental/shared";

export function useAppointmentHoverAndMenu() {
  const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
  const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);
  const [activeStatusPickerApptId, setActiveStatusPickerApptId] = useState<string | null>(null);
  const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);
  const [chairDoctorDropdownId, setChairDoctorDropdownId] = useState<string | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (activeMenuApptId) setActiveMenuApptId(null);
      if (activeStatusPickerApptId) setActiveStatusPickerApptId(null);
      if (chairDoctorDropdownId) setChairDoctorDropdownId(null);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [activeMenuApptId, activeStatusPickerApptId, chairDoctorDropdownId]);

  const handleAppointmentMouseEnter = useCallback((apptId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredApptId(apptId);
  }, []);

  const handleAppointmentMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredApptId(null);
    }, 150);
  }, []);

  const handleKeepHovered = useCallback((apptId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredApptId(apptId);
  }, []);

  const handleToggleStatusPicker = useCallback((apptId: string) => {
    setActiveStatusPickerApptId((prev) => (prev === apptId ? null : apptId));
    setActiveMenuApptId(null);
  }, []);

  const handleToggleMenu = useCallback((apptId: string) => {
    setActiveMenuApptId((prev) => (prev === apptId ? null : apptId));
    setActiveStatusPickerApptId(null);
  }, []);

  const handleCloseStatusPicker = useCallback(() => {
    setActiveStatusPickerApptId(null);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setActiveMenuApptId(null);
  }, []);

  const handleSelectMobileAppt = useCallback((appt: Appointment) => {
    setSelectedMobileAppt(appt);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeStatusPickerApptId) setActiveStatusPickerApptId(null);
      if (activeMenuApptId) setActiveMenuApptId(null);
      if (chairDoctorDropdownId) setChairDoctorDropdownId(null);
    };

    if (activeStatusPickerApptId || activeMenuApptId || chairDoctorDropdownId) {
      const timer = setTimeout(() => {
        document.addEventListener("click", handleGlobalClick);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleGlobalClick);
      };
    }
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [activeStatusPickerApptId, activeMenuApptId, chairDoctorDropdownId]);

  return {
    hoveredApptId,
    setHoveredApptId,
    activeMenuApptId,
    setActiveMenuApptId,
    activeStatusPickerApptId,
    setActiveStatusPickerApptId,
    selectedMobileAppt,
    setSelectedMobileAppt,
    chairDoctorDropdownId,
    setChairDoctorDropdownId,
    hoverTimeoutRef,
    gridContainerRef,
    handleAppointmentMouseEnter,
    handleAppointmentMouseLeave,
    handleKeepHovered,
    handleToggleStatusPicker,
    handleToggleMenu,
    handleCloseStatusPicker,
    handleCloseMenu,
    handleSelectMobileAppt,
  };
}
