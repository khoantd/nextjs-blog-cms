-- CreateTable
CREATE TABLE "factor_tables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_analysis_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "factor_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "factor_tables_stock_analysis_id_fkey" FOREIGN KEY ("stock_analysis_id") REFERENCES "stock_analyses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "factor_tables_stock_analysis_id_idx" ON "factor_tables"("stock_analysis_id");

-- CreateIndex
CREATE UNIQUE INDEX "factor_tables_stock_analysis_id_transaction_id_key" ON "factor_tables"("stock_analysis_id", "transaction_id");
