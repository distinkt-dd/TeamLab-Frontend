export interface Field {
  id: number;
  name: string;
  slug?: string;
  created_at: string;
  updated_at: string;
  is_featured?: boolean;
}

export interface FieldListParams {
  search?: string;

  [key: string]: string | number | undefined;
}
