use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const MCP_SERVER_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../mcp/server.js");
const BRIDGE_DEV_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../bridge/bridge.js");
const MCP_PORT: u16 = 7531;
const DB_FILE: &str = "nabu.db";
const SETTINGS_DB_URL: &str = "sqlite:nabu.db";
const REMOTE_CATALOG_DIR: &str = "remote-catalog";

struct McpProcess(Mutex<Option<Child>>);

// Paths captured at setup so restart_mcp can respawn with the same env.
struct McpSpawnPaths {
    db_path: PathBuf,
    remote_dir: PathBuf,
    bundle: Option<BundleLayout>,
}

// Resolved paths inside the Tauri bundle's resource dir. Populated only
// in release builds where scripts/prepare-resources.mjs staged them.
#[derive(Clone)]
struct BundleLayout {
    mcp_binary: PathBuf,      // resources/nabu-mcp[.exe]
    bridge_binary: PathBuf,   // resources/nabu-bridge[.exe]
    bun_binary: PathBuf,      // resources/bun[.exe]
    embedded_dir: PathBuf,    // resources/embedded
    runner_script: PathBuf,   // resources/runner-runtime/run.js
    runner_cwd: PathBuf,      // resources/runner-runtime/
}

fn detect_bundle(resource_dir: Option<&PathBuf>) -> Option<BundleLayout> {
    let base = resource_dir?;
    // Tauri's bundle.resources glob "resources/**/*" preserves the
    // "resources/" prefix, so artefacts land at
    // Nabu.app/Contents/Resources/resources/{nabu-mcp,bun,...} on macOS
    // (and the equivalent on the other platforms). Fall back to <base>
    // directly if a future config drops the prefix.
    let candidates = [base.join("resources"), base.clone()];
    let exe_suffix = if cfg!(windows) { ".exe" } else { "" };
    for dir in candidates.iter() {
        let mcp = dir.join(format!("nabu-mcp{exe_suffix}"));
        let bridge = dir.join(format!("nabu-bridge{exe_suffix}"));
        let bun = dir.join(format!("bun{exe_suffix}"));
        let runner = dir.join("runner-runtime").join("run.js");
        let embedded = dir.join("embedded");
        if mcp.exists() && bun.exists() && runner.exists() && embedded.exists() {
            return Some(BundleLayout {
                mcp_binary: mcp,
                bridge_binary: bridge,
                bun_binary: bun,
                embedded_dir: embedded,
                runner_cwd: dir.join("runner-runtime"),
                runner_script: runner,
            });
        }
    }
    None
}

fn spawn_mcp(db_path: &PathBuf, remote_dir: &PathBuf, bundle: Option<&BundleLayout>) -> std::io::Result<Child> {
    match bundle {
        Some(b) => {
            // Packaged Tauri bundle: spawn the bun-compiled MCP binary
            // and point it at the bun runtime + runner script for jobs.
            Command::new(&b.mcp_binary)
                .args(["--http", &format!("--port={MCP_PORT}")])
                .env("NABU_DB_PATH", db_path)
                .env("NABU_REMOTE_CATALOG_DIR", remote_dir)
                .env("NABU_EMBEDDED_DIR", &b.embedded_dir)
                .env("NABU_RUNNER_PATH", &b.bun_binary)
                .env("NABU_RUNNER_SCRIPT", &b.runner_script)
                .env("NABU_RUNNER_CWD", &b.runner_cwd)
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .spawn()
        }
        None => {
            // Dev mode: spawn `node mcp/server.js` from the source tree.
            Command::new("node")
                .args([MCP_SERVER_PATH, "--http", &format!("--port={MCP_PORT}")])
                .env("NABU_DB_PATH", db_path)
                .env("NABU_REMOTE_CATALOG_DIR", remote_dir)
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit())
                .spawn()
        }
    }
}

// ---------------------------------------------------------------------------
// Playwright Chromium first-run installer
//
// The runner needs a Chromium binary. Playwright caches it at:
//   macOS:   ~/Library/Caches/ms-playwright/chromium-*/chrome-mac/Chromium.app
//   Linux:   ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
//   Windows: %USERPROFILE%\AppData\Local\ms-playwright\chromium-*\chrome-win\chrome.exe
//
// chromium_status returns whether any chromium-* dir exists with the
// expected binary inside. chromium_install runs the Playwright CLI
// (`bun runner-runtime/node_modules/playwright/cli.js install chromium`)
// and streams stdout lines back as Tauri events so the UI can show
// progress. Dev mode uses the system `npx playwright install chromium`.

fn playwright_browsers_dir() -> Option<PathBuf> {
    if let Ok(env) = std::env::var("PLAYWRIGHT_BROWSERS_PATH") {
        if !env.is_empty() && env != "0" {
            return Some(PathBuf::from(env));
        }
    }
    let home = dirs::home_dir()?;
    if cfg!(target_os = "macos") {
        Some(home.join("Library/Caches/ms-playwright"))
    } else if cfg!(target_os = "windows") {
        Some(home.join("AppData/Local/ms-playwright"))
    } else {
        Some(home.join(".cache/ms-playwright"))
    }
}

fn chromium_binary_path(browsers_dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(browsers_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if !name_str.starts_with("chromium-") || name_str.contains("headless_shell") {
            continue;
        }
        let candidate = if cfg!(target_os = "macos") {
            entry.path().join("chrome-mac/Chromium.app/Contents/MacOS/Chromium")
        } else if cfg!(target_os = "windows") {
            entry.path().join("chrome-win/chrome.exe")
        } else {
            entry.path().join("chrome-linux/chrome")
        };
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

#[derive(Serialize)]
struct ChromiumStatus {
    installed: bool,
    browsers_dir: Option<String>,
    binary: Option<String>,
}

#[tauri::command]
fn chromium_status() -> ChromiumStatus {
    let browsers_dir = playwright_browsers_dir();
    let binary = browsers_dir.as_ref().and_then(|d| chromium_binary_path(d));
    ChromiumStatus {
        installed: binary.is_some(),
        browsers_dir: browsers_dir.as_ref().map(|p| p.to_string_lossy().to_string()),
        binary: binary.as_ref().map(|p| p.to_string_lossy().to_string()),
    }
}

#[tauri::command]
async fn chromium_install(
    app: tauri::AppHandle,
    paths: tauri::State<'_, McpSpawnPaths>,
) -> Result<bool, String> {
    use std::io::{BufRead, BufReader};
    use tauri::Emitter;

    let bundle = paths.bundle.clone();
    let (program, args, cwd): (PathBuf, Vec<String>, Option<PathBuf>) = match bundle {
        Some(b) => {
            // Packaged: $RES/bun $RES/runner-runtime/node_modules/playwright/cli.js install chromium
            let cli = b
                .runner_cwd
                .join("node_modules/playwright/cli.js");
            (
                b.bun_binary,
                vec![
                    cli.to_string_lossy().to_string(),
                    "install".into(),
                    "chromium".into(),
                ],
                Some(b.runner_cwd),
            )
        }
        None => {
            // Dev: rely on system Node + the workspace's playwright.
            (
                PathBuf::from("npx"),
                vec!["playwright".into(), "install".into(), "chromium".into()],
                None,
            )
        }
    };

    let mut cmd = Command::new(&program);
    cmd.args(&args).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to spawn playwright install: {e}"))?;

    if let Some(stdout) = child.stdout.take() {
        let app = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let _ = app.emit("chromium-install-log", line);
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        let app = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let _ = app.emit("chromium-install-log", line);
            }
        });
    }

    let status = child
        .wait()
        .map_err(|e| format!("playwright install failed: {e}"))?;
    if !status.success() {
        return Err(format!(
            "playwright install exited with code {:?}",
            status.code()
        ));
    }
    Ok(true)
}

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create settings table",
        sql: "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL
              );",
        kind: MigrationKind::Up,
    }]
}

// ---------------------------------------------------------------------------
// Claude Desktop config integration
//
// Claude Desktop reads its MCP server list from a JSON file located at:
//   macOS:    ~/Library/Application Support/Claude/claude_desktop_config.json
//   Windows:  %APPDATA%/Claude/claude_desktop_config.json
//   Linux:    $XDG_CONFIG_HOME/Claude/claude_desktop_config.json
//             (typically ~/.config/Claude/claude_desktop_config.json)
//
// The shape we manage is:
//   { "mcpServers": { "nabu": { "command": "node", "args": [<bridge path>] } } }

#[derive(Serialize)]
struct ClaudeConfigStatus {
    os: String,
    config_path: String,
    config_exists: bool,
    bridge_path: String,
    installed: bool,
    current_entry: Option<Value>,
}

fn claude_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"));
    if cfg!(target_os = "macos") {
        let h = home.map_err(|_| "no HOME env var".to_string())?;
        Ok(PathBuf::from(h)
            .join("Library")
            .join("Application Support")
            .join("Claude")
            .join("claude_desktop_config.json"))
    } else if cfg!(target_os = "windows") {
        let appdata = std::env::var("APPDATA").map_err(|_| "no APPDATA env var".to_string())?;
        Ok(PathBuf::from(appdata)
            .join("Claude")
            .join("claude_desktop_config.json"))
    } else {
        let h = home.map_err(|_| "no HOME env var".to_string())?;
        let xdg = std::env::var("XDG_CONFIG_HOME").ok();
        let base = match xdg {
            Some(v) if !v.is_empty() => PathBuf::from(v),
            _ => PathBuf::from(h).join(".config"),
        };
        Ok(base.join("Claude").join("claude_desktop_config.json"))
    }
}

fn os_label() -> &'static str {
    if cfg!(target_os = "macos") {
        "macOS"
    } else if cfg!(target_os = "windows") {
        "Windows"
    } else if cfg!(target_os = "linux") {
        "Linux"
    } else {
        "unknown"
    }
}

fn read_config(path: &Path) -> Result<Value, String> {
    if !path.exists() {
        return Ok(json!({ "mcpServers": {} }));
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    if raw.trim().is_empty() {
        return Ok(json!({ "mcpServers": {} }));
    }
    serde_json::from_str(&raw).map_err(|e| format!("invalid JSON in {}: {}", path.display(), e))
}

fn nabu_entry(bundle: Option<&BundleLayout>) -> Value {
    match bundle {
        Some(b) if b.bridge_binary.exists() => json!({
            "command": b.bridge_binary.to_string_lossy(),
            "args": [],
        }),
        _ => json!({
            "command": "node",
            "args": [BRIDGE_DEV_PATH],
        }),
    }
}

fn bridge_path_str(bundle: Option<&BundleLayout>) -> String {
    match bundle {
        Some(b) if b.bridge_binary.exists() => b.bridge_binary.to_string_lossy().to_string(),
        _ => BRIDGE_DEV_PATH.to_string(),
    }
}

#[tauri::command]
fn claude_config_status(
    paths: tauri::State<'_, McpSpawnPaths>,
) -> Result<ClaudeConfigStatus, String> {
    let path = claude_config_path()?;
    let exists = path.exists();
    let config = if exists {
        read_config(&path)?
    } else {
        json!({ "mcpServers": {} })
    };
    let current = config
        .get("mcpServers")
        .and_then(|m| m.get("nabu"))
        .cloned();
    let bundle = paths.bundle.as_ref();
    let desired = nabu_entry(bundle);
    let installed = current.as_ref() == Some(&desired);
    Ok(ClaudeConfigStatus {
        os: os_label().to_string(),
        config_path: path.display().to_string(),
        config_exists: exists,
        bridge_path: bridge_path_str(bundle),
        installed,
        current_entry: current,
    })
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct InstallArgs {}

#[tauri::command]
fn claude_install(
    paths: tauri::State<'_, McpSpawnPaths>,
) -> Result<ClaudeConfigStatus, String> {
    let path = claude_config_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut config = read_config(&path)?;

    // Backup existing file once per change, suffix with .bak.<timestamp>.
    if path.exists() {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let backup = path.with_extension(format!("json.bak.{}", stamp));
        fs::copy(&path, &backup).map_err(|e| e.to_string())?;
    }

    let servers = config
        .as_object_mut()
        .ok_or_else(|| "config root is not an object".to_string())?
        .entry("mcpServers".to_string())
        .or_insert_with(|| json!({}));
    let servers_obj = servers
        .as_object_mut()
        .ok_or_else(|| "mcpServers is not an object".to_string())?;
    servers_obj.insert("nabu".to_string(), nabu_entry(paths.bundle.as_ref()));

    let serialized = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, serialized).map_err(|e| e.to_string())?;

    claude_config_status(paths)
}

#[tauri::command]
fn claude_uninstall(
    paths: tauri::State<'_, McpSpawnPaths>,
) -> Result<ClaudeConfigStatus, String> {
    let path = claude_config_path()?;
    if !path.exists() {
        return claude_config_status(paths);
    }
    let mut config = read_config(&path)?;
    if let Some(servers) = config
        .as_object_mut()
        .and_then(|m| m.get_mut("mcpServers"))
        .and_then(|m| m.as_object_mut())
    {
        servers.remove("nabu");
    }
    let serialized = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, serialized).map_err(|e| e.to_string())?;
    claude_config_status(paths)
}

#[tauri::command]
fn restart_mcp(
    proc: tauri::State<'_, McpProcess>,
    paths: tauri::State<'_, McpSpawnPaths>,
) -> Result<bool, String> {
    if let Some(mut child) = proc.0.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    // Give the OS a moment to release the listening port before respawning.
    std::thread::sleep(std::time::Duration::from_millis(400));
    let new_child = spawn_mcp(&paths.db_path, &paths.remote_dir, paths.bundle.as_ref())
        .map_err(|e| format!("failed to respawn MCP: {e}"))?;
    *proc.0.lock().unwrap() = Some(new_child);
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(SETTINGS_DB_URL, migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            claude_config_status,
            claude_install,
            claude_uninstall,
            restart_mcp,
            chromium_status,
            chromium_install,
        ])
        .setup(|app| {
            let data_dir = app
                .path()
                .app_config_dir()
                .expect("no app_config_dir available");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join(DB_FILE);
            let remote_dir = data_dir.join(REMOTE_CATALOG_DIR);
            std::fs::create_dir_all(&remote_dir).ok();

            // Tauri bundles ship the MCP binary + bun runtime + runner
            // JS + embedded catalog under the resource dir. In dev these
            // are missing and we fall back to spawning the source tree
            // via the host `node`.
            let resource_dir = app.path().resource_dir().ok();
            let bundle = detect_bundle(resource_dir.as_ref());

            let child = spawn_mcp(&db_path, &remote_dir, bundle.as_ref())
                .expect("failed to spawn Nabu MCP sidecar");
            app.manage(McpProcess(Mutex::new(Some(child))));
            app.manage(McpSpawnPaths {
                db_path: db_path.clone(),
                remote_dir: remote_dir.clone(),
                bundle,
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Some(state) = app_handle.try_state::<McpProcess>() {
                    if let Some(mut child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}
