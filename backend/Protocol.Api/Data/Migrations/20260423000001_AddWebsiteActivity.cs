using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Protocol.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWebsiteActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WebsiteMlTrainingRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Succeeded = table.Column<bool>(type: "INTEGER", nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    ProductiveCount = table.Column<int>(type: "INTEGER", nullable: false),
                    NeutralCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DistractingCount = table.Column<int>(type: "INTEGER", nullable: false),
                    TrainingExampleCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ModelPath = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebsiteMlTrainingRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WebsiteProductivityLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Scope = table.Column<string>(type: "TEXT", nullable: false),
                    Target = table.Column<string>(type: "TEXT", nullable: false),
                    Domain = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: true),
                    Label = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebsiteProductivityLabels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WebsiteVisitSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SessionKey = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Domain = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ActiveSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceBrowser = table.Column<string>(type: "TEXT", nullable: true),
                    ProductivityLabel = table.Column<string>(type: "TEXT", nullable: false),
                    LabelSource = table.Column<string>(type: "TEXT", nullable: false),
                    PredictionConfidence = table.Column<float>(type: "REAL", nullable: true),
                    PredictedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebsiteVisitSessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteMlTrainingRuns_StartedAtUtc",
                table: "WebsiteMlTrainingRuns",
                column: "StartedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteProductivityLabels_Domain",
                table: "WebsiteProductivityLabels",
                column: "Domain");

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteProductivityLabels_Scope_Target",
                table: "WebsiteProductivityLabels",
                columns: new[] { "Scope", "Target" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteVisitSessions_Domain",
                table: "WebsiteVisitSessions",
                column: "Domain");

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteVisitSessions_ProductivityLabel",
                table: "WebsiteVisitSessions",
                column: "ProductivityLabel");

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteVisitSessions_SessionKey",
                table: "WebsiteVisitSessions",
                column: "SessionKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WebsiteVisitSessions_StartedAtUtc",
                table: "WebsiteVisitSessions",
                column: "StartedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WebsiteMlTrainingRuns");
            migrationBuilder.DropTable(name: "WebsiteProductivityLabels");
            migrationBuilder.DropTable(name: "WebsiteVisitSessions");
        }
    }
}
