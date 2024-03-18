import { useEffect } from 'react';
const IndexPage = () => {
    useEffect(() => {
        window.location.href = '/chatbot-ui';
    }, []);

    return null;
};

export default IndexPage;