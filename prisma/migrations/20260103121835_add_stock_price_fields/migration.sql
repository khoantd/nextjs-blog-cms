-- AlterTable
ALTER TABLE "stock_analyses" ADD COLUMN "latest_price" REAL;
ALTER TABLE "stock_analyses" ADD COLUMN "price_change" REAL;
ALTER TABLE "stock_analyses" ADD COLUMN "price_change_percent" REAL;
ALTER TABLE "stock_analyses" ADD COLUMN "price_updated_at" DATETIME;
