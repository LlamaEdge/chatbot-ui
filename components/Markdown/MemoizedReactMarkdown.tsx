import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';

const ProcessContent = ({ children }: { children: string }) => {
    const parts = [];
    let currentIndex = 0;
    // First check if there's a lone </think> tag
    const endThinkMatch = children.match(/<\/think>/);
    if (endThinkMatch && !children.slice(0, endThinkMatch.index).includes('<think>')) {
        // If we find a lone </think>, treat all content before it as think content
        console.log(endThinkMatch)
        console.log(endThinkMatch.input)
        if(children.slice(0, endThinkMatch.index) && children.slice(0, endThinkMatch.index).trim() !== "") {
            if (endThinkMatch.index! > 0) {
                parts.push(
                    <div key="think-start" className="bg-gray-200 dark:bg-gray-600  p-4 my-2 rounded-lg border-l-4 border-gray-500 dark:border-gray-200">
                        <ReactMarkdown>{children.slice(0, endThinkMatch.index)}</ReactMarkdown>
                    </div>
                );
            }
        }
        // Add remaining content after </think>
        if (endThinkMatch.index! + 8 < children.length) {
            parts.push(
                <ReactMarkdown key="after-think">
                    {children.slice(endThinkMatch.index! + 8)}
                </ReactMarkdown>
            );
        }
    } else {
        // Regular processing for properly paired think tags
        const regex = /<think>([\s\S]*?)<\/think>/g;
        let match;
        while ((match = regex.exec(children)) !== null) {
            // Add content before the think tag
            if (match.index > currentIndex) {
                parts.push(
                    <ReactMarkdown key={`text-${currentIndex}`}>
                        {children.slice(currentIndex, match.index)}
                    </ReactMarkdown>
                );
            }
            if(match[1].trim() !== "") {
                parts.push(
                    <div key={`think-${match.index}`}
                         className="bg-gray-200 dark:bg-gray-600 p-4 my-2 rounded-lg border-l-4 border-gray-500 dark:border-gray-200">
                        <ReactMarkdown>{match[1]}</ReactMarkdown>
                    </div>
                );
            }

            currentIndex = match.index + match[0].length;
        }

        // Add any remaining content
        if (currentIndex < children.length) {
            parts.push(
                <ReactMarkdown key={`text-${currentIndex}`}>
                    {children.slice(currentIndex)}
                </ReactMarkdown>
            );
        }
    }

    return <div>{parts}</div>;
};

// eslint-disable-next-line react/display-name
export const MemoizedReactMarkdown: FC<Options> = memo(
    ({ children, ...props }) => (
        <ProcessContent {...props}>
            {typeof children === 'string' ? children : ''}
        </ProcessContent>
    ),
    (prevProps, nextProps) => prevProps.children === nextProps.children
);
