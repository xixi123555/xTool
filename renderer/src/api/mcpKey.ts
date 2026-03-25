/**
 * MCP Key API
 */
import { get, post, del } from '../utils/http';

export interface McpKeyItem {
  id: number;
  mask: string;
  created_at?: Date;
}

export interface McpKeyGenerateResponse {
  success: boolean;
  mcpKey?: {
    id: number;
    key: string; // 明文只返回一次
    mask: string;
    created_at?: Date;
  };
  error?: string;
}

export interface McpKeyListResponse {
  success: boolean;
  keys?: McpKeyItem[];
  error?: string;
}

export interface McpKeyDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function generateMcpKey(): Promise<McpKeyGenerateResponse> {
  // generate 接口不需要 body
  return post<McpKeyGenerateResponse>('/mcpkey/generate', {});
}

export async function getAllMcpKeys(): Promise<McpKeyListResponse> {
  return get<McpKeyListResponse>('/mcpkey/all');
}

export async function deleteMcpKey(id: number): Promise<McpKeyDeleteResponse> {
  return del<McpKeyDeleteResponse>(`/mcpkey/delete/${id}`);
}

