import { test, describe } from "node:test";
import assert from "node:assert";
import { auditFromRequest } from "./clinicalAuditService.js";
import { db } from "./db/client.js";
import type { FastifyRequest } from "fastify";

describe("auditFromRequest", () => {
  test("extracts ip and user-agent from fastify request when both headers are present", async (t) => {
    let capturedValues;
    t.mock.method(db, 'insert', () => ({
      values: (vals: any) => {
        capturedValues = vals;
        return Promise.resolve();
      }
    }));

    const mockRequest = {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        "user-agent": "Mozilla/5.0"
      },
      ip: "127.0.0.1"
    } as unknown as FastifyRequest;

    const payload = {
      organizationId: "org-1",
      action: "VIEW_PATIENT" as const,
      entityType: "patient",
      entityId: "pat-1"
    };

    await auditFromRequest(mockRequest, payload);

    assert.deepStrictEqual(capturedValues, {
      organizationId: "org-1",
      userId: null,
      patientId: null,
      action: "VIEW_PATIENT",
      entityType: "patient",
      entityId: "pat-1",
      ipAddress: "203.0.113.195",
      userAgent: "Mozilla/5.0"
    });
  });

  test("uses request.ip when x-forwarded-for is missing", async (t) => {
    let capturedValues;
    t.mock.method(db, 'insert', () => ({
      values: (vals: any) => {
        capturedValues = vals;
        return Promise.resolve();
      }
    }));

    const mockRequest = {
      headers: {
        "user-agent": "CustomApp/1.0"
      },
      ip: "10.0.0.5"
    } as unknown as FastifyRequest;

    const payload = {
      organizationId: "org-2",
      action: "VIEW_CBCT" as const,
      entityType: "imaging",
      entityId: "img-1"
    };

    await auditFromRequest(mockRequest, payload);

    assert.deepStrictEqual(capturedValues, {
      organizationId: "org-2",
      userId: null,
      patientId: null,
      action: "VIEW_CBCT",
      entityType: "imaging",
      entityId: "img-1",
      ipAddress: "10.0.0.5",
      userAgent: "CustomApp/1.0"
    });
  });

  test("handles missing ip and user-agent", async (t) => {
    let capturedValues;
    t.mock.method(db, 'insert', () => ({
      values: (vals: any) => {
        capturedValues = vals;
        return Promise.resolve();
      }
    }));

    const mockRequest = {
      headers: {}
    } as unknown as FastifyRequest;

    const payload = {
      organizationId: "org-3",
      action: "GENERATE_PLAN_PDF" as const,
      entityType: "plan",
      entityId: "plan-1"
    };

    await auditFromRequest(mockRequest, payload);

    assert.deepStrictEqual(capturedValues, {
      organizationId: "org-3",
      userId: null,
      patientId: null,
      action: "GENERATE_PLAN_PDF",
      entityType: "plan",
      entityId: "plan-1",
      ipAddress: null,
      userAgent: null
    });
  });

  test("handles single ip in x-forwarded-for header without spaces", async (t) => {
    let capturedValues;
    t.mock.method(db, 'insert', () => ({
      values: (vals: any) => {
        capturedValues = vals;
        return Promise.resolve();
      }
    }));

    const mockRequest = {
      headers: {
        "x-forwarded-for": "192.168.1.100"
      }
    } as unknown as FastifyRequest;

    const payload = {
      organizationId: "org-4",
      action: "VIEW_AUDIT_LOG" as const,
      entityType: "audit",
      entityId: "audit-1"
    };

    await auditFromRequest(mockRequest, payload);

    assert.strictEqual(capturedValues?.ipAddress, "192.168.1.100");
  });
});
