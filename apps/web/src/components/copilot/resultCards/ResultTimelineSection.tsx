import React from 'react';
import type { TimelineEventItem, SelectIdHandler } from '../copilotTypes';
import { CopilotTimelineCard } from '../CopilotTimelineCard';

type Obj = Record<string, unknown>;

export function renderTimelineSection(
  tool: string,
  obj: Obj,
  result: unknown,
  onSelectPatient?: SelectIdHandler,
): React.ReactNode | null {
  const isTimeline =
    tool.includes('timeline') ||
    tool.includes('history') ||
    Array.isArray(obj.timeline) ||
    Array.isArray(obj.events);

  if (!isTimeline) return null;

  const events: TimelineEventItem[] = Array.isArray(obj.timeline)
    ? (obj.timeline as TimelineEventItem[])
    : Array.isArray(obj.events)
    ? (obj.events as TimelineEventItem[])
    : Array.isArray(result) && result.length > 0 && 'date' in (result[0] as Obj)
    ? (result as TimelineEventItem[])
    : [];

  if (events.length > 0) {
    return (
      <CopilotTimelineCard
        events={events}
        patientId={typeof obj.patient_id === 'string' ? obj.patient_id : undefined}
        onSelectPatient={onSelectPatient}
      />
    );
  }

  return null;
}
