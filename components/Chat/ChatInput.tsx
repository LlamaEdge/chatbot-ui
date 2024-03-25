import {IconArrowDown, IconBolt, IconSend, IconUpload, IconWriting} from '@tabler/icons-react';
import React, {KeyboardEvent, MutableRefObject, useCallback, useContext, useEffect, useRef, useState,} from 'react';

import {useTranslation} from 'next-i18next';

import {Content, Message} from '@/types/chat';
import {Plugin} from '@/types/plugin';
import {Prompt} from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';
import {PromptList} from './PromptList';
import {VariableModal} from './VariableModal';

interface Props {
    onSend: (message: Message, plugin: Plugin | null) => void;
    maxImg: number;
    onRegenerate: () => void;
    onScrollDownClick: () => void;
    stopConversationRef: MutableRefObject<boolean>;
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    showScrollDownButton: boolean;
}


export const ChatInput = ({
                              onSend,
                              onRegenerate,
                              maxImg,
                              onScrollDownClick,
                              stopConversationRef,
                              textareaRef,
                              showScrollDownButton,
                          }: Props) => {
    const {t} = useTranslation('chat');

    const {
        state: {selectedConversation, messageIsStreaming, prompts},

        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const [content, setContent] = useState<string>();
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [showPromptList, setShowPromptList] = useState(false);
    const [activePromptIndex, setActivePromptIndex] = useState(0);
    const [promptInputValue, setPromptInputValue] = useState('');
    const [variables, setVariables] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [showPluginSelect, setShowPluginSelect] = useState(false);
    const [plugin, setPlugin] = useState<Plugin | null>(null);
    const [urlInputShow, setUrlInputShow] = useState<boolean>(false);
    const [inputUrl, setInputUrl] = useState<string>("");

    const promptListRef = useRef<HTMLUListElement | null>(null);

    const filteredPrompts = prompts.filter((prompt) =>
        prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const maxLength = selectedConversation?.model.maxLength;

        if (maxLength && value.length > maxLength) {
            alert(
                t(
                    `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
                    {maxLength, valueLength: value.length},
                ),
            );
            return;
        }

        setContent(value);
        updatePromptListVisibility(value);
    };

    const handleSend = () => {
        let thisList: string[] = imageSrcList
        if (urlInputShow) {
            thisList = uploadInput()
        }

        if (messageIsStreaming) {
            return;
        }

        if (!content) {
            alert(t('Please enter a message'));
            return;
        }

        let finalContent: string | Content[] = content

        if (thisList.length > 0) {
            finalContent = [{type: 'text', text: content}]
            thisList.forEach((item) => {
                if (Array.isArray(finalContent)) {
                    finalContent.push({
                        type: "image_url",
                        image_url: {url: item}
                    })
                }
            })
        }

        onSend({role: 'user', content: finalContent}, plugin);
        setContent('');
        setImageSrcList([]);
        setPlugin(null);

        if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
            textareaRef.current.blur();
        }
    };

    const handleStopConversation = () => {
        stopConversationRef.current = true;
        setTimeout(() => {
            stopConversationRef.current = false;
        }, 1000);
    };

    const isMobile = () => {
        const userAgent =
            typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
        const mobileRegex =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
        return mobileRegex.test(userAgent);
    };

    const handleInitModal = () => {
        const selectedPrompt = filteredPrompts[activePromptIndex];
        if (selectedPrompt) {
            setContent((prevContent) => {
                return prevContent?.replace(
                    /\/\w*$/,
                    selectedPrompt.content,
                );
            });
            handlePromptSelect(selectedPrompt);
        }
        setShowPromptList(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (showPromptList) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActivePromptIndex((prevIndex) =>
                    prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActivePromptIndex((prevIndex) =>
                    prevIndex > 0 ? prevIndex - 1 : prevIndex,
                );
            } else if (e.key === 'Tab') {
                e.preventDefault();
                setActivePromptIndex((prevIndex) =>
                    prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleInitModal();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowPromptList(false);
            } else {
                setActivePromptIndex(0);
            }
        } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === '/' && e.metaKey) {
            e.preventDefault();
            setShowPluginSelect(!showPluginSelect);
        }
    };

    const parseVariables = (content: string) => {
        const regex = /{{(.*?)}}/g;
        const foundVariables = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            foundVariables.push(match[1]);
        }

        return foundVariables;
    };

    const updatePromptListVisibility = useCallback((text: string) => {
        const match = text.match(/\/\w*$/);

        if (match) {
            setShowPromptList(true);
            setPromptInputValue(match[0].slice(1));
        } else {
            setShowPromptList(false);
            setPromptInputValue('');
        }
    }, []);

    const handlePromptSelect = (prompt: Prompt) => {
        const parsedVariables = parseVariables(prompt.content);
        setVariables(parsedVariables);

        if (parsedVariables.length > 0) {
            setIsModalVisible(true);
        } else {
            setContent((prevContent) => {
                return prevContent?.replace(/\/\w*$/, prompt.content);
            });
            updatePromptListVisibility(prompt.content);
        }
    };

    const handleSubmit = (updatedVariables: string[]) => {
        const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
            const index = variables.indexOf(variable);
            return updatedVariables[index];
        });

        setContent(newContent);

        if (textareaRef && textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    useEffect(() => {
        if (promptListRef.current) {
            promptListRef.current.scrollTop = activePromptIndex * 30;
        }
    }, [activePromptIndex]);

    useEffect(() => {
        if (textareaRef && textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
            textareaRef.current.style.overflow = `${
                textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
            }`;
        }
    }, [content]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (
                promptListRef.current &&
                !promptListRef.current.contains(e.target as Node)
            ) {
                setShowPromptList(false);
            }
        };

        window.addEventListener('click', handleOutsideClick);

        return () => {
            window.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    const [imageSrcList, setImageSrcList] = useState<string[]>([]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages: string[] = [];
            const readerPromises: Promise<void>[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                readerPromises.push(
                    new Promise<void>((resolve) => {
                        reader.onloadend = () => {
                            newImages.push(reader.result as string);
                            resolve();
                        };
                    })
                );
                reader.readAsDataURL(file);
            }
            Promise.all(readerPromises).then(() => {
                addImg(newImages)
            });
        }
    };

    const addImg = (imageList: string[]) => {
        let list: string[]
        if (imageSrcList.length + imageList.length <= maxImg) {
            list = [...imageSrcList, ...imageList]
        } else {
            const newList = [...imageList, ...imageList];
            list = newList.slice(-maxImg);
        }
        setImageSrcList(list)
        return list
    }

    const handleImageRemove = (index: number) => {
        setImageSrcList((prevImages) => {
            const newImages = [...prevImages];
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const uploadInput = () => {
        let list: string[] = []
        setUrlInputShow(false)
        if (inputUrl) {
            list = addImg([inputUrl])
            setInputUrl("")
        }
        return list
    }

    return (
        <div
            className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-6 dark:border-white/20 dark:via-[#343541] dark:to-[#343541] md:pt-2">
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{display: 'none'}}
                id="upload-button"
            />
            <div className="lg:mx-auto lg:max-w-3xl mx-2 md:mx-4 mt-4 md:mt-[52px] ">
                <div className={"flex justify-start" + (imageSrcList.length > 0 ? " mt-4" : "")}>
                    <div
                        className="text-black flex items-center p-2 mx-2 sm:mx-4 w-full rounded-t-md bg-white border-black/10 dark:text-white dark:border-gray-900/50 dark:bg-[#40414f] border-t border-x">
                        <button title="upload image file" disabled={maxImg === 0}
                                className={"p-2 mr-2 bg-[#ececec] dark:bg-[#343541] rounded-lg" + (maxImg === 0 ? " cursor-not-allowed" : "")}
                                onClick={() => {
                                    document.getElementById("upload-button")?.click()
                                }}>
                            <IconUpload size={20}/>
                        </button>
                        {urlInputShow ? <>
                            <input onChange={(e) => {
                                setInputUrl(e.target.value)
                            }} id="imgUrlInputBox" autoFocus style={{height: "2.25rem"}}
                                   className="px-2 h-full bg-[#ececec] dark:bg-[#343541] rounded-l-lg"/>
                            <button title="upload" className="p-2 bg-[#ececec] dark:bg-[#343541] rounded-r-lg"
                                    onClick={uploadInput}>
                                {inputUrl ? "Submit" : "Close"}
                            </button>
                        </> : <button disabled={maxImg === 0} title="Upload images by entering the url"
                                      className={"p-2 bg-[#ececec] dark:bg-[#343541] rounded-lg" + (maxImg === 0 ? " cursor-not-allowed" : "")}
                                      onClick={() => {
                                          setUrlInputShow(true)
                                      }}>
                            <IconWriting size={20}/>
                        </button>}
                        <div className={"ml-4 " + (maxImg === 0 ? "block" : "hidden")}>
                            For Llava series models, please submit an image URL for processing first.
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-3xl">
                {/*{messageIsStreaming && (*/}
                {/*  <button*/}
                {/*    className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"*/}
                {/*    onClick={handleStopConversation}*/}
                {/*  >*/}
                {/*    <IconPlayerStop size={16} /> {t('Stop Generating')}*/}
                {/*  </button>*/}
                {/*)}*/}

                {/*{!messageIsStreaming &&*/}
                {/*    selectedConversation &&*/}
                {/*    selectedConversation.messages.length > 0 && (*/}
                {/*        <button*/}
                {/*            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"*/}
                {/*            onClick={onRegenerate}*/}
                {/*        >*/}
                {/*            <IconRepeat size={16}/> {t('Regenerate response')}*/}
                {/*        </button>*/}
                {/*)}*/}

                <div
                    className="relative mx-2 flex w-full flex-grow flex-col rounded-b-md border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] sm:mx-4">
                    {/*<button*/}
                    {/*  className="absolute left-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"*/}
                    {/*  // onClick={() => setShowPluginSelect(!showPluginSelect)}*/}
                    {/*  // onKeyDown={(e) => {}}*/}
                    {/*>*/}
                    <div
                        className="absolute left-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 dark:bg-opacity-50 dark:text-neutral-100"
                    >
                        {/*{plugin ? <IconBrandGoogle size={20} /> : <IconBolt size={20} />}*/}
                        <IconBolt size={20}/>
                    </div>
                    {/*</button>*/}

                    {/*{showPluginSelect && (*/}
                    {/*  <div className="absolute left-0 bottom-14 rounded bg-white dark:bg-[#343541]">*/}
                    {/*    <PluginSelect*/}
                    {/*      plugin={plugin}*/}
                    {/*      onKeyDown={(e: any) => {*/}
                    {/*        if (e.key === 'Escape') {*/}
                    {/*          e.preventDefault();*/}
                    {/*          setShowPluginSelect(false);*/}
                    {/*          textareaRef.current?.focus();*/}
                    {/*        }*/}
                    {/*      }}*/}
                    {/*      onPluginChange={(plugin: Plugin) => {*/}
                    {/*        setPlugin(plugin);*/}
                    {/*        setShowPluginSelect(false);*/}

                    {/*        if (textareaRef && textareaRef.current) {*/}
                    {/*          textareaRef.current.focus();*/}
                    {/*        }*/}
                    {/*      }}*/}
                    {/*    />*/}
                    {/*  </div>*/}
                    {/*)}*/}

                    <textarea
                        ref={textareaRef}
                        className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-3 md:pl-10"
                        style={{
                            resize: 'none',
                            bottom: `${textareaRef?.current?.scrollHeight}px`,
                            maxHeight: '400px',
                            overflow: `${
                                textareaRef.current && textareaRef.current.scrollHeight > 400
                                    ? 'auto'
                                    : 'hidden'
                            }`,
                        }}
                        placeholder={
                            t('Type a message or type "/" to select a prompt...') || ''
                        }
                        value={content}
                        rows={1}
                        onCompositionStart={() => setIsTyping(true)}
                        onCompositionEnd={() => setIsTyping(false)}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                    />


                    <button
                        className="absolute right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
                        onClick={handleSend}
                    >
                        {messageIsStreaming ? (
                            <div
                                className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
                        ) : (
                            <IconSend size={18}/>
                        )}
                    </button>

                    {showScrollDownButton && (
                        <div className="absolute bottom-12 right-0 lg:bottom-0 lg:-right-10">
                            <button
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                                onClick={onScrollDownClick}
                            >
                                <IconArrowDown size={18}/>
                            </button>
                        </div>
                    )}

                    {showPromptList && filteredPrompts.length > 0 && (
                        <div className="absolute bottom-12 w-full">
                            <PromptList
                                activePromptIndex={activePromptIndex}
                                prompts={filteredPrompts}
                                onSelect={handleInitModal}
                                onMouseOver={setActivePromptIndex}
                                promptListRef={promptListRef}
                            />
                        </div>
                    )}

                    {isModalVisible && (
                        <VariableModal
                            prompt={filteredPrompts[activePromptIndex]}
                            variables={variables}
                            onSubmit={handleSubmit}
                            onClose={() => setIsModalVisible(false)}
                        />
                    )}
                </div>
            </div>
            <div className="lg:mx-auto lg:max-w-3xl">
                <div className={"flex mx-2 sm:mx-4" + (imageSrcList.length > 0 ? " mt-4" : "")}>
                    {imageSrcList.map((imageSrc, index) => (
                        <div key={index} style={{position: 'relative', display: 'inline-block', marginRight: '10px'}}>
                            <div
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '5px',
                                    border: '1px dashed #ccc',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                <img
                                    src={imageSrc}
                                    alt="Uploaded"
                                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => handleImageRemove(index)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="currentColor"
                                        className="bi bi-x-circle"
                                        viewBox="0 0 16 16"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM7.354 8l-2.88 2.879a.5.5 0 0 1-.708-.708L6.646 8 3.766 5.121a.5.5 0 0 1 .708-.708L8 7.354l2.879-2.88a.5.5 0 0 1 .708.708L8.354 8l2.879 2.879a.5.5 0 0 1-.708.708L8 8.354 5.121 11.233a.5.5 0 0 1-.708-.708L7.354 8z"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div
                className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
                <span>Based on </span>
                <a
                    href="https://github.com/second-state/chatbot-ui"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                >
                    chatbot-ui
                </a>
            </div>
        </div>
    );
};
