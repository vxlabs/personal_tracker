using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Protocol.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiAgentProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WikiAgentProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Provider = table.Column<string>(type: "TEXT", nullable: false),
                    Executable = table.Column<string>(type: "TEXT", nullable: false),
                    ArgumentsTemplate = table.Column<string>(type: "TEXT", nullable: false),
                    Model = table.Column<string>(type: "TEXT", nullable: true),
                    SendPromptToStdIn = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsDefault = table.Column<bool>(type: "INTEGER", nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastTestedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastTestStatus = table.Column<string>(type: "TEXT", nullable: true),
                    LastTestMessage = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiAgentProfiles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiAgentProfiles_IsDefault",
                table: "WikiAgentProfiles",
                column: "IsDefault");

            migrationBuilder.CreateIndex(
                name: "IX_WikiAgentProfiles_Provider",
                table: "WikiAgentProfiles",
                column: "Provider");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "WikiAgentProfiles");
        }
    }
}
