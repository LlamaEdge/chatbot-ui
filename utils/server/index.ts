import {Message} from '@/types/chat';
import {OpenAIModel} from '@/types/openai';

import {OPENAI_API_TYPE} from '../app/const';

import {createParser, ParsedEvent, ReconnectInterval,} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  api: string,
  key: string,
  messages: Message[],
  isStream: Boolean
) => {
  let queryUrl = `${api}/v1/chat/completions`;
  // if (OPENAI_API_TYPE === 'azure') {
  //   url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  // }
  const res = await fetch(queryUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      // ...(OPENAI_API_TYPE === 'azure' && {
      //   'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      // }),
      // ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
      //   'OpenAI-Organization': OPENAI_ORGANIZATION,
      // }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && {model: model.id}),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: temperature,
      stream: isStream
    }),
  });
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
          result.error.message,
          result.error.type,
          result.error.param,
          result.error.code,
      );
    } else {
      throw new Error(
          `OpenAI API returned an error: ${
              decoder.decode(result?.value) || result.statusText
          }`,
      );
    }
  }

  if(isStream){
    return res.body;
  }else {
    return await res.json();
  }

};
