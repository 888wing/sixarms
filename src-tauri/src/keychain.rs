#[cfg(target_os = "macos")]
use security_framework::passwords::{delete_generic_password, get_generic_password, set_generic_password};

const SERVICE_NAME: &str = "com.sixarms.app";
const ACCOUNT_NAME: &str = "grok_api_key";

pub struct Keychain;

impl Keychain {
    pub fn new() -> Self {
        Keychain
    }

    #[cfg(target_os = "macos")]
    pub fn save_api_key(&self, key: &str) -> Result<(), String> {
        // Try to delete existing key first (ignore errors)
        let _ = delete_generic_password(SERVICE_NAME, ACCOUNT_NAME);

        set_generic_password(SERVICE_NAME, ACCOUNT_NAME, key.as_bytes())
            .map_err(|e| format!("Failed to save API key: {}", e))
    }

    #[cfg(target_os = "macos")]
    pub fn get_api_key(&self) -> Result<Option<String>, String> {
        match get_generic_password(SERVICE_NAME, ACCOUNT_NAME) {
            Ok(data) => {
                let key = String::from_utf8(data)
                    .map_err(|e| format!("Invalid UTF-8 in stored key: {}", e))?;
                Ok(Some(key))
            }
            Err(e) => {
                // Item not found is not an error
                if e.code() == -25300 {
                    Ok(None)
                } else {
                    Err(format!("Failed to get API key: {}", e))
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    pub fn delete_api_key(&self) -> Result<(), String> {
        delete_generic_password(SERVICE_NAME, ACCOUNT_NAME)
            .map_err(|e| format!("Failed to delete API key: {}", e))
    }

    // Fallback implementations for non-macOS platforms
    #[cfg(not(target_os = "macos"))]
    pub fn save_api_key(&self, _key: &str) -> Result<(), String> {
        Err("Keychain is only supported on macOS".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    pub fn get_api_key(&self) -> Result<Option<String>, String> {
        Err("Keychain is only supported on macOS".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    pub fn delete_api_key(&self) -> Result<(), String> {
        Err("Keychain is only supported on macOS".to_string())
    }
}

impl Default for Keychain {
    fn default() -> Self {
        Self::new()
    }
}
