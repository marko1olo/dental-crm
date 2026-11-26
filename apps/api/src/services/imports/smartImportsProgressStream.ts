/**
 * Server-Sent Events (SSE) progress streaming for Smart Imports and Database Migrations.
 */
import { EventEmitter } from "node:events";
import type { FastifyReply, FastifyRequest } from "fastify";
import { BoundedTtlMap } from "../../lib/boundedTtlMap.js";

export interface ImportProgressEvent {
  taskId: string;
  organizationId?: string | undefined;
  phase: "upload" | "discovery" | "parsing" | "validation" | "staging" | "committing" | "done" | "error";
  percent: number;
  processed: number;
  total: number;
  message: string;
  error?: string | undefined;
}

const COMPLETED_TASK_TTL_MS = 5 * 60 * 1000;
const ACTIVE_TASK_TTL_MS = 60 * 60 * 1000;

class SmartImportProgressManager extends EventEmitter {
  private tasks = new BoundedTtlMap<string, ImportProgressEvent>({
    maxEntries: 500,
    ttlMs: ACTIVE_TASK_TTL_MS,
  });

  public updateProgress(event: ImportProgressEvent): void {
    const ttlMs = event.phase === "done" || event.phase === "error" ? COMPLETED_TASK_TTL_MS : ACTIVE_TASK_TTL_MS;
    this.tasks.set(event.taskId, event, ttlMs);
    this.emit(`progress:${event.taskId}`, event);
    this.emit("broadcast", event);
  }

  public getProgress(taskId: string): ImportProgressEvent | undefined {
    return this.tasks.get(taskId);
  }

  public handleSseStream(
    request: FastifyRequest,
    reply: FastifyReply,
    organizationId?: string,
  ): void {
    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    raw.write(": keepalive\n\n");

    let closed = false;
    const onBroadcast = (event: ImportProgressEvent) => {
      if (closed || raw.destroyed || raw.writableEnded) {
        return;
      }
      if (organizationId && event.organizationId !== organizationId) {
        return;
      }
      raw.write(`event: progress\ndata: ${JSON.stringify(event)}\n\n`);
    };

    this.on("broadcast", onBroadcast);

    const interval = setInterval(() => {
      if (closed || raw.destroyed || raw.writableEnded) {
        cleanup();
        return;
      }
      raw.write(": keepalive\n\n");
    }, 15000);
    interval.unref();

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(interval);
      this.off("broadcast", onBroadcast);
      request.raw.off("close", cleanup);
      request.raw.off("error", cleanup);
      raw.off("error", cleanup);
      raw.off("close", cleanup);
    };

    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);
    raw.on("error", cleanup);
    raw.on("close", cleanup);
  }
}

export const importProgressManager = new SmartImportProgressManager();
