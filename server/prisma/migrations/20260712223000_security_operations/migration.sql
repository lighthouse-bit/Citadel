ALTER TABLE "Admin"
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Admin_passwordResetToken_key" ON "Admin"("passwordResetToken");
CREATE TABLE "OperationalEvent" (
  "id" TEXT NOT NULL, "type" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'ERROR',
  "message" TEXT NOT NULL, "metadata" JSONB, "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationalEvent_resolved_severity_createdAt_idx" ON "OperationalEvent"("resolved", "severity", "createdAt");
CREATE INDEX "OperationalEvent_type_createdAt_idx" ON "OperationalEvent"("type", "createdAt");
