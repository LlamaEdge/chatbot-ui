import {OpenAIModel} from './openai';

export interface image_url {
    url: string;
}

export interface Content {
    type: Type;
    text?: string;
    image_url?: image_url;
}

export interface Message {
    role: Role;
    content: string | Content[];
}

export type Type = 'text' | 'image_url';

export type Role = 'assistant' | 'user';

export interface ChatBody {
    model: OpenAIModel;
    messages: Message[];
    key: string;
    prompt: string;
    temperature: number;
}

export interface Conversation {
    id: string;
    name: string;
    messages: Message[];
    model: OpenAIModel;
    prompt: string;
    promptState: number;
    temperature: number;
    folderId: string | null;
}
