import {Toaster} from 'react-hot-toast';
import {QueryClient, QueryClientProvider} from 'react-query';

import {appWithTranslation} from 'next-i18next';
import {Inter} from 'next/font/google';

import '@/styles/globals.css';

const inter = Inter({subsets: ['latin']});

function App({Component, pageProps}) {
    const queryClient = new QueryClient();

    return (
        <div className={inter.className}>
            <Toaster/>
            <QueryClientProvider client={queryClient}>
                <Component {...pageProps} />
            </QueryClientProvider>
        </div>
    );
}

export default appWithTranslation(App);
