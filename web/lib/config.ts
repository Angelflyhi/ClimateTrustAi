export function getMlServiceUrl(): string {
  return process.env.ML_SERVICE_URL ?? "http://localhost:8000";
}
