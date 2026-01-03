-- CreateTable
CREATE TABLE "earnings_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "company" TEXT,
    "earnings_date" DATETIME NOT NULL,
    "reportType" TEXT NOT NULL,
    "expected_eps" REAL,
    "actual_eps" REAL,
    "surprise" REAL,
    "revenue" REAL,
    "expected_revenue" REAL,
    "ai_summary" TEXT,
    "aiSentiment" TEXT,
    "aiKeyPoints" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "earnings_data_symbol_earnings_date_key" ON "earnings_data"("symbol", "earnings_date");
