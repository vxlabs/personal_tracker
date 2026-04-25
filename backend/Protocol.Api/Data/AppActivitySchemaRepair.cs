using Microsoft.EntityFrameworkCore;

namespace Protocol.Api.Data;

public static class AppActivitySchemaRepair
{
    public static void EnsureCreated(ProtocolDbContext db)
    {
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "AppUsageSessions" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AppUsageSessions" PRIMARY KEY AUTOINCREMENT,
                "SessionKey" TEXT NOT NULL,
                "ProcessName" TEXT NOT NULL,
                "WindowTitle" TEXT NULL,
                "StartedAtUtc" TEXT NOT NULL,
                "LastSeenAtUtc" TEXT NOT NULL,
                "EndedAtUtc" TEXT NULL,
                "ActiveSeconds" INTEGER NOT NULL,
                "CategoryLabel" TEXT NOT NULL,
                "LabelSource" TEXT NOT NULL,
                "PredictionConfidence" REAL NULL,
                "PredictedAtUtc" TEXT NULL,
                "CreatedAtUtc" TEXT NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "AppCategoryLabels" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AppCategoryLabels" PRIMARY KEY AUTOINCREMENT,
                "ProcessName" TEXT NOT NULL,
                "Label" TEXT NOT NULL,
                "UpdatedAtUtc" TEXT NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "AppMlTrainingRuns" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_AppMlTrainingRuns" PRIMARY KEY AUTOINCREMENT,
                "StartedAtUtc" TEXT NOT NULL,
                "CompletedAtUtc" TEXT NULL,
                "Succeeded" INTEGER NOT NULL,
                "Message" TEXT NOT NULL,
                "TrainingExampleCount" INTEGER NOT NULL,
                "ModelPath" TEXT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_AppUsageSessions_SessionKey" ON "AppUsageSessions" ("SessionKey");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_AppUsageSessions_ProcessName" ON "AppUsageSessions" ("ProcessName");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_AppUsageSessions_StartedAtUtc" ON "AppUsageSessions" ("StartedAtUtc");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_AppUsageSessions_CategoryLabel" ON "AppUsageSessions" ("CategoryLabel");""");
        db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_AppCategoryLabels_ProcessName" ON "AppCategoryLabels" ("ProcessName");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_AppMlTrainingRuns_StartedAtUtc" ON "AppMlTrainingRuns" ("StartedAtUtc");""");
    }
}
