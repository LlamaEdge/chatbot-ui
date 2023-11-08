import {useCallback} from 'react';

import {useFetch} from '@/hooks/useFetch';

export interface GetModelsRequestProps {
    url: string;
    key: string;
}

const useApiService = () => {

    // const getModels = useCallback(
    // 	(
    // 		params: GetManagementRoutineInstanceDetailedParams,
    // 		signal?: AbortSignal
    // 	) => {
    // 		return fetchService.get<GetManagementRoutineInstanceDetailed>(
    // 			`/v1/ManagementRoutines/${params.managementRoutineId}/instances/${params.instanceId
    // 			}?sensorGroupIds=${params.sensorGroupId ?? ''}`,
    // 			{
    // 				signal,
    // 			}
    // 		);
    // 	},
    // 	[fetchService]
    // );

    const getModels = async (params: GetModelsRequestProps) => {
            let url = `${params.url}/v1/models`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${params.key ? params.key : process.env.OPENAI_API_KEY}`
                    },
                });
                const data = await response.json()
                return data.data
                //test data
                // return [{
                //     id: "Llama-2-Chat",
                //     name: "llama-2-chat"
                // },{
                //     id: "Llama-2-7B-Chat",
                //     name: "Llama-2-7B-Chat"
                // },{
                //     id: "Llama-2-13B-Chat",
                //     name: "Llama-2-13B-Chat"
                // },{
                //     id: "CodeLlama-13B",
                //     name: "CodeLlama-13B"
                // },{
                //     id: "Wizard-Vicuna-13B",
                //     name: "Wizard-Vicuna-13B"
                // },{
                //     id: "CausalLM-14B",
                //     name: "CausalLM-14B"
                // },{
                //     id: "Mistral-7B-Instruct-v0.1",
                //     name: "Mistral-7B-Instruct-v0.1"
                // },{
                //     id: "BELLE-Llama2-13B-chat",
                //     name: "BELLE-Llama2-13B-chat"
                // }]
            }catch (e) {
                return {}
            }
        }

    return {
        getModels,
    };
};

export default useApiService;
