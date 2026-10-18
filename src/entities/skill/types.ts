export interface Skill {
  id: number;
  name: string;
  slug: string;
  field_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface SkillListParams {
  search?: string;
  ordering?: string;

  [key: string]: string | number | undefined;
}
