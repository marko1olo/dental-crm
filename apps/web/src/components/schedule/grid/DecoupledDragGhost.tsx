/**
 * DENTE Dental CRM — Decoupled RAF-Throttled Drag Ghost Engine
 *
 * Low-End GPU & Celeron Optimization Mandate:
 * 1. Hardware-Accelerated Isolated Layer:
 *    The ghost element uses `position: fixed`, `will-change: transform`, `contain: layout style`
 *    and is animated exclusively via `transform: translate3d(x, y, 0)`.
 * 2. Zero-React-Rerender Drag Loop:
 *    Mouse tracking on `dragover` updates mutable coordinates and requests an animation frame.
 *    No React `setState` is called on mousemove/dragover, completely eliminating re-flow
 *    and re-rendering of 50+ appointment cards on every mouse tick.
 * 3. Native Drag Image Suppression:
 *    Replaces the browser's default choppy semi-transparent OS screenshot with a smooth 60/120 FPS card.
 */

import React, { useEffect, useRef } from "react";
import { Clock, GripVertical, User, Zap } from "lucide-react";
import type { Appointment } from "@dental/shared";

export interface DragGhostData {
  appointmentId: string;
  patientName: string;
  procedure?: string | null;
  doctorName?: string | null;
  timeRange?: string | null;
  durationMinutes?: number | null;
  status?: Appointment["status"] | string | null;
  chairName?: string | null;
  isCito?: boolean;
}

let emptyDragCanvas: HTMLCanvasElement | null = null;

/**
 * Suppresses the default browser drag image (which causes low-FPS lag on Intel UHD/Celeron).
 */
export function setEmptyDragImage(dataTransfer: DataTransfer): void {
  try {
    if (!emptyDragCanvas && typeof document !== "undefined") {
      emptyDragCanvas = document.createElement("canvas");
      emptyDragCanvas.width = 1;
      emptyDragCanvas.height = 1;
    }
    if (emptyDragCanvas && typeof dataTransfer.setDragImage === "function") {
      dataTransfer.setDragImage(emptyDragCanvas, 0, 0);
    }
  } catch {
    // Non-fatal fallback
  }
}

class DragGhostManager {
  private ghostElement: HTMLElement | null = null;
  private rafId: number | null = null;
  private activeData: DragGhostData | null = null;
  private offset = { x: 0, y: 0 };
  private pendingCoords = { x: -9999, y: -9999 };
  private isDragging = false;
  private subscribers = new Set<(data: DragGhostData | null) => void>();

  public registerElement(el: HTMLElement | null): void {
    this.ghostElement = el;
    if (el) {
      el.style.transform = "translate3d(-9999px, -9999px, 0)";
    }
  }

  public subscribe(cb: (data: DragGhostData | null) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify(data: DragGhostData | null): void {
    for (const sub of this.subscribers) {
      sub(data);
    }
  }

  public startDrag(
    data: DragGhostData,
    coords: { offsetX: number; offsetY: number; startX: number; startY: number },
  ): void {
    this.activeData = data;
    this.isDragging = true;
    this.offset = {
      x: Math.max(10, Math.min(coords.offsetX, 160)),
      y: Math.max(10, Math.min(coords.offsetY, 36)),
    };

    const initialX = coords.startX - this.offset.x;
    const initialY = coords.startY - this.offset.y;
    this.pendingCoords = { x: initialX, y: initialY };

    if (this.ghostElement) {
      this.ghostElement.style.transform = `translate3d(${initialX}px, ${initialY}px, 0)`;
      this.ghostElement.style.opacity = "0.94";
      this.ghostElement.style.display = "block";
    }

    this.notify(data);

    // Global listeners for decoupled tracking without React re-renders
    if (typeof window !== "undefined") {
      window.removeEventListener("dragover", this.handleGlobalDragOver);
      window.removeEventListener("dragend", this.handleGlobalDragEnd);
      window.removeEventListener("drop", this.handleGlobalDragEnd);

      window.addEventListener("dragover", this.handleGlobalDragOver, {
        passive: true,
      });
      window.addEventListener("dragend", this.handleGlobalDragEnd, {
        passive: true,
      });
      window.addEventListener("drop", this.handleGlobalDragEnd, {
        passive: true,
      });
    }
  }

  public handleGlobalDragOver = (e: DragEvent): void => {
    if (!this.isDragging) return;
    // Discard zero coordinates (Chromium artifact on final drag tick)
    if (e.clientX === 0 && e.clientY === 0) return;

    this.pendingCoords = {
      x: e.clientX - this.offset.x,
      y: e.clientY - this.offset.y,
    };

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.renderRafFrame);
    }
  };

  private renderRafFrame = (): void => {
    this.rafId = null;
    if (this.ghostElement && this.isDragging) {
      this.ghostElement.style.transform = `translate3d(${this.pendingCoords.x}px, ${this.pendingCoords.y}px, 0)`;
    }
  };

  public handleGlobalDragEnd = (): void => {
    this.endDrag();
  };

  public endDrag(): void {
    this.isDragging = false;
    this.activeData = null;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.ghostElement) {
      this.ghostElement.style.transform = "translate3d(-9999px, -9999px, 0)";
      this.ghostElement.style.opacity = "0";
      this.ghostElement.style.display = "none";
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("dragover", this.handleGlobalDragOver);
      window.removeEventListener("dragend", this.handleGlobalDragEnd);
      window.removeEventListener("drop", this.handleGlobalDragEnd);
    }

    this.notify(null);
  }

  public getActiveData(): DragGhostData | null {
    return this.activeData;
  }
}

export const dragGhostManager = new DragGhostManager();

export const DecoupledDragGhost: React.FC = React.memo(
  function DecoupledDragGhost() {
    const ghostRef = useRef<HTMLDivElement>(null);
    const [dragData, setDragData] = React.useState<DragGhostData | null>(null);

    useEffect(() => {
      dragGhostManager.registerElement(ghostRef.current);
      const unsubscribe = dragGhostManager.subscribe((data) => {
        setDragData(data);
      });
      return () => {
        unsubscribe();
        dragGhostManager.registerElement(null);
      };
    }, []);

    const durationLabel = dragData?.durationMinutes
      ? `${dragData.durationMinutes} мин`
      : "30 мин";

    return (
      <div
        ref={ghostRef}
        className="schedule-decoupled-drag-ghost fixed top-0 left-0 pointer-events-none z-[99999] rounded-xl border border-[var(--teal)] bg-[var(--paper)] text-[var(--ink)] shadow-[0_16px_36px_-4px_rgba(0,0,0,0.24),0_0_0_1px_var(--teal)] p-2.5 min-w-[210px] max-w-[270px] select-none"
        style={{
          willChange: "transform",
          contain: "layout style",
          transform: "translate3d(-9999px, -9999px, 0)",
          opacity: 0,
          display: "none",
        }}
        data-testid="schedule-decoupled-drag-ghost"
        aria-hidden="true"
      >
        {/* Ghost Header: Grip, Time, Duration & CITO */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-[var(--line)]">
          <div className="flex items-center gap-1 min-w-0">
            <GripVertical size={13} className="text-[var(--teal)] shrink-0" />
            <span className="text-[11px] font-bold text-[var(--teal-dark,var(--teal))] truncate">
              {dragData?.timeRange || "Перенос записи"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {dragData?.isCito && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Zap size={9} />
                CITO
              </span>
            )}
            <span className="text-[10px] font-semibold text-[var(--muted)] flex items-center gap-0.5">
              <Clock size={10} />
              {durationLabel}
            </span>
          </div>
        </div>

        {/* Patient Name */}
        <div className="flex items-center gap-1 text-xs font-bold text-[var(--ink)] truncate">
          <User size={12} className="text-[var(--muted)] shrink-0" />
          <span className="truncate">{dragData?.patientName || "Пациент"}</span>
        </div>

        {/* Procedure & Doctor footer */}
        <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] text-[var(--muted)]">
          <span className="truncate max-w-[150px]">
            {dragData?.procedure || "Приём"}
          </span>
          {dragData?.doctorName && (
            <span className="text-[10px] font-medium text-[var(--teal-dark,var(--teal))] shrink-0 truncate max-w-[90px]">
              {dragData.doctorName}
            </span>
          )}
        </div>
      </div>
    );
  },
);
