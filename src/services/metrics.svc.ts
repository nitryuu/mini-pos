import { IMetricsRepository } from "@/repositories/metrics.repo";
import { MetricsResponse } from "@/schemas/metric.schema";

export interface IMetricsService {
  getMetrics(): Promise<MetricsResponse>;
}

export class MetricsService implements IMetricsService {
  constructor(private repo: IMetricsRepository) {}

  getMetrics(): Promise<MetricsResponse> {
    return this.repo.getMetrics();
  }
}
