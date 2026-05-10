export class CreateLogDetailDto {
  bodySizeKB!: number;
  contentLength?: number | null;
  contentType?: string | null;
  body?: string | null;
  headers?: Record<string, string>;
  completed!: boolean;
  aborted!: boolean;
  idempotent!: boolean;
}
