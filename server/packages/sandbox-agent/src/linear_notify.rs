//! Linear comment notifier — ACP `agent_thought_chunk` 이벤트를 Linear 이슈 댓글로 전송
//!
//! 환경변수:
//! - `LINEAR_API_KEY`: Linear API key (없으면 비활성)
//! - `LINEAR_ISSUE_ID`: 댓글을 달 이슈 ID (없으면 비활성)
//!
//! `agent_thought_chunk` 이벤트가 들어오면 텍스트를 누적하고,
//! 일정 시간(DEBOUNCE) 동안 추가 chunk가 없으면 Linear에 댓글로 전송한다.

use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};

const DEBOUNCE_MS: u64 = 5_000;
const MIN_TEXT_LENGTH: usize = 30;

#[derive(Debug)]
struct Buffer {
    text: String,
    last_chunk_at: Instant,
}

#[derive(Debug, Clone)]
pub struct LinearNotifier {
    api_key: String,
    issue_id: String,
    client: reqwest::Client,
    buffer: Arc<Mutex<Option<Buffer>>>,
}

impl LinearNotifier {
    /// 환경변수에서 설정을 읽어 생성. 설정이 없으면 None.
    pub fn from_env() -> Option<Self> {
        let api_key = std::env::var("LINEAR_API_KEY").ok()?;
        let issue_id = std::env::var("LINEAR_ISSUE_ID").ok()?;

        if api_key.is_empty() || issue_id.is_empty() {
            return None;
        }

        tracing::info!(issue_id = %issue_id, "Linear notifier enabled");

        Some(Self {
            api_key,
            issue_id,
            client: reqwest::Client::new(),
            buffer: Arc::new(Mutex::new(None)),
        })
    }

    /// ACP envelope을 검사하여 `agent_thought_chunk`이면 버퍼에 누적한다.
    pub async fn on_envelope(&self, payload: &Value) {
        // session/update의 agent_thought_chunk만 처리
        let method = payload
            .pointer("/method")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if method != "session/update" {
            return;
        }

        // ACP envelope 구조: params.update.sessionUpdate (params 직접이 아님)
        let session_update = payload
            .pointer("/params/update/sessionUpdate")
            .or_else(|| payload.pointer("/params/sessionUpdate"))
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if session_update != "agent_thought_chunk" {
            return;
        }

        let text = payload
            .pointer("/params/update/content/text")
            .or_else(|| payload.pointer("/params/content/text"))
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if text.is_empty() {
            return;
        }

        let mut buf = self.buffer.lock().await;
        match buf.as_mut() {
            Some(b) => {
                b.text.push_str(text);
                b.last_chunk_at = Instant::now();
            }
            None => {
                *buf = Some(Buffer {
                    text: text.to_string(),
                    last_chunk_at: Instant::now(),
                });
                // 첫 chunk → debounce flush 태스크 시작
                let notifier = self.clone();
                tokio::spawn(async move {
                    notifier.debounce_flush().await;
                });
            }
        }
    }

    /// 디바운스: 마지막 chunk 이후 DEBOUNCE_MS 동안 추가가 없으면 전송
    async fn debounce_flush(&self) {
        loop {
            tokio::time::sleep(Duration::from_millis(DEBOUNCE_MS)).await;

            let mut buf = self.buffer.lock().await;
            let should_flush = buf
                .as_ref()
                .map(|b| b.last_chunk_at.elapsed() >= Duration::from_millis(DEBOUNCE_MS))
                .unwrap_or(false);

            if should_flush {
                let text = buf.take().map(|b| b.text).unwrap_or_default();
                drop(buf); // lock 해제 후 HTTP 호출

                if text.trim().len() >= MIN_TEXT_LENGTH {
                    self.post_comment(&text).await;
                }
                return;
            }
            // 아직 chunk가 계속 오고 있으면 다시 대기
        }
    }

    /// Linear GraphQL API로 댓글 전송
    async fn post_comment(&self, text: &str) {
        let body = format!(
            "💭 **Agent Reasoning**\n\n{}",
            text.trim()
        );

        let query = serde_json::json!({
            "query": "mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }",
            "variables": {
                "issueId": self.issue_id,
                "body": body,
            }
        });

        match self
            .client
            .post("https://api.linear.app/graphql")
            .header("Authorization", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&query)
            .send()
            .await
        {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    tracing::info!(
                        issue_id = %self.issue_id,
                        text_len = text.len(),
                        "Reasoning posted to Linear"
                    );
                } else {
                    let body = resp.text().await.unwrap_or_default();
                    tracing::warn!(
                        issue_id = %self.issue_id,
                        status = %status,
                        body = %body.chars().take(300).collect::<String>(),
                        "Linear API error"
                    );
                }
            }
            Err(err) => {
                tracing::warn!(
                    issue_id = %self.issue_id,
                    error = %err,
                    "Failed to post reasoning to Linear"
                );
            }
        }
    }
}
