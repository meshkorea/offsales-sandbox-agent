use std::sync::Arc;

use tokio::sync::Mutex;

use crate::desktop_types::{DesktopResolution, DesktopStreamStatusResponse};

#[derive(Debug, Clone)]
pub struct DesktopStreamingManager {
    inner: Arc<Mutex<DesktopStreamingState>>,
}

#[derive(Debug, Default)]
struct DesktopStreamingState {
    active: bool,
    display: Option<String>,
    resolution: Option<DesktopResolution>,
}

impl DesktopStreamingManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(DesktopStreamingState::default())),
        }
    }

    /// Mark desktop streaming as active for the given display and resolution.
    ///
    /// The actual GStreamer pipeline is created per-WebSocket-session in the
    /// signaling handler — this method just records that streaming is enabled.
    pub async fn start(
        &self,
        display: &str,
        resolution: DesktopResolution,
    ) -> DesktopStreamStatusResponse {
        let mut state = self.inner.lock().await;

        if state.active {
            return DesktopStreamStatusResponse { active: true };
        }

        state.active = true;
        state.display = Some(display.to_string());
        state.resolution = Some(resolution);

        DesktopStreamStatusResponse { active: true }
    }

    /// Stop streaming and clear state.
    pub async fn stop(&self) -> DesktopStreamStatusResponse {
        let mut state = self.inner.lock().await;
        state.active = false;
        state.display = None;
        state.resolution = None;
        DesktopStreamStatusResponse { active: false }
    }

    pub async fn is_active(&self) -> bool {
        self.inner.lock().await.active
    }

    pub async fn resolution(&self) -> Option<DesktopResolution> {
        self.inner.lock().await.resolution.clone()
    }

    pub async fn display_name(&self) -> Option<String> {
        self.inner.lock().await.display.clone()
    }
}
