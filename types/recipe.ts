export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  source_url: string;
  source_platform: 'youtube' | 'instagram' | 'other';
  ingredients: string[];
  steps: string[];
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  confidence?: 'low'; // present when extracted via vision fallback (no transcript)
}

export type RecipeInsert = Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
export type RecipeUpdate = Partial<Pick<Recipe, 'title' | 'ingredients' | 'steps'>>;
