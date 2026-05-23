use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

const MCP_SERVER_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../mcp/server.js");
const MCP_PORT: u16 = 7531;

struct McpProcess(Mutex<Option<Child>>);

fn spawn_mcp() -> std::io::Result<Child> {
    Command::new("node")
        .args([
            MCP_SERVER_PATH,
            "--http",
            &format!("--port={MCP_PORT}"),
        ])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let child = spawn_mcp()
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
