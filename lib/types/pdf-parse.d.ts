declare module "pdf-parse" {
  export interface PDFData {
    numpages: number;
    numrender: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
    text: string;
  }

  export default function pdf(
    dataBuffer: Buffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<PDFData>;
}
