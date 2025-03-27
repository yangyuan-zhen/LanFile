/**
 * 格式化字节大小为人类可读格式
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化秒数为可读时间
 */
export function formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}小时${mins}分钟`;
    } else if (mins > 0) {
        return `${mins}分钟${secs}秒`;
    } else {
        return `${secs}秒`;
    }
} 