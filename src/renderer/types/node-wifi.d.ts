declare module 'node-wifi' {
    interface WiFiNetwork {
        ssid: string;
        mac: string;
        channel: number;
        signal_level: number;
    }

    export function init(config: { iface?: string | null }): void;
    export function getCurrentConnections(): Promise<WiFiNetwork[]>;
    export default { init, getCurrentConnections };
} 