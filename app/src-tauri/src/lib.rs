use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const MCP_SERVER_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../mcp/server.js");
const MCP_PORT: u16 = 7531;
const DB_FILE: &str = "nabu.db";
const SETTINGS_DB_URL: &str = "sqlite:nabu.db";

struct McpProcess(Mutex<Option<Child>>);

fn spawn_mcp(db_path: &PathBuf) -> std::io::Result<Child> {
    Command::new("node")
        .args([MCP_SERVER_PATH, "--http", &format!("--port={MCP_PORT}")])
        .env("NABU_DB_PATH", db_path)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(SETTINGS_DB_URL, migrations())
                .build(),
        )
        .setup(|app| {
            let data_dir = app
                .path()
                .app_config_dir()
                .expect("no app_config_dir available");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join(DB_FILE);

            let child = spawn_mcp(&db_path)
                .expect("failed to spawn Nabu MCP sidecar (is `node` on PATH?)");
            app.manage(McpProcess(Mutex::new(Some(child))));
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
