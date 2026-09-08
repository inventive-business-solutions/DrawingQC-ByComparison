using System.Text.Json;
using Npgsql;

namespace DrawingQC.Web;

/// <summary>
/// Optional PostgreSQL backing store for the whole app. It is a drop-in, opt-in layer:
///   • No connection string configured  -> Db.Enabled is false and every feature keeps using the
///     existing file-based storage (users.json, ConsList manifests, etc.). Nothing changes locally.
///   • SUPPORTAUTOMATION_DB set (a shared server) -> the schema is created and, on the very first
///     run, the existing JSON data (accounts + ConsList metadata) is imported so nothing is lost.
///
/// Large Excel/PDF blobs stay on disk; the database holds the metadata and run history that a team
/// needs to share. The connection string is read from the SUPPORTAUTOMATION_DB environment variable,
/// e.g. "Host=localhost;Port=5432;Database=supportautomation;Username=sa_app;Password=…".
/// </summary>
public static class Db
{
    private static readonly string? ConnString = Environment.GetEnvironmentVariable("SUPPORTAUTOMATION_DB");

    /// <summary>True when a PostgreSQL connection string is configured; otherwise the app stays file-based.</summary>
    public static bool Enabled => !string.IsNullOrWhiteSpace(ConnString);

    public static NpgsqlConnection Open()
    {
        var con = new NpgsqlConnection(ConnString);
        con.Open();
        return con;
    }

    private static string DataDir()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        if (string.IsNullOrWhiteSpace(appData)) appData = AppContext.BaseDirectory;
        return Path.Combine(appData, "SupportAutomation");
    }

    // Full whole-app schema: accounts, settings, ConsList metadata, and per-tool run history.
    private const string SchemaSql = @"
CREATE TABLE IF NOT EXISTS users (
    id                    TEXT PRIMARY KEY,
    username              TEXT NOT NULL,
    email                 TEXT NOT NULL,
    name                  TEXT NOT NULL DEFAULT '',
    role                  TEXT NOT NULL DEFAULT 'User',
    password_hash         TEXT NOT NULL,
    salt                  TEXT NOT NULL,
    avatar                TEXT,
    security_question     TEXT,
    security_answer_hash  TEXT,
    security_answer_salt  TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email    ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (lower(username));

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conslist_projects (
    name TEXT PRIMARY KEY,
    ord  INT NOT NULL DEFAULT 0
);

-- Per platform+category state. category is Internal | External | Combined.
CREATE TABLE IF NOT EXISTS conslist_category (
    platform        TEXT NOT NULL,
    category        TEXT NOT NULL,
    excel_rev       INT  NOT NULL DEFAULT 0,
    pdf_rev         INT  NOT NULL DEFAULT 0,
    last_excel_date TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (platform, category)
);

-- One row per uploaded file (its bytes live on disk under sources\<id><ext>).
CREATE TABLE IF NOT EXISTS conslist_files (
    id         TEXT PRIMARY KEY,
    platform   TEXT NOT NULL,
    category   TEXT NOT NULL,   -- Internal | External
    kind       TEXT NOT NULL,   -- excel | pdf
    ext        TEXT NOT NULL,
    file_date  TEXT NOT NULL,   -- dd-MM-yyyy
    name       TEXT NOT NULL,
    cnt        INT  NOT NULL DEFAULT 0,
    ord        INT  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conslist_files_pc ON conslist_files (platform, category, kind, ord);

-- Per-tool run history (who ran what, when, and the result summary).
CREATE TABLE IF NOT EXISTS qc_runs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_name TEXT,
    total       INT, matched INT, unmatched INT, duplicate INT,
    report_name TEXT
);

CREATE TABLE IF NOT EXISTS tagreport_runs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    total       INT, delivered INT, pending INT, done_files INT,
    sheet       TEXT, column_name TEXT, report_name TEXT
);

CREATE TABLE IF NOT EXISTS booklet_runs (
    id            TEXT PRIMARY KEY,
    user_id       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    template_name TEXT, excel_name TEXT, drawings_name TEXT, bom_name TEXT,
    output_name   TEXT, rev TEXT, doc_date TEXT, size_mb DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS mto_runs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    summary    TEXT
);
";

    /// <summary>Create the schema and import existing JSON data on first run. No-op when not configured.</summary>
    public static void Init()
    {
        if (!Enabled)
        {
            Console.WriteLine("[Db] SUPPORTAUTOMATION_DB not set — using local file storage.");
            return;
        }
        using var con = Open();
        using (var cmd = new NpgsqlCommand(SchemaSql, con)) cmd.ExecuteNonQuery();
        Console.WriteLine("[Db] PostgreSQL connected; schema ready.");
        ImportFromJsonIfEmpty(con);
    }

    // timestamptz columns require a UTC DateTime under Npgsql; normalise whatever the JSON gave us.
    private static DateTime Utc(DateTime d) => d.Kind switch
    {
        DateTimeKind.Utc => d,
        DateTimeKind.Local => d.ToUniversalTime(),
        _ => DateTime.SpecifyKind(d, DateTimeKind.Utc),
    };

    private static long Count(NpgsqlConnection con, string table)
    {
        using var cmd = new NpgsqlCommand($"SELECT count(*) FROM {table}", con);
        return Convert.ToInt64(cmd.ExecuteScalar() ?? 0L);
    }

    private static void Exec(NpgsqlConnection con, string sql, params (string name, object value)[] ps)
    {
        using var cmd = new NpgsqlCommand(sql, con);
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    // One-time migration of the existing on-disk JSON into the database (only when the DB is empty).
    private static void ImportFromJsonIfEmpty(NpgsqlConnection con)
    {
        if (Count(con, "users") > 0 || Count(con, "conslist_projects") > 0) return; // already populated
        var dir = DataDir();
        int users = 0, files = 0, projects = 0;

        // Accounts
        var usersFile = Path.Combine(dir, "users.json");
        if (File.Exists(usersFile))
        {
            List<UserAccount> list;
            try { list = JsonSerializer.Deserialize<List<UserAccount>>(File.ReadAllText(usersFile)) ?? new(); }
            catch { list = new(); }
            foreach (var u in list)
            {
                Exec(con, @"INSERT INTO users(id,username,email,name,role,password_hash,salt,avatar,security_question,security_answer_hash,security_answer_salt,created_at)
                            VALUES(@id,@un,@em,@nm,@ro,@ph,@sa,@av,@sq,@sah,@sas,@ca) ON CONFLICT (id) DO NOTHING",
                    ("id", u.Id), ("un", u.Username), ("em", u.Email), ("nm", u.Name), ("ro", u.Role),
                    ("ph", u.PasswordHash), ("sa", u.Salt), ("av", (object?)u.Avatar ?? DBNull.Value),
                    ("sq", (object?)u.SecurityQuestion ?? DBNull.Value), ("sah", (object?)u.SecurityAnswerHash ?? DBNull.Value),
                    ("sas", (object?)u.SecurityAnswerSalt ?? DBNull.Value), ("ca", Utc(u.CreatedAt)));
                users++;
            }
        }

        // Settings (registration toggle)
        var settingsFile = Path.Combine(dir, "settings.json");
        if (File.Exists(settingsFile))
        {
            try
            {
                using var d = JsonDocument.Parse(File.ReadAllText(settingsFile));
                if (d.RootElement.TryGetProperty("RegistrationOpen", out var ro))
                    Exec(con, "INSERT INTO settings(key,value) VALUES('RegistrationOpen',@v) ON CONFLICT (key) DO UPDATE SET value=excluded.value",
                        ("v", ro.GetBoolean() ? "true" : "false"));
            }
            catch { }
        }

        // ConsList projects + per-file metadata
        var cl = Path.Combine(dir, "ConsList");
        var projFile = Path.Combine(cl, "projects.json");
        if (File.Exists(projFile))
        {
            List<string> projs;
            try { projs = JsonSerializer.Deserialize<List<string>>(File.ReadAllText(projFile)) ?? new(); }
            catch { projs = new(); }
            for (int i = 0; i < projs.Count; i++)
            {
                Exec(con, "INSERT INTO conslist_projects(name,ord) VALUES(@n,@o) ON CONFLICT (name) DO NOTHING", ("n", projs[i]), ("o", i));
                projects++;
            }
            foreach (var plat in projs)
            {
                foreach (var cat in new[] { "Internal", "External" })
                {
                    var mf = Path.Combine(cl, plat, cat, "manifest.json");
                    if (!File.Exists(mf)) continue;
                    CatManifest m;
                    try { m = JsonSerializer.Deserialize<CatManifest>(File.ReadAllText(mf)) ?? new(); }
                    catch { continue; }
                    Exec(con, @"INSERT INTO conslist_category(platform,category,excel_rev,pdf_rev,last_excel_date)
                                VALUES(@p,@c,@er,@pr,@d) ON CONFLICT (platform,category) DO NOTHING",
                        ("p", plat), ("c", cat), ("er", m.ExcelRev), ("pr", m.PdfRev), ("d", m.LastExcelDate ?? ""));
                    int ord = 0;
                    foreach (var e in m.ExcelEntries) { InsertFile(con, plat, cat, "excel", e, ord++); files++; }
                    ord = 0;
                    foreach (var e in m.PdfEntries) { InsertFile(con, plat, cat, "pdf", e, ord++); files++; }
                }
                // Combined-download revisions
                var cj = Path.Combine(cl, plat, "_combined.json");
                if (File.Exists(cj))
                {
                    try
                    {
                        using var d = JsonDocument.Parse(File.ReadAllText(cj));
                        int er = d.RootElement.TryGetProperty("ExcelRev", out var e1) ? e1.GetInt32() : 0;
                        int pr = d.RootElement.TryGetProperty("PdfRev", out var p1) ? p1.GetInt32() : 0;
                        Exec(con, @"INSERT INTO conslist_category(platform,category,excel_rev,pdf_rev,last_excel_date)
                                    VALUES(@p,'Combined',@er,@pr,'') ON CONFLICT (platform,category) DO NOTHING",
                            ("p", plat), ("er", er), ("pr", pr));
                    }
                    catch { }
                }
            }
        }
        Console.WriteLine($"[Db] Imported from JSON: {users} user(s), {projects} project(s), {files} ConsList file(s).");
    }

    private static void InsertFile(NpgsqlConnection con, string plat, string cat, string kind, ConsEntry e, int ord)
    {
        if (string.IsNullOrEmpty(e.Id)) e.Id = Guid.NewGuid().ToString("N");
        if (string.IsNullOrEmpty(e.Ext)) e.Ext = kind == "pdf" ? ".pdf" : ".xlsx";
        Exec(con, @"INSERT INTO conslist_files(id,platform,category,kind,ext,file_date,name,cnt,ord)
                    VALUES(@id,@p,@c,@k,@x,@d,@n,@ct,@o) ON CONFLICT (id) DO NOTHING",
            ("id", e.Id), ("p", plat), ("c", cat), ("k", kind), ("x", e.Ext),
            ("d", e.Date), ("n", e.Name), ("ct", e.Count), ("o", ord));
    }
}
