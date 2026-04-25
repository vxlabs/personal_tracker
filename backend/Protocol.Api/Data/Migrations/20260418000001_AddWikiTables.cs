using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Protocol.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VaultSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    SourceType = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "article"),
                    RawFilePath = table.Column<string>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", nullable: false),
                    UserNote = table.Column<string>(type: "TEXT", nullable: true),
                    TagsRaw = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    Status = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "captured"),
                    CapturedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompiledAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VaultSources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WikiPages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FilePath = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    PageType = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    Content = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    TagsRaw = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    BackLinksRaw = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    Confidence = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "medium"),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiPages", x => x.Id);
                });

            // Indexes on VaultSources
            migrationBuilder.CreateIndex(
                name: "IX_VaultSources_Status",
                table: "VaultSources",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_VaultSources_Slug",
                table: "VaultSources",
                column: "Slug",
                unique: true);

            // Indexes on WikiPages
            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_FilePath",
                table: "WikiPages",
                column: "FilePath",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_PageType",
                table: "WikiPages",
                column: "PageType");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_UpdatedAt",
                table: "WikiPages",
                column: "UpdatedAt");

            // FTS5 virtual table for full-text search across wiki pages
            migrationBuilder.Sql("""
                CREATE VIRTUAL TABLE IF NOT EXISTS wiki_fts USING fts5(
                    file_path UNINDEXED,
                    title,
                    summary,
                    content,
                    tags,
                    tokenize='porter unicode61'
                );
                """);

            // Trigger: keep FTS5 in sync when WikiPages rows are inserted
            migrationBuilder.Sql("""
                CREATE TRIGGER IF NOT EXISTS wiki_fts_insert
                AFTER INSERT ON WikiPages BEGIN
                    INSERT INTO wiki_fts(file_path, title, summary, content, tags)
                    VALUES (new.FilePath, new.Title, new.Summary, new.Content, new.TagsRaw);
                END;
                """);

            // Trigger: keep FTS5 in sync on update
            migrationBuilder.Sql("""
                CREATE TRIGGER IF NOT EXISTS wiki_fts_update
                AFTER UPDATE ON WikiPages BEGIN
                    UPDATE wiki_fts
                    SET title = new.Title,
                        summary = new.Summary,
                        content = new.Content,
                        tags = new.TagsRaw
                    WHERE file_path = old.FilePath;
                END;
                """);

            // Trigger: keep FTS5 in sync on delete
            migrationBuilder.Sql("""
                CREATE TRIGGER IF NOT EXISTS wiki_fts_delete
                AFTER DELETE ON WikiPages BEGIN
                    DELETE FROM wiki_fts WHERE file_path = old.FilePath;
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS wiki_fts_delete;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS wiki_fts_update;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS wiki_fts_insert;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS wiki_fts;");

            migrationBuilder.DropTable(name: "WikiPages");
            migrationBuilder.DropTable(name: "VaultSources");
        }
    }
}
