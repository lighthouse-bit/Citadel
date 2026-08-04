CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "response" TEXT,
    "customerId" TEXT NOT NULL,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_customerId_createdAt_idx" ON "PrivacyRequest"("customerId", "createdAt");
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");
CREATE INDEX "PrivacyRequest_type_createdAt_idx" ON "PrivacyRequest"("type", "createdAt");
CREATE INDEX "PrivacyRequest_handledById_idx" ON "PrivacyRequest"("handledById");

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_handledById_fkey"
FOREIGN KEY ("handledById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
