export interface PortfolioWork {
  id: number;
  user_id: number;
  title: string;
  task: string | null;
  solution: string | null;
  image: string | null;
  technologies: string[] | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioWorkCreateRequest {
  title: string;
  task?: string | null;
  solution?: string | null;
  image?: string | null;
  technologies?: string[] | null;
  link?: string | null;
}

export interface PortfolioWorkUpdateRequest {
  title?: string;
  task?: string | null;
  solution?: string | null;
  image?: string | null;
  technologies?: string[] | null;
  link?: string | null;
}

export interface PortfolioWorkWriteResponse {
  id: number;
  title: string;
  task: string | null;
  solution: string | null;
  image: string | null;
  technologies: string[] | null;
  link: string | null;
}
