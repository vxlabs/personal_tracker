namespace Protocol.Api.Services;

/// <summary>
/// Initializes the Protocol-Vault directory structure and generates starter files
/// (WIKI-SCHEMA.md, index.md, log.md) if they do not exist yet.
/// </summary>
public class VaultInitService(IConfiguration configuration, ILogger<VaultInitService> logger)
{
    private string VaultRoot => configuration["Protocol:VaultDirectory"]
        ?? throw new InvalidOperationException("Protocol:VaultDirectory is not configured.");

    public void Initialize()
    {
        logger.LogInformation("Initializing vault at {VaultRoot}", VaultRoot);

        // Create directory structure — parents listed before children so each
        // Directory.CreateDirectory call never needs to traverse more than one
        // level of non-existent path (avoids FileNotFoundException on some
        // Windows builds when CreateDirectoryW receives deeply nested new paths).
        var directories = new[]
        {
            VaultRoot,
            Path.Combine(VaultRoot, "raw"),
            Path.Combine(VaultRoot, "raw", "assets"),
            Path.Combine(VaultRoot, "wiki"),
            Path.Combine(VaultRoot, "wiki", "entities"),
            Path.Combine(VaultRoot, "wiki", "concepts"),
            Path.Combine(VaultRoot, "wiki", "topics"),
            Path.Combine(VaultRoot, "wiki", "sources"),
            Path.Combine(VaultRoot, "wiki", "syntheses"),
        };

        foreach (var dir in directories)
        {
            if (Directory.Exists(dir)) continue;   // already present — skip Win32 call

            // If a file (not directory) exists at this path, remove it first
            if (File.Exists(dir))
            {
                logger.LogWarning("Removing file at {Path} to create directory", dir);
                File.Delete(dir);
            }

            try
            {
                Directory.CreateDirectory(dir);
            }
            catch (Exception ex)
            {
                // On some Windows builds the Documents folder returns ERROR_FILE_NOT_FOUND
                // from CreateDirectoryW for nested paths. Log a warning and continue —
                // the directory will be seeded by the Electron pre-creation step instead.
                logger.LogWarning(ex, "Could not create vault directory {Dir} — skipping", dir);
            }
        }

        GenerateSchemaFile();
        GenerateIndexFile();
        GenerateLogFile();

        logger.LogInformation("Vault initialized successfully.");
    }

    private void GenerateSchemaFile()
    {
        var schemaPath = Path.Combine(VaultRoot, "WIKI-SCHEMA.md");
        if (File.Exists(schemaPath)) return;
        if (!Directory.Exists(VaultRoot)) return;

        const string content = """
            # Protocol Knowledge Wiki — Schema

            ## Overview
            This is a personal knowledge wiki maintained by Claude Code following the Karpathy LLM Wiki pattern.
            It covers AI/ML, software engineering, .NET development, content creation, and related topics.
            The wiki is maintained entirely by Claude Code. You curate sources and ask questions.
            Claude does the writing, cross-referencing, filing, and maintenance.

            ## Directory Structure
            - raw/ — Immutable source documents. Never modify these.
            - wiki/entities/ — Pages for people, companies, tools, products
            - wiki/concepts/ — Pages for ideas, techniques, patterns, algorithms
            - wiki/topics/ — Broader topic syntheses that span multiple concepts/entities
            - wiki/sources/ — One summary page per raw source document
            - wiki/syntheses/ — Filed answers to questions and analyses
            - index.md — Master catalog. Update after every ingest.
            - log.md — Append-only chronological record. Log every action.

            ## Page Format

            Every wiki page MUST have YAML frontmatter:

            ```yaml
            ---
            title: Attention Mechanism
            page_type: concept          # entity | concept | topic | source | synthesis
            created: 2026-04-17
            updated: 2026-04-17
            sources: [karpathy-llm-wiki, reddit-ml-transformers]
            confidence: high            # high | medium | low | contested
            tags: [ml, transformers, architecture]
            ---
            ```

            After frontmatter, every page MUST have:
            - `## Summary` — 2-3 sentence overview
            - `## Details` — Main content, as detailed as sources allow
            - `## Sources` — List of raw source files that contributed to this page
            - `## Related` — Links to related wiki pages using [[backlink]] syntax

            Entity pages additionally have:
            - `## Key Facts` — Bullet points of verified factual claims
            - `## Timeline` — Chronological events if applicable

            Concept pages additionally have:
            - `## How It Works` — Technical explanation
            - `## Why It Matters` — Practical significance

            ## Ingest Workflow

            When I say "ingest" or "process" a source:

            1. Read the raw source file completely
            2. Discuss key takeaways (2-3 bullet points)
            3. Create a summary page in wiki/sources/summary_{slug}.md
            4. For each entity mentioned: create or update its page in wiki/entities/
            5. For each concept mentioned: create or update its page in wiki/concepts/
            6. For relevant topics: update the topic page in wiki/topics/
            7. Add [[backlinks]] between all related pages
            8. Update index.md with new entries
            9. Append to log.md: `## [YYYY-MM-DD] ingest | {Source Title}`
            10. If new information contradicts existing wiki content, flag it explicitly

            A single source typically touches 5-15 wiki pages.

            ## Query Workflow

            When asked a question:

            1. Read index.md to identify relevant pages
            2. Read those pages
            3. Synthesize an answer with citations to specific wiki pages
            4. If the answer is substantial and reusable, offer to file it as a new
               synthesis page in wiki/syntheses/

            ## Lint Workflow

            When asked to "lint" or "health-check":

            1. Scan for orphan pages (no inbound links from other pages)
            2. Scan for contradictions between pages
            3. Scan for stale claims (pages not updated in 30+ days with newer sources available)
            4. Scan for missing pages (entities/concepts mentioned but lacking their own page)
            5. Scan for broken backlinks
            6. Report findings with suggested fixes
            7. Log: `## [YYYY-MM-DD] lint | {summary of findings}`

            ## Conventions
            - Use [[Page Title]] for backlinks (Obsidian-compatible)
            - Slugs are lowercase-kebab-case: `attention-mechanism.md`
            - Source slugs match raw filename without date: `summary_karpathy-llm-wiki.md`
            - Dates in ISO format: 2026-04-17
            - When in doubt about categorization, prefer concepts/ over topics/
            - Topics are broader than concepts: "ML Fundamentals" is a topic, "Gradient Descent" is a concept
            - Entities include people, companies, tools/products, and organizations
            """;

        try
        {
            File.WriteAllText(schemaPath, content);
            logger.LogInformation("Created WIKI-SCHEMA.md");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not create WIKI-SCHEMA.md — skipping");
        }
    }

    private void GenerateIndexFile()
    {
        var indexPath = Path.Combine(VaultRoot, "index.md");
        if (File.Exists(indexPath)) return;
        if (!Directory.Exists(VaultRoot)) return;

        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var content = $"""
            ---
            title: Wiki Index
            updated: {today}
            ---

            # Protocol Knowledge Wiki — Index

            Master catalog of all wiki pages. Updated after every ingest.

            ## Entities
            <!-- People, companies, tools, products -->

            ## Concepts
            <!-- Ideas, techniques, patterns, algorithms -->

            ## Topics
            <!-- Broader topic syntheses -->

            ## Sources
            <!-- Summary pages for raw sources -->

            ## Syntheses
            <!-- Filed answers and analyses -->
            """;

        try
        {
            File.WriteAllText(indexPath, content);
            logger.LogInformation("Created index.md");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not create index.md — skipping");
        }
    }

    private void GenerateLogFile()
    {
        var logPath = Path.Combine(VaultRoot, "log.md");
        if (File.Exists(logPath)) return;
        if (!Directory.Exists(VaultRoot)) return;

        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var content = $"""
            # Protocol Wiki — Activity Log

            Append-only chronological record of all wiki activity.
            Format: `## [YYYY-MM-DD] action | description`

            ---

            ## [{today}] init | Vault initialized by Protocol app
            """;

        try
        {
            File.WriteAllText(logPath, content);
            logger.LogInformation("Created log.md");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not create log.md — skipping");
        }
    }
}
