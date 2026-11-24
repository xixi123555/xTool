import { del, get, post } from '../lib/http';

export interface McpKeyItem {
  id: number;
  mask: string;
  created_at?: string;
}

interface McpKeyResponse {
  success: boolean;
  keys?: McpKeyItem[];
  mcpKey?: { id: number; key: string; mask: string; created_at?: string };
  error?: string;
}

export function fetchMcpKeys(): Promise<McpKeyResponse> {
  return get('/mcpkey/all');
}

export function generateMcpKey(): Promise<McpKeyResponse> {
  return post('/mcpkey/generate', {});
}

export function deleteMcpKey(id: number): Promise<McpKeyResponse> {
  return del(`/mcpkey/delete/${id}`);
}
