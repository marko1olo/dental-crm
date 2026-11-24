/**
 * Server-Sent Events (SSE) progress streaming for Smart Imports and Database Migrations.
 */
import { EventEmitter } from "node:events";
import type { FastifyReply, FastifyRequest } from "fastify";

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

class SmartImportProgressManager extends EventEmitter {
  private tasks = new Map<string, ImportProgressEvent>();

  public updateProgress(event: ImportProgressEvent): void {
    this.tasks.set(event.taskId, event);
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

    const onBroadcast = (event: ImportProgressEvent) => {
      if (organizationId && event.organizationId !== organizationId) {
        return;
      }
      raw.write(`event: progress\ndata: ${JSON.stringify(event)}\n\n`);
    };

    this.on("broadcast", onBroadcast);

    const interval = setInterval(() => {
      raw.write(": keepalive\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(interval);
      this.off("broadcast", onBroadcast);
    });
  }
}

export const importProgressManager = new SmartImportProgressManager();
