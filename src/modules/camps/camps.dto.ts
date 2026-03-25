export interface CreateCampDto {
  name: string;
  location?: string;
  status?: 'ACTIVE' | 'ABANDONED';
  ai_context_prompt?: string;
}

export interface UpdateCampDto {
  name?: string;
  location?: string;
  status?: 'ACTIVE' | 'ABANDONED';
  ai_context_prompt?: string;
}
