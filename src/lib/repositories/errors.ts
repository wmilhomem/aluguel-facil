export class DataLayerError extends Error {
  readonly original: unknown;

  constructor(message: string, original?: unknown) {
    super(message);
    this.name = 'DataLayerError';
    this.original = original;
  }
}

export function dataError(context: string, error: unknown): DataLayerError {
  const detail =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? 'erro desconhecido');

  return new DataLayerError(`${context}: ${detail}`, error);
}
