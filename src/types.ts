export interface Question {
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface QuestionRecord {
  id: string;
  originalImage?: string;
  originalQuestion: Question;
  knowledgePoint: string;
  similarQuestions: Question[];
  createdAt: number;
}

export interface OCRResult {
  text: string;
  options?: string[];
  userAnswer?: string;
  standardAnswer?: string;
  knowledgePoint: string;
}

export interface GenerationResult {
  similarQuestions: Question[];
}
