/*
  Warnings:

  - You are about to drop the column `stripePaymentIntentId` on the `Commission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Commission" DROP COLUMN "stripePaymentIntentId",
ADD COLUMN     "balanceAmount" DECIMAL(10,2),
ADD COLUMN     "balancePaidAt" TIMESTAMP(3),
ADD COLUMN     "balancePaymentIntentId" TEXT,
ADD COLUMN     "depositPaidAt" TIMESTAMP(3),
ADD COLUMN     "depositPaymentIntentId" TEXT,
ADD COLUMN     "depositPercentage" INTEGER NOT NULL DEFAULT 70;
