export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  tier: 'free' | 'pro';
  stripe_customer_id?: string;
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

export interface RoomContent {
  title: string;
  narrative: {
    intro: string;
    climax: string;
    outro: string;
  };
  puzzles: Puzzle[];
  redHerrings: string[];
}

export interface Puzzle {
  name: string;
  props: string[];
  setup: string;
  solution: string;
  output: string;
}

export interface GeneratorFormData {
  theme: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Enthusiast-Only';
  players: '2-4' | '4-6' | '6-8' | '8+';
  format: 'Single Room' | 'Multi-Room' | 'Linear' | 'Non-Linear';
  duration: '45 mins' | '60 mins' | '90 mins';
}
