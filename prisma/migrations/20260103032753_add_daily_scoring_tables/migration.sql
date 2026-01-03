-- CreateTable
CREATE TABLE "daily_factor_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_analysis_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "close" REAL NOT NULL,
    "open" REAL,
    "high" REAL,
    "low" REAL,
    "volume" INTEGER,
    "pct_change" REAL,
    "ma20" REAL,
    "ma50" REAL,
    "ma200" REAL,
    "rsi" REAL,
    "volume_spike" BOOLEAN NOT NULL DEFAULT false,
    "market_up" BOOLEAN,
    "sector_up" BOOLEAN,
    "earnings_window" BOOLEAN,
    "break_ma50" BOOLEAN NOT NULL DEFAULT false,
    "break_ma200" BOOLEAN NOT NULL DEFAULT false,
    "rsi_over_60" BOOLEAN NOT NULL DEFAULT false,
    "news_positive" BOOLEAN,
    "short_covering" BOOLEAN,
    "macro_tailwind" BOOLEAN,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_factor_data_stock_analysis_id_fkey" FOREIGN KEY ("stock_analysis_id") REFERENCES "stock_analyses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_scores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_analysis_id" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "factor_count" INTEGER NOT NULL,
    "above_threshold" BOOLEAN NOT NULL DEFAULT false,
    "breakdown" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_scores_stock_analysis_id_fkey" FOREIGN KEY ("stock_analysis_id") REFERENCES "stock_analyses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_factor_data_stock_analysis_id_date_key" ON "daily_factor_data"("stock_analysis_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_scores_stock_analysis_id_date_key" ON "daily_scores"("stock_analysis_id", "date");
