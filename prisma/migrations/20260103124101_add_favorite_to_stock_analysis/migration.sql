-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "csv_file_path" TEXT,
    "status" TEXT,
    "analysis_results" TEXT,
    "ai_insights" TEXT,
    "latest_price" REAL,
    "price_change" REAL,
    "price_change_percent" REAL,
    "price_updated_at" DATETIME,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "min_pct_change" REAL NOT NULL DEFAULT 4.0
);
INSERT INTO "new_stock_analyses" ("ai_insights", "analysis_results", "created_at", "csv_file_path", "id", "latest_price", "min_pct_change", "name", "price_change", "price_change_percent", "price_updated_at", "status", "symbol", "updated_at") SELECT "ai_insights", "analysis_results", "created_at", "csv_file_path", "id", "latest_price", "min_pct_change", "name", "price_change", "price_change_percent", "price_updated_at", "status", "symbol", "updated_at" FROM "stock_analyses";
DROP TABLE "stock_analyses";
ALTER TABLE "new_stock_analyses" RENAME TO "stock_analyses";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
