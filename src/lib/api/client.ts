import { browser } from '$app/environment';

export interface PageContent {
  content: string;
  metadata: Record<string, unknown>;
}

export interface TreeItem {
  title: string;
  link?: string | null;
  children?: TreeItem[] | null;
}

function isTauriEnvironment(): boolean {
  return browser && 'window' in globalThis && '__TAURI_INTERNALS__' in window;
}

class TauriClient {
  async getPageContent(virtualPath: string): Promise<PageContent> {
    const { invoke } = await import('@tauri-apps/api/core');
    const response = await invoke('get_page_content', { virtualPath });
    return this.normalizeResponse(response);
  }

  async getFileTree(): Promise<TreeItem[]> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_file_tree');
  }

  async updatePageContent(content: string, path: string | null, virtualPath: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('update_page_content', { content, path, virtualPath });
  }

  async getReferencingNotes(targetVirtualPath: string): Promise<string[]> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_referencing_notes', { targetVirtualPath });
  }

  private normalizeResponse(response: unknown): PageContent {
    if (typeof response === 'object' && response !== null) {
      const typedResponse = response as { content: string; metadata: unknown };
      return {
        content: typedResponse.content,
        metadata:
          typeof typedResponse.metadata === 'string'
            ? JSON.parse(typedResponse.metadata)
            : (typedResponse.metadata as Record<string, unknown>),
      };
    }
    throw new Error('Unexpected response format');
  }
}

class WebClient {
  private baseUrl = 'http://localhost:3001/api';

  async getPageContent(virtualPath: string): Promise<PageContent> {
    try {
      const url = `${this.baseUrl}/page/${encodeURIComponent(virtualPath)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const rawText = await response.text();
      if (!rawText.trim().startsWith('{') && !rawText.trim().startsWith('[')) {
        throw new Error('Response is not JSON format');
      }
      const result = JSON.parse(rawText);
      const content = result.Ok || result;
      return this.normalizeResponse(content);
    } catch (error) {
      console.error('getPageContent error:', error);
      throw error;
    }
  }

  private normalizeResponse(response: unknown): PageContent {
    if (typeof response === 'object' && response !== null) {
      const typedResponse = response as { content: string; metadata: unknown };
      return {
        content: typedResponse.content || '',
        metadata:
          typeof typedResponse.metadata === 'string'
            ? JSON.parse(typedResponse.metadata)
            : (typedResponse.metadata as Record<string, unknown>) || {},
      };
    }
    throw new Error('Unexpected response format');
  }

  async getFileTree(): Promise<TreeItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/file-tree`);
      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Failed to parse text:', rawText);
        throw new Error(`Invalid JSON response: ${e.message}`);
      }
      return result.Ok || result;
    } catch (error) {
      console.error('getFileTree error:', error);
      throw error;
    }
  }

  async updatePageContent(content: string, path: string | null, virtualPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, path, virtualPath }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async getReferencingNotes(targetVirtualPath: string): Promise<string[]> {
    const url = `${this.baseUrl}/referencing-notes/${encodeURIComponent(targetVirtualPath)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawText = await response.text();
    if (!rawText.trim().startsWith('{') && !rawText.trim().startsWith('[')) {
      throw new Error('Response is not JSON format');
    }
    const result = JSON.parse(rawText);
    return result.Ok || result;
  }
}

// Create and export the appropriate client instance
export const api = isTauriEnvironment() ? new TauriClient() : new WebClient();
