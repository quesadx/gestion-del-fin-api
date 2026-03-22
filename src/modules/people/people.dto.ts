export interface CreatePersonDto {
  full_name: string;
  age?: number;
  identification_code?: string;
  blood_type?: string;
  skills_summary?: string;
  photo_url?: string;
  status?: 'SICK' | 'HEALTHY' | 'INJURED' | 'AWAY' | 'DEAD';
  camp_id: number;
  profession_id: number;
}
