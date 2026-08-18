import type {
  DraftPOListItem,
  DraftPODetail,
  DraftPOStatus,
  RestockPredictionItem,
  IngestionResult,
} from '../types/index';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Draft POs
  async getDraftPOs(status?: DraftPOStatus): Promise<DraftPOListItem[]> {
    const query = status ? `?status=${status}` : '';
    const res = await fetchJson<{ success: boolean; data: DraftPOListItem[] }>(`/draft-pos${query}`);
    return res.data;
  },

  async getDraftPODetail(id: string): Promise<DraftPODetail> {
    const res = await fetchJson<{ success: boolean; data: DraftPODetail }>(`/draft-pos/${id}`);
    return res.data;
  },

  async updateDraftPOStatus(id: string, status: DraftPOStatus): Promise<DraftPOListItem> {
    const res = await fetchJson<{ success: boolean; data: DraftPOListItem }>(`/draft-pos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },

  // Predictions
  async getPredictions(limit = 100): Promise<RestockPredictionItem[]> {
    const res = await fetchJson<{ success: boolean; data: RestockPredictionItem[] }>(`/predictions?limit=${limit}`);
    return res.data;
  },

  async recalculatePredictions(params?: { bufferDays?: number }): Promise<void> {
    await fetchJson('/predictions/recalculate', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  },

  // Outreach Triggers
  async runOutreach(targetDate?: string): Promise<void> {
    await fetchJson('/triggers/run-outreach', {
      method: 'POST',
      body: JSON.stringify({ targetDate }),
    });
  },

  // Invoices Ingestion
  async ingestCsv(csvContent: string): Promise<IngestionResult> {
    const res = await fetchJson<{ success: boolean; data: IngestionResult }>('/invoices/ingest-csv', {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    });
    return res.data;
  },

  // WhatsApp Simulator
  async simulateInboundMessage(from: string, text: string): Promise<unknown> {
    const res = await fetchJson<{ success: boolean; data: unknown }>('/whatsapp/simulator/inbound', {
      method: 'POST',
      body: JSON.stringify({ from, text }),
    });
    return res.data;
  },
};
