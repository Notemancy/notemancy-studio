use notemancy_core::{config, fetch::Fetch, file_ops};
use serde::Serialize;
use serde_json::Value;
use tauri::Emitter;
use tauri::State;

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

struct FetchState(Fetch);

#[tauri::command]
async fn get_file_tree(state: State<'_, FetchState>) -> Result<Vec<TreeItem>, String> {
    // Get files from database
    let files = state.0.get_file_tree().map_err(|e| e.to_string())?;

    // Build tree structure
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

            // Try to find existing node
            let node_index = current_level.iter().position(|item| item.title == *part);

            if let Some(index) = node_index {
                // Node exists, move to its children
                if !is_last {
                    current_level = current_level[index].children.as_mut().unwrap();
                }
            } else {
                // Create new node
                if is_last {
                    // File node
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
                    // Folder node
                    let new_node = TreeItem {
                        title: part.to_string(),
                        link: None,
                        children: Some(Vec::new()),
                    };
                    current_level.push(new_node);
                    current_level = current_level.last_mut().unwrap().children.as_mut().unwrap();
                }
            }
        }
    }

    // Sort tree recursively
    sort_tree(&mut root);
    Ok(root)
}

fn sort_tree(nodes: &mut [TreeItem]) {
    nodes.sort_by(|a, b| a.title.cmp(&b.title));
    for node in nodes.iter_mut() {
        if let Some(ref mut children) = node.children {
            sort_tree(children);
        }
    }
}

#[cfg(feature = "test-env")]
fn setup_environment() -> Result<Fetch, Box<dyn std::error::Error>> {
    // Only for testing: setup test environment
    test_utils::setup_test_env(100)?;
    let config = config::load_config()?;
    println!("Test Config loaded: {:?}", config);
    // Optionally, run a scanner or other test-specific code here.
    let scanner = Scanner::from_config()?;
    let md_files = scanner.scan_markdown_files()?;
    println!("Scanned {} markdown files in test mode", md_files.len());
    let fetch = Fetch::new()?;
    Ok(fetch)
}

#[cfg(not(feature = "test-env"))]
fn setup_environment() -> Result<Fetch, Box<dyn std::error::Error>> {
    // Normal production environment setup
    let config = config::load_config()?;
    println!("Config loaded: {:?}", config);
    // You can choose to omit scanning or perform production-specific tasks.
    let fetch = Fetch::new()?;
    Ok(fetch)
}

#[tauri::command]
async fn get_page_content(
    state: State<'_, FetchState>,
    virtual_path: String,
) -> Result<PageResponse, String> {
    let path_to_use = if virtual_path.is_empty() {
        "home.md"
    } else {
        &virtual_path
    };

    println!("Fetching content for path: {}", path_to_use);

    match state.0.get_page_content(path_to_use) {
        Ok(page_content) => {
            println!("Raw metadata string: '{}'", page_content.metadata);

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
        Err(e) => {
            eprintln!("Error fetching content: {:?}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
async fn update_page_content(
    app: tauri::AppHandle,
    content: String,
    path: Option<String>,
    virtual_path: Option<String>,
) -> Result<(), String> {
    // Notify the frontend that saving has started.
    app.emit("file-saving", ()).map_err(|e| e.to_string())?;

    // Use our file module to update the markdown file.
    let result = file_ops::update_markdown_file(&content, path.as_deref(), virtual_path.as_deref());
    match result {
        Ok(()) => {
            // Emit success event
            app.emit("file-saved", ()).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

fn main() {
    // Initialize environment and get Fetch instance
    let fetch = setup_environment().expect("Failed to setup environment");

    tauri::Builder::default()
        .manage(FetchState(fetch))
        .invoke_handler(tauri::generate_handler![
            get_page_content,
            get_file_tree,
            update_page_content
        ]) // Add get_file_tree
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
