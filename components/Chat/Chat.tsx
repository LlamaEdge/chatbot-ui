import {IconClearAll, IconSettings} from '@tabler/icons-react';
import {memo, MutableRefObject, useCallback, useContext, useEffect, useRef, useState,} from 'react';

import {useTranslation} from 'next-i18next';
import {throttle} from '@/utils/data/throttle';

import {saveConversation, saveConversations, updateConversation} from '@/utils/app/conversation';
import {ChatBody, Conversation, Message} from '@/types/chat';
import {Plugin} from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';
import {ChatInput} from './ChatInput';
import {ChatLoader} from './ChatLoader';
import Spinner from '../Spinner';
import {ErrorMessageDiv} from './ErrorMessageDiv';
import {ModelSelect} from './ModelSelect';
import {SystemPrompt} from './SystemPrompt';
import {MemoizedChatMessage} from './MemoizedChatMessage';
import {DEFAULT_TEMPERATURE} from "@/utils/app/const";
import {OpenAIError, OpenAIStream} from "@/utils/server";

interface Props {
    stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({stopConversationRef}: Props) => {
        const {t} = useTranslation('chat');

        const maxImg = 1

        const {
            state: {
                selectedConversation,
                conversations,
                models,
                isStream,
                lightMode,
                api,
                apiKey,
                pluginKeys,
                modelError,
                loading,
                prompts,
            },
            handleUpdateConversation,
            dispatch: homeDispatch,
        } = useContext(HomeContext);

        const [currentMessage, setCurrentMessage] = useState<Message>();
        const [imageCount, setImageCount] = useState<number>(0);
        const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
        const [showSettings, setShowSettings] = useState<boolean>(false);
        const [showScrollDownButton, setShowScrollDownButton] =
            useState<boolean>(false);

        const messagesEndRef = useRef<HTMLDivElement>(null);
        const chatContainerRef = useRef<HTMLDivElement>(null);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        function delay(time: number | undefined) {
            return new Promise(resolve => setTimeout(resolve, time));
        }

        const handleSend = useCallback(
            async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
                if (selectedConversation) {
                    let updatedConversation: Conversation;
                    if (deleteCount) {
                        const updatedMessages = [...selectedConversation.messages];
                        for (let i = 0; i < deleteCount; i++) {
                            updatedMessages.pop();
                        }
                        updatedConversation = {
                            ...selectedConversation,
                            messages: [...updatedMessages, message],
                        };
                    } else {
                        updatedConversation = {
                            ...selectedConversation,
                            messages: [...selectedConversation.messages, message],
                        };
                    }
                    homeDispatch({
                        field: 'selectedConversation',
                        value: updatedConversation,
                    });
                    homeDispatch({field: 'loading', value: true});
                    homeDispatch({field: 'messageIsStreaming', value: true});
                    const chatBody: ChatBody = {
                        model: updatedConversation.model,
                        messages: updatedConversation.messages,
                        key: apiKey,
                        prompt: updatedConversation.prompt,
                        temperature: updatedConversation.temperature,
                    };
                    const controller = new AbortController();

                    let response

                    try {
                        const {model, messages, key, prompt, temperature} = chatBody;

                        // await init((imports) => WebAssembly.instantiate(wasm, imports));
                        // const encoding = new Tiktoken(
                        //     tiktokenModel.bpe_ranks,
                        //     tiktokenModel.special_tokens,
                        //     tiktokenModel.pat_str,
                        // );

                        let promptToSend = prompt;

                        let temperatureToUse = temperature;
                        if (temperatureToUse == null) {
                            temperatureToUse = DEFAULT_TEMPERATURE;
                        }

                        // const prompt_tokens = encoding.encode(promptToSend);

                        // let tokenCount = prompt_tokens.length;
                        let messagesToSend: Message[] = [];

                        for (let i = messages.length - 1; i >= 0; i--) {
                            const message = messages[i];
                            // const tokens = encoding.encode(message.content);

                            // if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
                            //   break;
                            // }
                            // tokenCount += tokens.length;
                            messagesToSend = [message, ...messagesToSend];
                        }
                        // encoding.free();
                        response = await OpenAIStream(model, promptToSend, temperatureToUse, api, key, messagesToSend, isStream);
                    } catch (error) {
                        console.error(error);
                        if (error instanceof OpenAIError) {
                            response = new Response('Error', {status: 500, statusText: error.message});
                        } else {
                            response = new Response('Error', {status: 500});
                        }
                    }

                    if (response) {
                        if (isStream) {
                            // @ts-ignore
                            let responseIsEnd = false
                            // response.onEnd(()=>{
                            //     responseIsEnd = true
                            // })
                            const reader = response.getReader();
                            const decoder = new TextDecoder();
                            let done = false;
                            let isFirst = true;
                            let isShowFirst = true;
                            let queue: any[] = [];
                            let text = '';
                            let notFinishData = ""
                            while (!done || queue.length !== 0) {
                                const {value} = await reader.read();
                                let chunkValue = decoder.decode(value);
                                const regex = /(?<=})(?={)/g;
                                const parts = chunkValue.split(regex);
                                let objects: any[] = []
                                parts.forEach(part => {
                                    let isError = false
                                    part = part.trim();
                                    if (!part.startsWith('{')) {
                                        if (notFinishData) {
                                            part = notFinishData + part
                                            notFinishData = ""
                                        } else {
                                            isError = true
                                        }
                                    } else if (!part.endsWith('}')) {
                                        notFinishData = part
                                        isError = true
                                    }
                                    if (!isError) {
                                        try {
                                            objects.push(JSON.parse(part));
                                        } catch (e) {
                                            console.log("error JSON", part);
                                        }
                                    }
                                });

                                objects.forEach(obj => {
                                    if (obj && obj["choices"]) {
                                        obj["choices"].forEach((obj1: { [x: string]: { [x: string]: any; }; }) => {
                                            if (obj1) {
                                                if ((obj1["finish_reason"] && obj1["finish_reason"] !== null) || (obj1["delta"] && obj1["delta"]["content"] && obj1["delta"]["content"] === "data: [DONE]")) {
                                                    done = true;
                                                } else {
                                                    if (!done && obj1["delta"] && obj1["delta"]["content"]) {
                                                        queue.push(obj1["delta"]["content"]);
                                                    }
                                                }
                                            }
                                        })
                                    }
                                });

                                for (const item of queue) {
                                    const thisWord = queue.shift();
                                    if (!isShowFirst) {
                                        if (!responseIsEnd) {
                                            await delay(Math.random() * (queue.length < 10 ? 500 : 200));
                                        }
                                    } else {
                                        isShowFirst = false;
                                    }
                                    text += thisWord
                                    if (isFirst) {
                                        isFirst = false;
                                        homeDispatch({field: 'loading', value: false});
                                        const updatedMessages: Message[] = [
                                            ...updatedConversation.messages,
                                            {role: 'assistant', content: text},
                                        ];
                                        updatedConversation = {
                                            ...updatedConversation,
                                            messages: updatedMessages,
                                        };
                                        homeDispatch({
                                            field: 'selectedConversation',
                                            value: updatedConversation,
                                        });
                                    } else {
                                        const updatedMessages: Message[] =
                                            updatedConversation.messages.map((message, index) => {
                                                if (index === updatedConversation.messages.length - 1) {
                                                    return {
                                                        ...message,
                                                        content: text,
                                                    };
                                                }
                                                return message;
                                            });
                                        updatedConversation = {
                                            ...updatedConversation,
                                            messages: updatedMessages,
                                        };
                                        saveConversation(updatedConversation);
                                        homeDispatch({
                                            field: 'selectedConversation',
                                            value: updatedConversation,
                                        });
                                        const updatedConversations: Conversation[] = conversations.map(
                                            (conversation) => {
                                                if (conversation.id === selectedConversation.id) {
                                                    return updatedConversation;
                                                }
                                                return conversation;
                                            },
                                        );
                                        if (updatedConversations.length === 0) {
                                            updatedConversations.push(updatedConversation);
                                        }
                                        homeDispatch({ field: 'conversations', value: updatedConversations });
                                        saveConversations(updatedConversations);
                                    }
                                    if (done && queue.length === 0) {
                                        homeDispatch({field: 'messageIsStreaming', value: false});
                                        controller.abort();
                                    }
                                }
                            }
                        } else {
                            const data = response.choices[0].message;
                            const updatedMessages: Message[] = [
                                ...updatedConversation.messages,
                                {role: 'assistant', content: data.content},
                            ];
                            updatedConversation = {
                                ...updatedConversation,
                                messages: updatedMessages,
                            };
                            console.log("updatedMessages")

                            homeDispatch({
                                field: 'selectedConversation',
                                value: updateConversation,
                            });
                            saveConversation(updatedConversation);
                            const updatedConversations: Conversation[] = conversations.map(
                                (conversation) => {
                                    if (conversation.id === selectedConversation.id) {
                                        return updatedConversation;
                                    }
                                    return conversation;
                                },
                            );
                            if (updatedConversations.length === 0) {
                                updatedConversations.push(updatedConversation);
                            }
                            homeDispatch({ field: 'conversations', value: updatedConversations });
                            saveConversations(updatedConversations);
                            homeDispatch({field: 'loading', value: false});
                            homeDispatch({field: 'messageIsStreaming', value: false});
                            homeDispatch({
                                field: 'selectedConversation',
                                value: updatedConversation,
                            });
                        }
                    }
                }
            },
            [
                api,
                apiKey,
                conversations,
                pluginKeys,
                isStream,
                selectedConversation,
                stopConversationRef,
            ],
        );

        const scrollToBottom = useCallback(() => {
            if (autoScrollEnabled) {
                messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
                textareaRef.current?.focus();
            }
        }, [autoScrollEnabled]);

        const handleScroll = () => {
            if (chatContainerRef.current) {
                const {scrollTop, scrollHeight, clientHeight} =
                    chatContainerRef.current;
                const bottomTolerance = 30;

                if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
                    setAutoScrollEnabled(false);
                    setShowScrollDownButton(true);
                } else {
                    setAutoScrollEnabled(true);
                    setShowScrollDownButton(false);
                }
            }
        };

        const handleScrollDown = () => {
            chatContainerRef.current?.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        };

        const handleSettings = () => {
            setShowSettings(!showSettings);
        };

        const onClearAll = () => {
            if (
                confirm(t<string>('Are you sure you want to clear all messages?')) &&
                selectedConversation
            ) {
                handleUpdateConversation(selectedConversation, {
                    key: 'messages',
                    value: [],
                });
            }
        };

        const scrollDown = () => {
            if (autoScrollEnabled) {
                messagesEndRef.current?.scrollIntoView(true);
            }
        };
        const throttledScrollDown = throttle(scrollDown, 250);

// useEffect(() => {
//   if (currentMessage) {
//     handleSend(currentMessage);
//     homeDispatch({ field: 'currentMessage', value: undefined });
//   }
// }, [currentMessage]);

        useEffect(() => {
            throttledScrollDown();
            if (selectedConversation) {
                setImageCount(selectedConversation?.messages.reduce((total, currentItem) => {
                    if (Array.isArray(currentItem.content)) {
                        total += currentItem.content.reduce((acc, item) => {
                            if (item.type === "image_url" && item["image_url"]) {
                                acc++;
                            }
                            return acc;
                        }, 0);
                    }
                    return total;
                }, 0))
                setCurrentMessage(
                    selectedConversation.messages[selectedConversation.messages.length - 2],
                );
            }
        }, [selectedConversation, throttledScrollDown]);

        useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    setAutoScrollEnabled(entry.isIntersecting);
                    if (entry.isIntersecting) {
                        textareaRef.current?.focus();
                    }
                },
                {
                    root: null,
                    threshold: 0.5,
                },
            );
            const messagesEndElement = messagesEndRef.current;
            if (messagesEndElement) {
                observer.observe(messagesEndElement);
            }
            return () => {
                if (messagesEndElement) {
                    observer.unobserve(messagesEndElement);
                }
            };
        }, [messagesEndRef]);

        return (
            <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
                {!(apiKey || api) ? (
                    <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
                        <div className="text-center text-4xl font-bold text-black dark:text-white">
                            Welcome to LlamaEdge Chat
                        </div>
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <div className="mb-2">
                                LlamaEdge Chat allows you to plug in your API key to use this UI with
                                their API.
                            </div>
                            <div className="mb-2">
                                It is <span className="italic">only</span> used to communicate
                                with their API.
                            </div>
                        </div>
                    </div>
                ) : modelError ? (
                    <ErrorMessageDiv error={modelError}/>
                ) : (
                    <>
                        <div
                            className="max-h-full overflow-x-hidden"
                            ref={chatContainerRef}
                            onScroll={handleScroll}
                        >
                            {selectedConversation?.messages?.length === 0 ? (
                                <>
                                    <div
                                        className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                                        <div
                                            className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                                            {models?.length === 0 ? (
                                                <div>
                                                    <Spinner size="16px" className="mx-auto"/>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}>
                                                    <img style={{height: "4rem"}} src="/llamaedge.svg"/>LlamaEdge Chat
                                                </div>
                                            )}
                                        </div>

                                        {models?.length > 0 && (
                                            <div
                                                className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                                                <ModelSelect/>

                                                {selectedConversation?.promptState !== 2 && <SystemPrompt
                                                    conversation={selectedConversation}
                                                    prompts={prompts}
                                                    onChangePrompt={(prompt) =>
                                                        handleUpdateConversation(selectedConversation, {
                                                            key: 'prompt',
                                                            value: prompt,
                                                        })
                                                    }
                                                />}

                                                {/*<TemperatureSlider*/}
                                                {/*  label={t('Temperature')}*/}
                                                {/*  onChangeTemperature={(temperature) =>*/}
                                                {/*    handleUpdateConversation(selectedConversation, {*/}
                                                {/*      key: 'temperature',*/}
                                                {/*      value: temperature,*/}
                                                {/*    })*/}
                                                {/*  }*/}
                                                {/*/>*/}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                                        {t('Model')}: {selectedConversation?.model?.id} | {t('Temp')}
                                        : {selectedConversation?.temperature} |
                                        <button
                                            className="ml-2 cursor-pointer hover:opacity-50"
                                            onClick={handleSettings}
                                        >
                                            <IconSettings size={18}/>
                                        </button>
                                        <button
                                            className="ml-2 cursor-pointer hover:opacity-50"
                                            onClick={onClearAll}
                                        >
                                            <IconClearAll size={18}/>
                                        </button>
                                    </div>
                                    {showSettings && (
                                        <div
                                            className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                                            <div
                                                className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                                                <ModelSelect/>
                                            </div>
                                        </div>
                                    )}

                                    {selectedConversation?.messages && selectedConversation.messages.map((message, index) => (
                                        <MemoizedChatMessage
                                            key={index}
                                            message={message}
                                            messageIndex={index}
                                            maxImg={maxImg - imageCount}
                                            onRegenerate={() => {
                                                if (currentMessage) {
                                                    handleSend(currentMessage, selectedConversation.messages.length - index + 1, null);
                                                }
                                            }}
                                            onEdit={(editedMessage) => {
                                                setCurrentMessage(editedMessage);
                                                // discard edited message and the ones that come after then resend
                                                handleSend(
                                                    editedMessage,
                                                    selectedConversation?.messages.length - index,
                                                );
                                            }}
                                        />
                                    ))}

                                    {loading && <ChatLoader/>}

                                    <div
                                        className="h-[162px] bg-white dark:bg-[#343541]"
                                        ref={messagesEndRef}
                                    />
                                </>
                            )}
                        </div>
                        {(selectedConversation?.promptState !== 1 || selectedConversation?.prompt !== "") && <ChatInput
                            maxImg={maxImg - imageCount}
                            stopConversationRef={stopConversationRef}
                            textareaRef={textareaRef}
                            onSend={(message, plugin) => {
                                setCurrentMessage(message);
                                handleSend(message, 0, plugin);
                            }}
                            onScrollDownClick={handleScrollDown}
                            onRegenerate={() => {
                                if (currentMessage) {
                                    handleSend(currentMessage, 2, null);
                                }
                            }}
                            showScrollDownButton={showScrollDownButton}
                        />}
                    </>
                )}
            </div>
        );
    })
;
Chat.displayName = 'Chat';
