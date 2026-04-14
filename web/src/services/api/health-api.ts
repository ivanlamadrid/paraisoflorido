import { api } from 'boot/axios';

type HealthStatusResponse = {
  ok: boolean;
  database: string;
  timestamp: string;
};

export async function getHealthStatus(): Promise<HealthStatusResponse> {
  const { data } = await api.get<HealthStatusResponse>('/health');
  return data;
}
