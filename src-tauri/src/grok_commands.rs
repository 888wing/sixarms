use tauri::State;
use crate::grok::{ChatHistoryItem, GrokClient, GrokMessage};
use crate::keychain::Keychain;

#[tauri::command]
pub async fn set_api_key(grok: State<'_, GrokClient>, keychain: State<'_, Keychain>, key: String) -> Result<(), String> {
    // Save to keychain
    keychain.save_api_key(&key)?;

    // Set in client
    grok.set_api_key(key).await;

    Ok(())
}

#[tauri::command]
pub async fn has_api_key(grok: State<'_, GrokClient>) -> Result<bool, String> {
    Ok(grok.has_api_key().await)
}

#[tauri::command]
pub async fn delete_api_key(keychain: State<'_, Keychain>) -> Result<(), String> {
    keychain.delete_api_key()
}

#[tauri::command]
pub async fn chat_with_grok(
    grok: State<'_, GrokClient>,
    message: String,
    project_context: Option<String>,
) -> Result<String, String> {
    grok.chat_with_context(&message, project_context.as_deref()).await
}

#[tauri::command]
pub async fn chat_with_grok_history(
    grok: State<'_, GrokClient>,
    message: String,
    history: Vec<ChatHistoryItem>,
    project_context: Option<String>,
    max_history_tokens: Option<usize>,
) -> Result<String, String> {
    let max_tokens = max_history_tokens.unwrap_or(4000);
    grok.chat_with_history(
        &message,
        history,
        project_context.as_deref(),
        max_tokens,
    ).await
}

#[tauri::command]
pub async fn classify_with_grok(
    grok: State<'_, GrokClient>,
    files_changed: String,
    diff_summary: String,
) -> Result<String, String> {
    grok.classify_changes(&files_changed, &diff_summary).await
}

#[tauri::command]
pub async fn generate_summary_with_grok(
    grok: State<'_, GrokClient>,
    files_changed: String,
    context: String,
) -> Result<String, String> {
    grok.generate_summary(&files_changed, &context).await
}

#[tauri::command]
pub async fn send_grok_messages(
    grok: State<'_, GrokClient>,
    messages: Vec<GrokMessage>,
) -> Result<String, String> {
    grok.chat(messages).await
}
