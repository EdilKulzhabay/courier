import { getTokenData } from '@/utils/storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {

    const [initialRoute, setInitialRoute] = useState<"./start" | "./main">("./start");


    const checkToken = async () => {
        const token = await getTokenData();
        setInitialRoute(token ? "./main" : "./start");
    };

    useEffect(() => {
        checkToken();
    }, []);

    return <Redirect href={initialRoute} />;
} 