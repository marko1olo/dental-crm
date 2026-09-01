-- 0184_rag_pgvector_knowledge.sql
-- Vector knowledge base for clinical RAG, nomenclature 804n, protocols, and patient EHR memory (SQUAD MU)
-- Requires pgvector extension for dense 1536-dimensional embeddings and HNSW cosine similarity search

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS "clinical_knowledge_embeddings" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
            "category" text NOT NULL,
            "title" text NOT NULL,
            "content" text NOT NULL,
            "embedding" vector(1536),
            "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
            "created_at" timestamp with time zone NOT NULL DEFAULT now()
        );
        EXECUTE 'CREATE INDEX IF NOT EXISTS "clinical_knowledge_embeddings_vector_idx" ON "clinical_knowledge_embeddings" USING hnsw ("embedding" vector_cosine_ops)';
    ELSE
        CREATE TABLE IF NOT EXISTS "clinical_knowledge_embeddings" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
            "category" text NOT NULL,
            "title" text NOT NULL,
            "content" text NOT NULL,
            "embedding" jsonb,
            "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
            "created_at" timestamp with time zone NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Row Level Security (RLS) Policies
ALTER TABLE "clinical_knowledge_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_knowledge_embeddings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "clinical_knowledge_embeddings";
CREATE POLICY tenant_isolation ON "clinical_knowledge_embeddings"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
