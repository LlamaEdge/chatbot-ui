import {IconCheck, IconCopy, IconEdit, IconRobot, IconTrash, IconUser,} from '@tabler/icons-react';
import React, {FC, memo, useContext, useEffect, useRef, useState} from 'react';

import {useTranslation} from 'next-i18next';

import {updateConversation} from '@/utils/app/conversation';

import {Content, Message} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import {CodeBlock} from '../Markdown/CodeBlock';
import {MemoizedReactMarkdown} from '../Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

export interface Props {
    message: Message;
    messageIndex: number;
    onEdit?: (editedMessage: Message) => void
}

const maxImg = 1

export const ChatMessage: FC<Props> = memo(({message, messageIndex, onEdit}) => {
    const {t} = useTranslation('chat');

    const {
        state: {selectedConversation, conversations, currentMessage, messageIsStreaming},
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState("");
    const [messageImageList, setMessageImageList] = useState<string[]>([]);
    const [messagedCopied, setMessageCopied] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
        setIsEditing(!isEditing);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageContent(event.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleEditMessage = () => {
        let textChange = false;
        let imgChange = false;
        let finalContent: string | Content[] = messageContent
        const oldData = getContentData(message.content)
        if (messageImageList.length > 0) {
            if (oldData["imgList"].length === 0 || messageImageList.length !== oldData["imgList"].length) {
                imgChange = true;
            }
            if (oldData["text"] !== messageContent) {
                textChange = true;
            }
            finalContent = [{type: 'text', text: messageContent}]
            messageImageList.forEach((item, index) => {
                if (!imgChange && item !== oldData["imgList"][index]) {
                    imgChange = true;
                }
                if (Array.isArray(finalContent)) {
                    finalContent.push({
                        type: "image_url",
                        image_url: {url: item}
                    })
                }
            })
        } else {
            if (oldData["imgList"].length > 0) {
                imgChange = true;
            }
            if (message.content != messageContent) {
                textChange = true;
            }
        }
        if (textChange || imgChange) {
            if (selectedConversation && onEdit) {
                onEdit({...message, content: finalContent});
            }
        }
        setIsEditing(false);
    };

    const handleDeleteMessage = () => {
        if (!selectedConversation) return;

        const {messages} = selectedConversation;
        const findIndex = messages.findIndex((elm) => elm === message);

        if (findIndex < 0) return;

        if (
            findIndex < messages.length - 1 &&
            messages[findIndex + 1].role === 'assistant'
        ) {
            messages.splice(findIndex, 2);
        } else {
            messages.splice(findIndex, 1);
        }
        const updatedConversation = {
            ...selectedConversation,
            messages,
        };

        const {single, all} = updateConversation(
            updatedConversation,
            conversations,
        );
        homeDispatch({field: 'selectedConversation', value: single});
        homeDispatch({field: 'conversations', value: all});
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
            e.preventDefault();
            handleEditMessage();
        }
    };

    const getContentData = (data: string | Content[]) => {
        let cText = "";
        let isFirst = true;
        let cImgList: string[] = [];
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.type === "text") {
                    if (isFirst) {
                        cText = item["text"] || ""
                    }
                } else if (item.type === "image_url" && item["image_url"]) {
                    cImgList.push(item["image_url"]["url"])
                }
            })
        } else {
            cText = data
        }
        return {text: cText, imgList: cImgList}
    }

    const copyOnClick = () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(getContentData(message.content)["text"]).then(() => {
            setMessageCopied(true);
            setTimeout(() => {
                setMessageCopied(false);
            }, 2000);
        });
    };

    const setMessageData = (data: string | Content[]) => {
        const formatData = getContentData(data);
        setMessageImageList(formatData["imgList"])
        setMessageContent(formatData["text"]);
    }

    useEffect(() => {
        setMessageData(message.content)
    }, [message.content]);


    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);

    const addImg = (imageList: string[]) => {
        if (messageImageList.length + imageList.length <= maxImg) {
            console.log(imageList)
            setMessageImageList((prevImages) => [...prevImages, ...imageList]);
        } else {
            setMessageImageList((prevImages) => {
                const newList = [...prevImages, ...imageList];
                return newList.slice(-maxImg);
            })
        }
    }

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
                addImg(newImages);
            });
        }
    };


    const handleImageRemove = (index: number) => {
        setMessageImageList((prevImages) => {
            const newImages = [...prevImages];
            newImages.splice(index, 1);
            return newImages;
        });
    };

    return (
        <div
            className={`group md:px-4 ${
                message.role === 'assistant'
                    ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
                    : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
            }`}
            style={{overflowWrap: 'anywhere'}}
        >
            <div
                className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                <div className="min-w-[40px] text-right font-bold">
                    {message.role === 'assistant' ? (
                        <IconRobot size={30}/>
                    ) : (
                        <IconUser size={30}/>
                    )}
                </div>

                <div className="prose mt-[-2px] w-full dark:prose-invert">
                    {message.role === 'user' ? (
                        <div className="flex w-full">
                            {isEditing ? (
                                <div className="flex w-full flex-col">
                  <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          padding: '0',
                          margin: '0',
                          overflow: 'hidden',
                      }}
                  />
                                    <div className="flex">
                                        {messageImageList.map((imageSrc, index) => (
                                            <div key={index} style={{
                                                position: 'relative',
                                                display: 'inline-block',
                                                marginRight: '10px'
                                            }}>
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
                                                        className="my-0"
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
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{display: 'none'}}
                                            id="upload-button"
                                        />
                                        <div
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '5px',
                                                border: '1px dashed #ccc',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                lineHeight: '100px',
                                            }}
                                            className={"flex justify-center items-center" + (messageImageList.length >= maxImg ? " hidden" : "")}
                                            onClick={() => {
                                                document.getElementById("upload-button")?.click()
                                            }}
                                        >
                                            <div className="text-4xl">
                                                +
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 flex justify-center space-x-4">
                                        <button
                                            className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                                            onClick={handleEditMessage}
                                            disabled={messageContent.trim().length <= 0}
                                        >
                                            {t('Save & Submit')}
                                        </button>
                                        <button
                                            className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                            onClick={() => {
                                                setMessageData(message.content)
                                                setIsEditing(false);
                                            }}
                                        >
                                            {t('Cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose whitespace-pre-wrap dark:prose-invert flex-1">
                                    {getContentData(message.content)["text"]}
                                    <div className="flex items-center">
                                        {getContentData(message.content)["imgList"].map((imageSrc, index) => (
                                            <div key={index} style={{marginRight: '10px', flex: 1}}>
                                                <img
                                                    src={imageSrc}
                                                    alt="Uploaded"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isEditing && (
                                <div
                                    className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        onClick={toggleEditing}
                                    >
                                        <IconEdit size={20}/>
                                    </button>
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        onClick={handleDeleteMessage}
                                    >
                                        <IconTrash size={20}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-row">
                            <MemoizedReactMarkdown
                                className="prose dark:prose-invert flex-1"
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeMathjax]}
                                components={{
                                    code({node, inline, className, children, ...props}) {
                                        if (children.length) {
                                            if (children[0] == '▍') {
                                                return <span className="animate-pulse cursor-default mt-1">▍</span>
                                            }

                                            children[0] = (children[0] as string).replace("`▍`", "▍")
                                        }

                                        const match = /language-(\w+)/.exec(className || '');

                                        return !inline ? (
                                            <CodeBlock
                                                key={Math.random()}
                                                language={(match && match[1]) || ''}
                                                value={String(children).replace(/\n$/, '')}
                                                {...props}
                                            />
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    table({children}) {
                                        return (
                                            <table
                                                className="border-collapse border border-black px-3 py-1 dark:border-white">
                                                {children}
                                            </table>
                                        );
                                    },
                                    th({children}) {
                                        return (
                                            <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                                                {children}
                                            </th>
                                        );
                                    },
                                    td({children}) {
                                        return (
                                            <td className="break-words border border-black px-3 py-1 dark:border-white">
                                                {children}
                                            </td>
                                        );
                                    },
                                }}
                            >
                                {`${message.content}${
                                    messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                                }`}
                            </MemoizedReactMarkdown>

                            <div
                                className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                                {messagedCopied ? (
                                    <IconCheck
                                        size={20}
                                        className="text-green-500 dark:text-green-400"
                                    />
                                ) : (
                                    <button
                                        className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        onClick={copyOnClick}
                                    >
                                        <IconCopy size={20}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
ChatMessage.displayName = 'ChatMessage';
