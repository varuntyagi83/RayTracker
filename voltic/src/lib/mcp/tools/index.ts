/**
 * MCP Tools barrel — re-exports tool metadata and the method dispatcher
 * from the co-located API route tools definition.
 *
 * This file exists so external modules (e.g. tests, future SDK wrappers)
 * can import tool definitions without pulling in Next.js route machinery.
 */

export { TOOL_LIST, handleMcpMethod } from "@/app/api/mcp/tools";
