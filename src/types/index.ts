export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  tier: 'free' | 'pro';
  role?: 'free' | 'pro' | string;
  is_pro?: boolean;
  stripe_customer_id?: string;
  stripe_checkout_session_id?: string;
  pro_purchased_at?: string;
  created: string;
  updated: string;
}

export interface GeneratedRoom {
  id: string;
  user: string;
  title: string;
  theme: string;
  difficulty: string;
  content: RoomContent;
  created: string;
  updated: string;
}

export interface RoomStory {
  introduction: string;
  midpoint: string;
  climax: string;
  resolution: string;
}

export interface LegacyNarrative {
  intro: string;
  climax: string;
  outro: string;
}

export interface RoomPuzzle {
  title: string;
  role_in_flow: string;
  estimated_time: string;
  required_props: string[];
  setup: string;
  player_facing_clue: string;
  hint_ladder: string[];
  solution: string;
  output: string;
  reset_notes: string;
  safety_or_ops_notes: string;
}

export interface LegacyPuzzle {
  name: string;
  props: string[];
  setup: string;
  solution: string;
  output: string;
}

export interface RoomContent {
  title: string;
  tagline?: string;
  theme?: string;
  difficulty?: GeneratorFormData['difficulty'];
  players?: GeneratorFormData['players'];
  duration?: GeneratorFormData['duration'];
  format?: GeneratorFormData['format'];
  operator_summary?: string;
  story?: RoomStory;
  puzzle_flow?: RoomPuzzle[];
  red_herrings?: string[];
  production_notes?: string[];
  shopping_list?: string[];
  staffing_notes?: string;
  reset_checklist?: string[];
  accessibility_notes?: string[];
  narrative?: LegacyNarrative;
  puzzles?: LegacyPuzzle[];
  redHerrings?: string[];
}

export interface GeneratorFormData {
  theme: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Enthusiast-Only';
  players: '2-4' | '4-6' | '6-8' | '8+';
  format: 'Single Room' | 'Multi-Room' | 'Linear' | 'Non-Linear';
  duration: '45 mins' | '60 mins' | '90 mins';
}
