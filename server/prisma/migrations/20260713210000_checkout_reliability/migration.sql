ALTER TABLE "Order" ADD COLUMN "checkoutToken" TEXT;

CREATE UNIQUE INDEX "Order_checkoutToken_key" ON "Order"("checkoutToken");
