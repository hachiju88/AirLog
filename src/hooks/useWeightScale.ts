import { useState, useCallback } from 'react';
import { toast } from "sonner";

interface WeightData {
    weight: number;
    unit: 'kg' | 'lbs';
    timestamp?: Date;
}

interface UseWeightScaleReturn {
    connect: () => Promise<void>;
    disconnect: () => void;
    weightData: WeightData | null;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    logs: string[];
    lastRawHex: string | null;
    lastRawValues: number[];
}

const OPTIONAL_SERVICES = [
    0x181D, 0x181B, 0x180A, 0x180F, 0xFFF0, 0xFFE0, 0xFFB0, 0xFF00, 0xF000,
    "0000181d-0000-1000-8000-00805f9b34fb",
    "0000ffb0-0000-1000-8000-00805f9b34fb"
];

const OPTIONAL_MANUFACTURER_DATA = [
    0xFFFF, 0x0000, 0x01E0, 0xA0AC, 0x0059, 0x000D, 0x004C, 0x0075, 0x0087, 0x006B, 0x03B7, 0x027D, 0x2424, 0x0160,
];

export function useWeightScale(): UseWeightScaleReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [weightData, setWeightData] = useState<WeightData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [device, setDevice] = useState<BluetoothDevice | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // Calibration Helpers
    const [lastRawHex, setLastRawHex] = useState<string | null>(null);
    const [lastRawValues, setLastRawValues] = useState<number[]>([]);
    const [lastProcessedHex, setLastProcessedHex] = useState<string>("");

    const addLog = useCallback((message: string) => {

        setLogs(prev => [message, ...prev].slice(0, 50));
    }, []);

    const parseWeight = useCallback((dataView: DataView) => {
        try {
            if (dataView.byteLength < 2) return null;
            if (dataView.byteLength >= 3) {
                const flags = dataView.getUint8(0);
                const unit = (flags & 0x01) ? 'lbs' : 'kg';
                const rawWeight = dataView.getUint16(1, true);
                let weight = 0;
                if (unit === 'kg') weight = rawWeight * 0.005;
                else weight = rawWeight * 0.01;
                return { weight: Math.round(weight * 100) / 100, unit };
            }
            return null;
        } catch (e: any) { return null; }
    }, []);

    const handleAdvertisementReceived = useCallback((event: any) => {
        // Standard Service Data
        if (event.serviceData && event.serviceData.size > 0) {
            event.serviceData.forEach((value: DataView, key: string) => {
                if (key.includes("181d") || key === "0000181d-0000-1000-8000-00805f9b34fb") {
                    const parsed = parseWeight(value);
                    if (parsed) {
                        setWeightData({ weight: parsed.weight, unit: parsed.unit as 'kg' | 'lbs', timestamp: new Date() });
                    }
                }
            });
        }

        // Manufacturer Data (Chocozap etc)
        if (event.manufacturerData) {
            event.manufacturerData.forEach((value: DataView, key: number) => {
                if (key === 0xA0AC) {
                    const bytes = new Uint8Array(value.buffer);
                    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

                    setLastRawHex(hex);
                    const vals: number[] = [];
                    for (let i = 0; i < value.byteLength - 1; i++) {
                        vals.push(value.getUint16(i, true));
                    }
                    setLastRawValues(vals);

                    // *** CHOCOZAP AFFINE DECRYPTION ***
                    // Formula: Weight = 120.11 - 0.00158 * (Val ^ 0xD4D4)
                    // Val is uint16 at Offset 7 (Little Endian)

                    if (value.byteLength >= 9) {
                        // Get uint16 at offset 7
                        const rawVal = value.getUint16(7, true);
                        const valXor = rawVal ^ 0xD4D4;

                        // Slope m = 18.2 / -11520 = -0.00157986
                        const m = -0.00157986;
                        // Intercept c = 72.8 - m * 29944 = 120.11
                        const c = 120.11;

                        let weight = m * valXor + c;
                        weight = Math.round(weight * 100) / 100; // Round to 2 decimals

                        // Determine Status (Offset 6)
                        const statusByte = value.getUint8(6);
                        // 0x20: Stable (Capture this)
                        // 0xA0: Measuring (Update UI but don't toast/save)
                        // 0xA2: History/Idle (Ignore)

                        // Filter logic
                        if (statusByte === 0xA2) {
                            // Ignore history to prevent overwriting
                            return;
                        }

                        if (hex !== lastProcessedHex) {
                            if (weight > 5 && weight < 200) {
                                setWeightData({ weight, unit: 'kg', timestamp: new Date() });
                                setLastProcessedHex(hex);

                                // Only act on Stable
                                if (statusByte === 0x20) {
                                    // Stable & Valid
                                    toast.success(`測定完了: ${weight}kg`);
                                    addLog(`CM3-HM (Stable): ${weight}kg`);
                                    // Optional: Disconnect here if needed?
                                } else {
                                    // Measuring...
                                    // Quiet log if debug needed
                                }
                            }
                        }
                    }
                }
            });
        }
    }, [addLog, parseWeight, lastProcessedHex]);

    const connect = useCallback(async () => {
        setError(null);
        setIsScanning(true);
        addLog("Starting connect sequence...");

        try {
            if (!navigator.bluetooth) throw new Error('Web Bluetooth API is not available.');

            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: OPTIONAL_SERVICES,
                optionalManufacturerData: OPTIONAL_MANUFACTURER_DATA
            } as any);

            setDevice(device);
            const toastId = toast.loading("接続中... (Chocozap対応)");

            if (device.watchAdvertisements) {
                await device.watchAdvertisements();
                device.addEventListener('advertisementreceived', handleAdvertisementReceived);
                addLog("Listening to advertisements...");
            } else {
                addLog("Warning: watchAdvertisements not supported");
            }

            try {
                await device.gatt?.connect();
            } catch (e: any) {
                addLog("Connection skipped (Broadcast mode)");
            }

            setIsConnected(true);
            toast.dismiss(toastId);
            toast.info("データ待機中... 体重計に乗ってください");

            device.addEventListener('gattserverdisconnected', () => {
                if (!device.watchingAdvertisements) setIsConnected(false);
            });

        } catch (err: any) {
            addLog(`Error: ${err.message}`);
            toast.dismiss();
            setError(err.message);
            toast.error("接続できませんでした");
            setIsConnected(false);
            setDevice(null);
        } finally {
            setIsScanning(false);
        }
    }, [addLog, handleAdvertisementReceived]);

    const disconnect = useCallback(() => {
        if (device) {
            if (device.gatt?.connected) device.gatt.disconnect();
            if (device.unwatchAdvertisements) device.unwatchAdvertisements();
            device.removeEventListener('advertisementreceived', handleAdvertisementReceived);
        }
        setDevice(null);
        setIsConnected(false);
        setWeightData(null);
        setLogs([]);
        setLastRawHex(null);
        setLastRawValues([]);
    }, [device, handleAdvertisementReceived]);

    return {
        connect, disconnect, weightData, isConnected, isScanning, error, logs,
        lastRawHex, lastRawValues
    };
}
