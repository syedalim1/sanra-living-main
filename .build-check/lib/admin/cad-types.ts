export interface AdminCadFile {
  id: string;
  title: string;
  description: string | null;
  file_type: "SKP" | "DWG";
  product_sku: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CadActionResult {
  ok?: boolean;
  error?: string;
  id?: string;
}
