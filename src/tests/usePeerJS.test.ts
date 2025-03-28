import { renderHook, act } from '@testing-library/react';
import { usePeerJS } from '../renderer/hooks/usePeerJS';

// 模拟PeerJS和文件系统
jest.mock('peerjs');
jest.mock('electron', () => ({
    ipcRenderer: {
        invoke: jest.fn()
    }
}));

describe('usePeerJS Hook', () => {
    test('初始化后状态正确', () => {
        const { result } = renderHook(() => usePeerJS());

        expect(result.current.isReady).toBe(false);
        expect(result.current.status).toBe('idle');
        expect(result.current.transfers).toEqual([]);
    });

    test('文件传输功能', async () => {
        // 测试文件传输流程
    });
}); 