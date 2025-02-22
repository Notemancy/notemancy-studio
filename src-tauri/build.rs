use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    // Run tauri's build script
    tauri_build::build();

    // Get the output directory where the binary will be created
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let debug_dir = out_dir.ancestors().nth(3).unwrap();
    let resources_dir = debug_dir.join("resources");

    // Create resources directory if it doesn't exist
    fs::create_dir_all(&resources_dir).unwrap();

    // Copy from src-tauri/resources to target/debug/resources
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let src_resources = PathBuf::from(&manifest_dir).join("resources");

    // Copy all dylib files
    for entry in fs::read_dir(&src_resources).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "dylib") {
            let file_name = path.file_name().unwrap();
            let target_path = resources_dir.join(file_name);
            fs::copy(&path, &target_path).unwrap_or_else(|e| {
                println!("cargo:warning=Failed to copy {}: {}", path.display(), e);
                0
            });
        }
    }

    // Set multiple rpaths to cover different scenarios
    println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/resources");
    println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../resources");
    println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Resources");

    // Add both resource directories to the search path
    println!("cargo:rustc-link-search=native={}", resources_dir.display());
    println!("cargo:rustc-link-search=native={}", src_resources.display());

    // Print debug information
    println!(
        "cargo:warning=Source resources directory: {}",
        src_resources.display()
    );
    println!(
        "cargo:warning=Target resources directory: {}",
        resources_dir.display()
    );
}
