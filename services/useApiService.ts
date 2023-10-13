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
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${params.key ? params.key : process.env.OPENAI_API_KEY}`
                },
            });
            try {
                const data = await response.json()
                console.log(data.data)
                return data.data
            }catch (e) {
                return {}
            }
        }

    return {
        getModels,
    };
};

export default useApiService;
