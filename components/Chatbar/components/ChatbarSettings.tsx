import {
    IconBrandGithub,
    IconBrandTwitter, IconDice1, IconDice3, IconEaseIn,
    IconFaceId,
    IconFaceMask, IconFeather,
    IconFileExport, IconRobot,
    IconSettings, IconShieldCode, IconShieldCog, IconSock, IconSofa
} from '@tabler/icons-react';
import {useContext, useState} from 'react';

import {useTranslation} from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import {SettingDialog} from '@/components/Settings/SettingDialog';

import {Import} from '../../Settings/Import';
import { QueryUrl } from '../../Settings/QueryUrl';
import {SidebarButton} from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import {ClearConversations} from './ClearConversations';

export const ChatbarSettings = () => {
    const {t} = useTranslation('sidebar');
    const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);

    const {
        state: {
            api,
            apiKey,
            lightMode,
            serverSideApiKeyIsSet,
            serverSidePluginKeysSet,
            conversations,
        },
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const {
        handleClearConversations,
        handleImportConversations,
        handleExportData,
        handleApiChange,
        handleApiKeyChange,
    } = useContext(ChatbarContext);

    return (
        <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
            {conversations.length > 0 ? (
                <ClearConversations onClearConversations={handleClearConversations}/>
            ) : null}

            {/*<Import onImport={handleImportConversations}/>*/}

            <SidebarButton
                text="Follow us on twitter"
                icon={<IconBrandTwitter size={18}/>}
                onClick={() => window.open("https://twitter.com/realwasmedge","_blank")}
            />

            <SidebarButton
                text="GitHub"
                icon={<IconBrandGithub size={18}/>}
                onClick={() => window.open("https://github.com/second-state/LlamaEdge","_blank")}
            />

            <SidebarButton
                text="Huggingface"
                icon={<IconRobot size={18}/>}
                onClick={() => window.open("https://huggingface.co/second-state","_blank")}
            />

            <SidebarButton
                text={t('Settings')}
                icon={<IconSettings size={18} />}
                onClick={() => setIsSettingDialog(true)}
            />

            <QueryUrl api={api} onApiChange={handleApiChange} />

            {/*<Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />*/}

            {/*{!serverSidePluginKeysSet ? <PluginKeys /> : null}*/}

            <SettingDialog
                open={isSettingDialogOpen}
                onClose={() => {
                    setIsSettingDialog(false);
                }}
            />
        </div>
    );
};
