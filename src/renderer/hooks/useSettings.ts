import { useState, useEffect } from 'react';

export const useSettings = () => {
    const [chunkSize, setChunkSize] = useState<number>(16384); // 默认16KB

    // 从存储加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await window.electron.invoke('settings:get');
                if (settings?.chunkSize) {
                    setChunkSize(settings.chunkSize);
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            }
        };

        loadSettings();
    }, []);

    // 保存分块大小设置
    const saveChunkSize = async (size: number) => {
        try {
            await window.electron.invoke('settings:set', { chunkSize: size });
            setChunkSize(size);
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    };

    return { chunkSize, saveChunkSize };
}; 