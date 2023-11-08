import { IconExternalLink } from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import {OpenAIModel, OpenAIModels} from '@/types/openai';

import HomeContext from '@/pages/api/home/home.context';
import {promptsList} from "@/components/Chat/PromptsList";

export const ModelSelect = () => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversationAll,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if(selectedConversation && (defaultModelId || e.target.value)){
      handleUpdateConversationAll(selectedConversation, [{
        key: 'model',
        value: models.find(
            (model) => model.id === e.target.value,
        ) as OpenAIModel,
      }, {
        key: 'prompt',
        value: promptsList.find(prompt=>
            prompt.id?.toLowerCase() === e.target.value?.toLowerCase()
        )?.content || "",
      },{
        key: 'promptState',
        value: promptsList.find(prompt=>
            prompt.id?.toLowerCase() === e.target.value?.toLowerCase()
        )?.controlState || 0,
      }]);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Model')}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full bg-transparent p-2"
          placeholder={t('Select a model') || ''}
          value={selectedConversation?.model?.id || defaultModelId}
          onChange={handleChange}
        >
          {models.map((model) => (
            <option
              key={model.id}
              value={model.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {model.id === defaultModelId
                ? `Default (${model.id})`
                : model.id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
