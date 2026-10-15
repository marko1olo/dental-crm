/**
 * apps/web/src/components/schedule/useWaitlistScoringState.ts
 * Waitlist candidate scoring, ranking, and search filtering hook.
 */

import { useEffect, useMemo, useState } from "react";
import { logger } from "../../utils/logger";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import type { WaitlistMatchRow } from "./WaitlistMatchesBlock";
import {
  calculateMatchScore,
  type WaitlistPatientEntry,
} from "./waitlistMatchScoring";

interface UseWaitlistScoringParams {
  isOpen: boolean;
  activeTargetSlot: TargetSlotInfo | null;
  items: WaitlistPatientEntry[];
  searchQuery: string;
  selectedPriorityFilter: string;
  auth?: any;
}

export function useWaitlistScoringState({
  isOpen,
  activeTargetSlot,
  items,
  searchQuery,
  selectedPriorityFilter,
  auth,
}: UseWaitlistScoringParams) {
  const [serverMatchesMap, setServerMatchesMap] = useState<Map<string, WaitlistMatchRow> | null>(null);

  useEffect(() => {
    const apptId = activeTargetSlot?.appointmentId;
    if (!apptId || !isOpen) {
      setServerMatchesMap(null);
      return;
    }
    let isCancelled = false;
    async function fetchServerMatches() {
      try {
        const res = await fetch(`/api/appointments/${encodeURIComponent(apptId!)}/waitlist-matches`, {
          headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && Array.isArray(data.matches)) {
            const map = new Map<string, WaitlistMatchRow>();
            for (const m of data.matches as WaitlistMatchRow[]) {
              if (m.entryId) map.set(m.entryId, m);
              if (m.patientId) map.set(m.patientId, m);
            }
            setServerMatchesMap(map);
          }
        } else if (!isCancelled) {
          setServerMatchesMap(null);
        }
      } catch (err) {
        logger.warn("Failed to fetch server waitlist matches", err);
        if (!isCancelled) setServerMatchesMap(null);
      }
    }
    void fetchServerMatches();
    return () => {
      isCancelled = true;
    };
  }, [activeTargetSlot?.appointmentId, isOpen, auth]);

  const scoredPatients = useMemo(() => {
    return items
      .filter((item) => item.status === "active" || item.status === "waiting")
      .map((item) => {
        const baseScoring = calculateMatchScore(item, activeTargetSlot);
        const serverMatch = serverMatchesMap
          ? serverMatchesMap.get(item.id) || serverMatchesMap.get(item.patientId)
          : null;
        if (serverMatch) {
          const reasons = [...baseScoring.matchReasons];
          if (serverMatch.reason && !reasons.includes(serverMatch.reason)) reasons.unshift(serverMatch.reason);
          const mismatches = [...baseScoring.mismatchReasons];
          if (serverMatch.alreadyBooked && !mismatches.includes("Уже есть будущая запись")) {
            mismatches.push("Уже есть будущая запись");
          }
          let calculatedScore = baseScoring.score;
          if (serverMatch.sameDoctor && serverMatch.timeFits) calculatedScore = Math.max(calculatedScore, 95);
          else if (serverMatch.sameDoctor || serverMatch.timeFits) calculatedScore = Math.max(calculatedScore, 80);
          if (serverMatch.alreadyBooked) calculatedScore = Math.max(15, calculatedScore - 35);

          let calculatedRank = baseScoring.priorityRank;
          if (serverMatch.alreadyBooked) calculatedRank -= 5000;
          else {
            if (serverMatch.sameDoctor) calculatedRank += 1000;
            if (serverMatch.timeFits) calculatedRank += 500;
            calculatedRank += (serverMatch.waitingDays || 0) * 10;
          }

          return {
            patient: item,
            scoring: {
              ...baseScoring,
              score: calculatedScore,
              priorityRank: calculatedRank,
              sameDoctor: serverMatch.sameDoctor ?? baseScoring.sameDoctor,
              timeFits: serverMatch.timeFits ?? baseScoring.timeFits,
              matchReasons: reasons,
              mismatchReasons: mismatches,
            },
          };
        }
        return { patient: item, scoring: baseScoring };
      })
      .sort((a, b) => b.scoring.priorityRank - a.scoring.priorityRank);
  }, [items, activeTargetSlot, serverMatchesMap]);

  const filteredList = useMemo(() => {
    return items.filter((item) => {
      if (selectedPriorityFilter !== "all" && item.priorityLevel !== selectedPriorityFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.patientName?.toLowerCase() ?? "").includes(q) ||
        (item.patientPhone?.toLowerCase() ?? "").includes(q) ||
        (item.notes?.toLowerCase() ?? "").includes(q)
      );
    });
  }, [items, searchQuery, selectedPriorityFilter]);

  return {
    scoredPatients,
    filteredList,
  };
}
