using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Protocol.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddXpLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "XpLedgerEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Amount = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceKey = table.Column<string>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_XpLedgerEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_XpLedgerEntries_SourceKey",
                table: "XpLedgerEntries",
                column: "SourceKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "XpLedgerEntries");
        }
    }
}
