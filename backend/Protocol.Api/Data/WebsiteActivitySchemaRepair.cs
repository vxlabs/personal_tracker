using Microsoft.EntityFrameworkCore;

namespace Protocol.Api.Data;

public static class WebsiteActivitySchemaRepair
{
    public static void EnsureCreated(ProtocolDbContext db)
    {
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "WebsiteMlTrainingRuns" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_WebsiteMlTrainingRuns" PRIMARY KEY AUTOINCREMENT,
                "StartedAtUtc" TEXT NOT NULL,
                "CompletedAtUtc" TEXT NULL,
                "Succeeded" INTEGER NOT NULL,
                "Message" TEXT NOT NULL,
                "ProductiveCount" INTEGER NOT NULL,
                "NeutralCount" INTEGER NOT NULL,
                "DistractingCount" INTEGER NOT NULL,
                "TrainingExampleCount" INTEGER NOT NULL,
                "ModelPath" TEXT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "WebsiteProductivityLabels" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_WebsiteProductivityLabels" PRIMARY KEY AUTOINCREMENT,
                "Scope" TEXT NOT NULL,
                "Target" TEXT NOT NULL,
                "Domain" TEXT NOT NULL,
                "Url" TEXT NULL,
                "Label" TEXT NOT NULL,
                "CreatedAtUtc" TEXT NOT NULL,
                "UpdatedAtUtc" TEXT NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "WebsiteVisitSessions" (
                "Id" INTEGER NOT NULL CONSTRAINT "PK_WebsiteVisitSessions" PRIMARY KEY AUTOINCREMENT,
                "SessionKey" TEXT NOT NULL,
                "Url" TEXT NOT NULL,
                "Domain" TEXT NOT NULL,
                "Title" TEXT NULL,
                "StartedAtUtc" TEXT NOT NULL,
                "LastSeenAtUtc" TEXT NOT NULL,
                "EndedAtUtc" TEXT NULL,
                "ActiveSeconds" INTEGER NOT NULL,
                "SourceBrowser" TEXT NULL,
                "ProductivityLabel" TEXT NOT NULL,
                "LabelSource" TEXT NOT NULL,
                "PredictionConfidence" REAL NULL,
                "PredictedAtUtc" TEXT NULL,
                "CreatedAtUtc" TEXT NOT NULL
            );
            """);

        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_WebsiteMlTrainingRuns_StartedAtUtc" ON "WebsiteMlTrainingRuns" ("StartedAtUtc");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_WebsiteProductivityLabels_Domain" ON "WebsiteProductivityLabels" ("Domain");""");
        db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_WebsiteProductivityLabels_Scope_Target" ON "WebsiteProductivityLabels" ("Scope", "Target");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_WebsiteVisitSessions_Domain" ON "WebsiteVisitSessions" ("Domain");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_WebsiteVisitSessions_ProductivityLabel" ON "WebsiteVisitSessions" ("ProductivityLabel");""");
        db.Database.ExecuteSqlRaw("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_WebsiteVisitSessions_SessionKey" ON "WebsiteVisitSessions" ("SessionKey");""");
        db.Database.ExecuteSqlRaw("""CREATE INDEX IF NOT EXISTS "IX_WebsiteVisitSessions_StartedAtUtc" ON "WebsiteVisitSessions" ("StartedAtUtc");""");
    }
}
