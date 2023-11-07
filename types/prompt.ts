import { OpenAIModel } from './openai';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  model?: OpenAIModel;
  folderId?: string | null;
  controlState?: number;//0 means it can be empty, 1 means it cannot be empty, and 2 means there is no prompt.
}
