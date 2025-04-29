export interface GetModelsRequestProps {
    url: string;
    key: string;
}

export interface modelObject {
    id: String;
    name?: String;
    created: Number;
    object: String;
    owned_by: String;
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
        // if(params.url){
            let url = `${params.url}/v1/models`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${params.key ? params.key : process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
                    },
                });
                const res = await response.json()
                const data:modelObject[] = res.data
                // test data
                // const data:modelObject[] = [{
                //     id: "Llama-2-7B:llama-2-chat", "created": 1699511491, "object": "model", "owned_by": "Not specified"
                // }, {
                //     id: "Llama-2-13B:llama-2-chat", "created": 1699511491, "object": "model", "owned_by": "Not specified"
                // }]
                if(data && data.length > 0){
                    return data.map(item => {
                        if (item.id.indexOf(":") !== -1 && !item.name){
                            item.name = item.id.split(":")[1]
                            item.id = item.id.split(":")[0]
                        }
                        return item
                    })
                }else {
                    return []
                }
            } catch (e) {
                return {}
            }
        // }
    }

    return {
        getModels,
    };
};

export default useApiService;
