import { MetricsRepository } from "@/repositories/metrics.repo";
import { db } from "./db";

type Subscriber = (data: string) => void;

class MetricsBroadcaster {
  private subsribers = new Set<Subscriber>();
  private repo = new MetricsRepository(db);

  subscribe(fn: Subscriber) {
    this.subsribers.add(fn);
    return () => this.subsribers.delete(fn);
  }

  async broadcast() {
    if (this.subsribers.size === 0) return;

    const metrics = await this.repo.getMetrics();
    const data = JSON.stringify(metrics);

    for (const subscriber of this.subsribers) {
      subscriber(data);
    }
  }
}

export const metricsBroadcaster = new MetricsBroadcaster();
