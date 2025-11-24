declare module 'html-to-docx' {
  /**
   * Convert HTML string to a DOCX buffer.
   * The actual library returns a Node.js Buffer, but we type it as any here
   * to avoid pulling in Node-specific types into browser code paths.
   */
  export default function HTMLtoDOCX(html: string, options?: unknown): Promise<any>;
}


