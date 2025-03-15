import {useEffect, useRef} from 'react';

import {GetStaticProps} from 'next';
import {useTranslation} from 'next-i18next';
import {serverSideTranslations} from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import {useCreateReducer} from '@/hooks/useCreateReducer';
import { useRouter } from 'next/router';
import useApiService from '@/services/useApiService';

import {cleanConversationHistory, cleanSelectedConversation,} from '@/utils/app/clean';
import {DEFAULT_TEMPERATURE} from '@/utils/app/const';
import {saveConversation, saveConversations, updateConversation,} from '@/utils/app/conversation';
import {saveFolders} from '@/utils/app/folders';
import {savePrompts} from '@/utils/app/prompts';
import {getSettings} from '@/utils/app/settings';

import {Conversation} from '@/types/chat';
import {KeyValuePair} from '@/types/data';
import {FolderInterface, FolderType} from '@/types/folder';
import {fallbackModelID, OpenAIModel, OpenAIModelID} from '@/types/openai';
import {Prompt} from '@/types/prompt';

import {Chat} from '@/components/Chat/Chat';
import {Chatbar} from '@/components/Chatbar/Chatbar';
import {Navbar} from '@/components/Mobile/Navbar';

import HomeContext from './home.context';
import {HomeInitialState, initialState} from './home.state';

import {v4 as uuidv4} from 'uuid';
import {promptsList} from "@/components/Chat/PromptsList";

interface Props {
    serverSideApiKeyIsSet: boolean;
    serverSidePluginKeysSet: boolean;
    defaultModelId: OpenAIModelID;
}

interface DispatchData {
    id: String;
    name: String|null;
    messages: [];
    model?: Object;
    prompt?: String;
    promptState?:Number;
    temperature: Number;
    folderId: String | null;
}

const Home = ({
                  serverSideApiKeyIsSet,
                  serverSidePluginKeysSet,
                  defaultModelId,
              }: Props) => {
    const {t} = useTranslation('chat');
    const {getModels} = useApiService();
    const router = useRouter();

    const contextValue = useCreateReducer<HomeInitialState>({
        initialState,
    });

    const {
        state: {
            api,
            apiKey,
            lightMode,
            folders,
            conversations,
            selectedConversation,
            prompts,
            models
        },
        dispatch,
    } = contextValue;

    const stopConversationRef = useRef<boolean>(false);

    let data: object | undefined

    const getData = async () => {
        data = await getModels(
            {
                url: api,
                key: apiKey,
            },
        );
    if (dispatch && data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            dispatch({field: 'models', value: data});
        }
    }

    useEffect(()=>{
        if(models && (!conversations || conversations && conversations.length===0) && handleNewConversation){
            handleNewConversation()
        }
    },[models])


    useEffect(() => {
        if(router.query.api_key){
            localStorage.setItem('apiKey', router.query.api_key as string);
            dispatch({field: 'apiKey', value: router.query.api_key});
        }
    }, [router.query.api_key]);

    useEffect(() => {
        if (api) {
            getData()
        }
    }, [api, apiKey])

    // FETCH MODELS ----------------------------------------------

    const handleSelectConversation = (conversation: Conversation) => {
        dispatch({
            field: 'selectedConversation',
            value: conversation,
        });

        saveConversation(conversation);
    };

    // FOLDER OPERATIONS  --------------------------------------------

    const handleCreateFolder = (name: string, type: FolderType) => {
        const newFolder: FolderInterface = {
            id: uuidv4(),
            name,
            type,
        };

        const updatedFolders = [...folders, newFolder];

        dispatch({field: 'folders', value: updatedFolders});
        saveFolders(updatedFolders);
    };

    const handleDeleteFolder = (folderId: string) => {
        const updatedFolders = folders.filter((f) => f.id !== folderId);
        dispatch({field: 'folders', value: updatedFolders});
        saveFolders(updatedFolders);

        const updatedConversations: Conversation[] = conversations.map((c) => {
            if (c.folderId === folderId) {
                return {
                    ...c,
                    folderId: null,
                };
            }

            return c;
        });

        dispatch({field: 'conversations', value: updatedConversations});
        saveConversations(updatedConversations);

        const updatedPrompts: Prompt[] = prompts.map((p) => {
            if (p.folderId === folderId) {
                return {
                    ...p,
                    folderId: null,
                };
            }

            return p;
        });

        dispatch({field: 'prompts', value: updatedPrompts});
        savePrompts(updatedPrompts);
    };

    const handleUpdateFolder = (folderId: string, name: string) => {
        const updatedFolders = folders.map((f) => {
            if (f.id === folderId) {
                return {
                    ...f,
                    name,
                };
            }

            return f;
        });

        dispatch({field: 'folders', value: updatedFolders});

        saveFolders(updatedFolders);
    };

    // CONVERSATION OPERATIONS  --------------------------------------------

    function checkObjectExistence(objectList: OpenAIModel[], object: OpenAIModel): boolean {
        for (let obj of objectList) {
            if (obj.id === object.id) {
                return true;
            }
        }
        return false;
    }

    const handleNewConversation = async () => {
        await getData()
        const lastConversation = conversations[conversations.length - 1];
        if (models && models.length > 0) {
            const newConversation: Conversation = {
                id: uuidv4(),
                name: t('New Conversation'),
                messages: [],
                model: (lastConversation?.model && checkObjectExistence(models, lastConversation?.model) && lastConversation?.model) || models[0],
                prompt: promptsList.find(prompt =>
                    prompt.id?.toLowerCase() === models[0].name?.toLowerCase()
                )?.content || "",
                promptState: promptsList.find(prompt =>
                    prompt.id?.toLowerCase() === models[0].name?.toLowerCase()
                )?.controlState || 0,
                temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
                folderId: null,
            };

            const updatedConversations = [...conversations, newConversation];

            dispatch({field: 'selectedConversation', value: newConversation});
            dispatch({field: 'conversations', value: updatedConversations});

            saveConversation(newConversation);
            saveConversations(updatedConversations);

            dispatch({field: 'loading', value: false});
        }

    };

    const handleUpdateConversation = (
        conversation: Conversation,
        data: KeyValuePair,
    ) => {
        const updatedConversation = {
            ...conversation,
            [data.key]: data.value,
        };

        const {single, all} = updateConversation(
            updatedConversation,
            conversations,
        );

        dispatch({field: 'selectedConversation', value: single});
        dispatch({field: 'conversations', value: all});
    };

    const handleUpdateConversationAll = (
        conversation: Conversation,
        data: KeyValuePair[],
    ) => {
        const updatedConversation = Object.assign(conversation)
        data.forEach(item => {
                updatedConversation[item.key] = item.value
            }
        )

        const {single, all} = updateConversation(
            updatedConversation,
            conversations,
        );

        dispatch({field: 'selectedConversation', value: single});
        dispatch({field: 'conversations', value: all});
    };

    // EFFECTS  --------------------------------------------

    useEffect(() => {
        if (window.innerWidth < 640) {
            dispatch({field: 'showChatbar', value: false});
        }
    }, [selectedConversation]);

    useEffect(() => {
        serverSideApiKeyIsSet &&
        dispatch({
            field: 'serverSideApiKeyIsSet',
            value: serverSideApiKeyIsSet,
        });
        serverSidePluginKeysSet &&
        dispatch({
            field: 'serverSidePluginKeysSet',
            value: serverSidePluginKeysSet,
        });
    }, [serverSideApiKeyIsSet, serverSidePluginKeysSet]);

    // ON LOAD --------------------------------------------

    useEffect(() => {
        const settings = getSettings();
        if (settings.theme) {
            dispatch({
                field: 'lightMode',
                value: settings.theme,
            });
        }
        if (settings.isStream) {
            dispatch({
                field: 'isStream',
                value: settings.isStream,
            });
        }

        const api = localStorage.getItem('api');
        const apiKey = localStorage.getItem('apiKey');

        if (serverSideApiKeyIsSet) {
            dispatch({field: 'apiKey', value: ''});

            localStorage.removeItem('apiKey');
        } else if (apiKey) {
            dispatch({field: 'apiKey', value: apiKey});
        }

        if (api) {
            dispatch({field: 'api', value: api});
        }

        const pluginKeys = localStorage.getItem('pluginKeys');
        if (serverSidePluginKeysSet) {
            dispatch({field: 'pluginKeys', value: []});
            localStorage.removeItem('pluginKeys');
        } else if (pluginKeys) {
            dispatch({field: 'pluginKeys', value: pluginKeys});
        }

        if (window.innerWidth < 640) {
            dispatch({field: 'showChatbar', value: false});
        }

        const showChatbar = localStorage.getItem('showChatbar');
        if (showChatbar) {
            dispatch({field: 'showChatbar', value: showChatbar === 'true'});
        }

        const folders = localStorage.getItem('folders');
        if (folders) {
            dispatch({field: 'folders', value: JSON.parse(folders)});
        }

        const prompts = localStorage.getItem('prompts');
        if (prompts) {
            dispatch({field: 'prompts', value: JSON.parse(prompts)});
        }

        const conversationHistory = localStorage.getItem('conversationHistory');
        if (conversationHistory) {
            const parsedConversationHistory: Conversation[] =
                JSON.parse(conversationHistory);
            const cleanedConversationHistory = cleanConversationHistory(
                parsedConversationHistory,
            );

            dispatch({field: 'conversations', value: cleanedConversationHistory});
        }

        const selectedConversation = localStorage.getItem('selectedConversation');
        if (selectedConversation) {
            const parsedSelectedConversation: Conversation =
                JSON.parse(selectedConversation);
            const cleanedSelectedConversation = cleanSelectedConversation(
                parsedSelectedConversation,
            );

            if(cleanedSelectedConversation.model && models && models.length > 0) {
                const haveThisSelectedModels = models.filter(model=>model.id === cleanedSelectedConversation.model.id)
                if(!haveThisSelectedModels || haveThisSelectedModels.length === 0){
                    cleanedSelectedConversation.model = models[0]
                    cleanedSelectedConversation.prompt = promptsList.find(prompt =>
                        prompt.id?.toLowerCase() === models[0]?.name?.toLowerCase()
                    )?.content || ""
                    cleanedSelectedConversation.promptState = promptsList.find(prompt =>
                        prompt.id?.toLowerCase() === models[0]?.name?.toLowerCase()
                    )?.controlState || 0
                }
            }

            dispatch({
                field: 'selectedConversation',
                value: cleanedSelectedConversation,
            });
        } else {
            const lastConversation = conversations[conversations.length - 1];
            let dispatchData:DispatchData ={
                    id: uuidv4(),
                    name: t('New Conversation'),
                    messages: [],
                    temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
                    folderId: null,
                }
            if(models && models.length > 0){
                dispatchData.model = models[0]
                dispatchData.prompt = promptsList.find(prompt =>
                    prompt.id?.toLowerCase() === models[0]?.name?.toLowerCase()
                )?.content || ""
                dispatchData.promptState = promptsList.find(prompt =>
                    prompt.id?.toLowerCase() === models[0]?.name?.toLowerCase()
                )?.controlState || 0
            }
            dispatch({
                field: 'selectedConversation', value:dispatchData
            });
        }
    }, [
        dispatch,
        models,
        serverSideApiKeyIsSet,
        serverSidePluginKeysSet,
    ]);

    return (
        <HomeContext.Provider
            value={{
                ...contextValue,
                handleNewConversation,
                handleCreateFolder,
                handleDeleteFolder,
                handleUpdateFolder,
                handleSelectConversation,
                handleUpdateConversation,
                handleUpdateConversationAll
            }}
        >
            <Head>
                <title>LlamaEdge Chat</title>
                <meta name="description" content="ChatGPT but better."/>
                <meta
                    name="viewport"
                    content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
                />
                <link rel="icon" href="/favicon.ico"/>
            </Head>
            {selectedConversation && (
                <main
                    className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
                >
                    <div className="fixed top-0 w-full sm:hidden">
                        <Navbar
                            selectedConversation={selectedConversation}
                            onNewConversation={handleNewConversation}
                        />
                    </div>

                    <div className="flex h-full w-full pt-[48px] sm:pt-0">
                        <Chatbar/>

                        <div className="flex flex-1">
                            <Chat stopConversationRef={stopConversationRef}/>
                        </div>
                    </div>
                </main>
            )}
        </HomeContext.Provider>
    );
};
export default Home;

export const getStaticProps: GetStaticProps = async ({locale}) => {
    const defaultModelId =
        (process.env.DEFAULT_MODEL &&
            Object.values(OpenAIModelID).includes(
                process.env.DEFAULT_MODEL as OpenAIModelID,
            ) &&
            process.env.DEFAULT_MODEL) ||
        fallbackModelID;

    let serverSidePluginKeysSet = false;

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCSEId = process.env.GOOGLE_CSE_ID;

    if (googleApiKey && googleCSEId) {
        serverSidePluginKeysSet = true;
    }

    return {
        props: {
            serverSideApiKeyIsSet: false,
            defaultModelId,
            serverSidePluginKeysSet,
            ...(await serverSideTranslations(locale ?? 'en', [
                'common',
                'chat',
                'sidebar',
                'markdown',
                'settings',
            ])),
        },
    };
};
