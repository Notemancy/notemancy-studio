use axum::{
    body::Body,
    extract::State,
    http::{header, HeaderValue, StatusCode},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use tauri::Emitter;

use base64::Engine as _;
use mime_guess::from_path;

use notemancy_core::{config, fetch::Fetch, file_ops};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;

// Existing structs
#[derive(Serialize, Debug)]
struct PageResponse {
    content: String,
    metadata: Value,
}

#[derive(Serialize)]
struct TreeItem {
    title: String,
    link: Option<String>,
    children: Option<Vec<TreeItem>>,
}

// New request structs for web API
#[derive(Deserialize)]
struct UpdatePageRequest {
    content: String,
    path: Option<String>,
    virtual_path: Option<String>,
}

#[derive(Serialize, Debug)]
struct AttachmentResponse {
    content_type: String,
    data: String, // Base64 encoded data
}

// Shared state
struct AppState {
    fetch: Arc<Mutex<Fetch>>,
}

fn get_attachment_internal(fetch: &Fetch, virtual_path: String) -> Result<Response<Body>, String> {
    match fetch.get_attachment_content(&virtual_path) {
        Ok((content, content_type)) => Response::builder()
            .status(StatusCode::OK)
            .header(
                header::CONTENT_TYPE,
                HeaderValue::from_str(&content_type).map_err(|e| e.to_string())?,
            )
            .body(Body::from(content))
            .map_err(|e| e.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

async fn web_get_attachment(
    State(state): State<Arc<AppState>>,
    path: axum::extract::Path<String>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let fetch = state.fetch.lock().await;
    get_attachment_internal(&fetch, path.0).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// New web API handler for referencing notes
async fn web_get_referencing_notes(
    State(state): State<Arc<AppState>>,
    path: axum::extract::Path<String>,
) -> Json<Result<Vec<String>, String>> {
    let fetch = state.fetch.lock().await;
    let result = fetch
        .get_referencing_notes(&path.0)
        .map_err(|e| e.to_string());
    Json(result)
}

// Web API handlers for file tree and page content remain unchanged.
async fn web_get_file_tree(
    State(state): State<Arc<AppState>>,
) -> Json<Result<Vec<TreeItem>, String>> {
    let fetch = state.fetch.lock().await;
    let result = get_file_tree_internal(&fetch);
    Json(result)
}

async fn web_get_page_content(
    State(state): State<Arc<AppState>>,
    path: axum::extract::Path<String>,
) -> Json<Result<PageResponse, String>> {
    let fetch = state.fetch.lock().await;
    let result = get_page_content_internal(&fetch, path.0);
    Json(result)
}

async fn web_update_page_content(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdatePageRequest>,
) -> Json<Result<(), String>> {
    let result = update_page_content_internal(payload.content, payload.path, payload.virtual_path);
    Json(result)
}

// Core business logic
fn get_file_tree_internal(fetch: &Fetch) -> Result<Vec<TreeItem>, String> {
    let files = fetch.get_file_tree().map_err(|e| e.to_string())?;
    let mut root: Vec<TreeItem> = Vec::new();

    for file in files {
        let parts: Vec<&str> = file
            .virtual_path
            .split('/')
            .filter(|s| !s.is_empty())
            .collect();
        let mut current_level = &mut root;

        for (i, part) in parts.iter().enumerate() {
            let is_last = i == parts.len() - 1;
            let node_index = current_level.iter().position(|item| item.title == *part);

            if let Some(index) = node_index {
                if !is_last {
                    current_level = current_level[index].children.as_mut().unwrap();
                }
            } else if is_last {
                let mut title = part.to_string();
                if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&file.metadata) {
                    if let Some(meta_title) = meta.get("title").and_then(|t| t.as_str()) {
                        title = meta_title.to_string();
                    }
                }
                current_level.push(TreeItem {
                    title,
                    link: Some(file.virtual_path.clone()),
                    children: None,
                });
            } else {
                current_level.push(TreeItem {
                    title: part.to_string(),
                    link: None,
                    children: Some(Vec::new()),
                });
                current_level = current_level.last_mut().unwrap().children.as_mut().unwrap();
            }
        }
    }

    sort_tree(&mut root);
    Ok(root)
}

fn get_page_content_internal(fetch: &Fetch, virtual_path: String) -> Result<PageResponse, String> {
    let path_to_use = if virtual_path.is_empty() {
        "home.md"
    } else {
        &virtual_path
    };

    match fetch.get_page_content(path_to_use) {
        Ok(page_content) => {
            let metadata_json = if page_content.metadata.trim().is_empty() {
                serde_json::json!({})
            } else {
                serde_json::from_str(&page_content.metadata)
                    .map_err(|e| format!("Failed to parse metadata JSON: {}", e))?
            };
            Ok(PageResponse {
                content: page_content.content,
                metadata: metadata_json,
            })
        }
        Err(e) => Err(e.to_string()),
    }
}

fn update_page_content_internal(
    content: String,
    path: Option<String>,
    virtual_path: Option<String>,
) -> Result<(), String> {
    file_ops::update_markdown_file(&content, path.as_deref(), virtual_path.as_deref())
        .map_err(|e| e.to_string())
}

struct FetchState(Fetch);

// Tauri commands
#[tauri::command]
async fn get_file_tree(state: tauri::State<'_, FetchState>) -> Result<Vec<TreeItem>, String> {
    get_file_tree_internal(&state.0)
}

#[tauri::command]
async fn get_page_content(
    state: tauri::State<'_, FetchState>,
    virtual_path: String,
) -> Result<PageResponse, String> {
    get_page_content_internal(&state.0, virtual_path)
}

#[tauri::command]
async fn update_page_content(
    app: tauri::AppHandle,
    content: String,
    path: Option<String>,
    virtual_path: Option<String>,
) -> Result<(), String> {
    app.emit("file-saving", ()).map_err(|e| e.to_string())?;
    let result = update_page_content_internal(content, path, virtual_path);
    if result.is_ok() {
        app.emit("file-saved", ()).map_err(|e| e.to_string())?;
    }
    result
}

#[tauri::command]
async fn get_referencing_notes(
    state: tauri::State<'_, FetchState>,
    target_virtual_path: String,
) -> Result<Vec<String>, String> {
    state
        .0
        .get_referencing_notes(&target_virtual_path)
        .map_err(|e| e.to_string())
}

fn sort_tree(nodes: &mut [TreeItem]) {
    nodes.sort_by(|a, b| a.title.cmp(&b.title));
    for node in nodes.iter_mut() {
        if let Some(ref mut children) = node.children {
            sort_tree(children);
        }
    }
}

#[tokio::main]
async fn main() {
    // Create two separate Fetch instances
    let tauri_fetch = setup_environment().expect("Failed to setup environment");
    let web_fetch = setup_environment().expect("Failed to setup environment");

    // Set up web server state
    let app_state = Arc::new(AppState {
        fetch: Arc::new(Mutex::new(web_fetch)),
    });

    let api_router = Router::new()
        .route("/api/file-tree", get(web_get_file_tree))
        .route("/api/page/:path", get(web_get_page_content))
        .route("/api/page", post(web_update_page_content))
        .route("/api/attachment/:path", get(web_get_attachment))
        // New endpoint for referencing notes
        .route(
            "/api/referencing-notes/:path",
            get(web_get_referencing_notes),
        )
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // Start web server in a separate task
    tokio::spawn(async move {
        let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 3001));
        println!("Starting web server on {}", addr);
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, api_router).await.unwrap();
    });

    // Start Tauri application
    tauri::Builder::default()
        .manage(FetchState(tauri_fetch))
        .invoke_handler(tauri::generate_handler![
            get_page_content,
            get_file_tree,
            update_page_content,
            get_referencing_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(feature = "test-env")]
fn setup_environment() -> Result<Fetch, Box<dyn std::error::Error>> {
    test_utils::setup_test_env(100)?;
    let config = config::load_config()?;
    println!("Test Config loaded: {:?}", config);
    let scanner = Scanner::from_config()?;
    let md_files = scanner.scan_markdown_files()?;
    println!("Scanned {} markdown files in test mode", md_files.len());
    let fetch = Fetch::new()?;
    Ok(fetch)
}

#[cfg(not(feature = "test-env"))]
fn setup_environment() -> Result<Fetch, Box<dyn std::error::Error>> {
    let config = config::load_config()?;
    println!("Config loaded: {:?}", config);
    let fetch = Fetch::new()?;
    Ok(fetch)
}
