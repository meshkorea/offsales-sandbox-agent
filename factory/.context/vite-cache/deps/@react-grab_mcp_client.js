import "./chunk-V4OQ3NZ2.js";

// ../../../node_modules/.pnpm/@react-grab+mcp@0.1.27_@types+react@18.3.27_react@19.2.4/node_modules/@react-grab/mcp/dist/client.js
var DEFAULT_MCP_PORT = 4723;
var sendContextToServer = async (contextUrl, content, prompt) => {
  await fetch(contextUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, prompt })
  }).catch(() => {
  });
};
var createMcpPlugin = (options = {}) => {
  const port = options.port ?? DEFAULT_MCP_PORT;
  const contextUrl = `http://localhost:${port}/context`;
  return {
    name: "mcp",
    hooks: {
      onCopySuccess: (_elements, content) => {
        void sendContextToServer(contextUrl, [content]);
      },
      transformAgentContext: async (context) => {
        await sendContextToServer(contextUrl, context.content, context.prompt);
        return context;
      }
    }
  };
};
var isReactGrabApi = (value) => typeof value === "object" && value !== null && "registerPlugin" in value;
var attachMcpPlugin = () => {
  if (typeof window === "undefined") return;
  const plugin = createMcpPlugin();
  const attach = (api) => {
    api.registerPlugin(plugin);
  };
  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    attach(existingApi);
    return;
  }
  window.addEventListener(
    "react-grab:init",
    (event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      attach(event.detail);
    },
    { once: true }
  );
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};
attachMcpPlugin();
export {
  attachMcpPlugin,
  createMcpPlugin
};
//# sourceMappingURL=@react-grab_mcp_client.js.map
