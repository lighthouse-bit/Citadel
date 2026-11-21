CREATE TABLE "AutomationWorkflow" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationDelivery" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "messageId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationWorkflow_type_key" ON "AutomationWorkflow"("type");
CREATE UNIQUE INDEX "AutomationDelivery_workflowId_eventKey_key" ON "AutomationDelivery"("workflowId", "eventKey");
CREATE INDEX "AutomationDelivery_status_scheduledFor_idx" ON "AutomationDelivery"("status", "scheduledFor");
CREATE INDEX "AutomationDelivery_workflowId_status_createdAt_idx" ON "AutomationDelivery"("workflowId", "status", "createdAt");
CREATE INDEX "AutomationDelivery_customerId_createdAt_idx" ON "AutomationDelivery"("customerId", "createdAt");

ALTER TABLE "AutomationDelivery" ADD CONSTRAINT "AutomationDelivery_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationDelivery" ADD CONSTRAINT "AutomationDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
