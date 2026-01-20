/**
 * Shared types for MCP servers
 */

/** Standard MCP tool response content item */
export interface MCPContentItem {
  type: string;
  text: string;
}

/** Standard MCP tool response - includes index signature for SDK compatibility */
export interface MCPToolResponse {
  [x: string]: unknown;
  content: MCPContentItem[];
  isError?: boolean;
}

/** Helper to create a successful text response */
export function textResponse(text: string): MCPToolResponse {
  return {
    content: [{ type: 'text', text }],
  };
}

/** Helper to create an error response */
export function errorResponse(message: string): MCPToolResponse {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}
