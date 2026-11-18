-- Migration 0251: Add clinical stage column to lab_orders (eliminates Stage Collapse Bug)
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "stage" text;
