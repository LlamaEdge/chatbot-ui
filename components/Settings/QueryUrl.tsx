import {IconCheck, IconLink, IconX} from '@tabler/icons-react';
import {FC, KeyboardEvent, useEffect, useRef, useState} from 'react';

import {useTranslation} from 'next-i18next';

import {SidebarButton} from '../Sidebar/SidebarButton';

interface Props {
    api: string;
    onApiChange: (apiKey: string) => void;
}

export const QueryUrl: FC<Props> = ({api, onApiChange}) => {
    const {t} = useTranslation('sidebar');
    const [isChanging, setIsChanging] = useState(false);
    const [newKey, setNewKey] = useState(api);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUpdateKey(newKey);
        }
    };

    const handleUpdateKey = (newKey: string) => {
        onApiChange(newKey.trim());
        setIsChanging(false);
    };

    useEffect(() => {
        if (isChanging) {
            inputRef.current?.focus();
        }
    }, [isChanging]);

    return isChanging ? (
        <div
            className="duration:200 flex w-full cursor-pointer items-center rounded-md py-3 px-3 transition-colors hover:bg-gray-500/10">
            <IconLink size={18}/>

            <input
                ref={inputRef}
                className="ml-2 h-[20px] flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={handleEnterDown}
                placeholder={t('API Url') || 'API Url'}
            />

            <div className="flex w-[40px]">
                <IconCheck
                    className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateKey(newKey);
                    }}
                />

                <IconX
                    className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsChanging(false);
                        setNewKey(api);
                    }}
                />
            </div>
        </div>
    ) : (
        <SidebarButton
            text={t('Chat API Url')}
            icon={<IconLink size={18}/>}
            onClick={() => setIsChanging(true)}
        />
    );
};
