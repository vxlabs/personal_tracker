using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Protocol.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAppActivityTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TagsRaw",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Confidence",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "medium");

            migrationBuilder.AlterColumn<string>(
                name: "BackLinksRaw",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "TagsRaw",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "captured");

            migrationBuilder.AlterColumn<string>(
                name: "SourceType",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldDefaultValue: "article");

            migrationBuilder.CreateTable(
                name: "AppCategoryLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ProcessName = table.Column<string>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppCategoryLabels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppMlTrainingRuns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Succeeded = table.Column<bool>(type: "INTEGER", nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    TrainingExampleCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ModelPath = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppMlTrainingRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppUsageSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SessionKey = table.Column<string>(type: "TEXT", nullable: false),
                    ProcessName = table.Column<string>(type: "TEXT", nullable: false),
                    WindowTitle = table.Column<string>(type: "TEXT", nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastSeenAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ActiveSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    CategoryLabel = table.Column<string>(type: "TEXT", nullable: false),
                    LabelSource = table.Column<string>(type: "TEXT", nullable: false),
                    PredictionConfidence = table.Column<float>(type: "REAL", nullable: true),
                    PredictedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUsageSessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppCategoryLabels_ProcessName",
                table: "AppCategoryLabels",
                column: "ProcessName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppMlTrainingRuns_StartedAtUtc",
                table: "AppMlTrainingRuns",
                column: "StartedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AppUsageSessions_CategoryLabel",
                table: "AppUsageSessions",
                column: "CategoryLabel");

            migrationBuilder.CreateIndex(
                name: "IX_AppUsageSessions_ProcessName",
                table: "AppUsageSessions",
                column: "ProcessName");

            migrationBuilder.CreateIndex(
                name: "IX_AppUsageSessions_SessionKey",
                table: "AppUsageSessions",
                column: "SessionKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUsageSessions_StartedAtUtc",
                table: "AppUsageSessions",
                column: "StartedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppCategoryLabels");

            migrationBuilder.DropTable(
                name: "AppMlTrainingRuns");

            migrationBuilder.DropTable(
                name: "AppUsageSessions");

            migrationBuilder.AlterColumn<string>(
                name: "TagsRaw",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Confidence",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                defaultValue: "medium",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "BackLinksRaw",
                table: "WikiPages",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "TagsRaw",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                defaultValue: "captured",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<string>(
                name: "SourceType",
                table: "VaultSources",
                type: "TEXT",
                nullable: false,
                defaultValue: "article",
                oldClrType: typeof(string),
                oldType: "TEXT");
        }
    }
}
