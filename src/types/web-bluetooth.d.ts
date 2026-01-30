interface BluetoothNavigator extends Navigator {
    bluetooth: Bluetooth;
}

interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: (BluetoothServiceUUID)[];
    acceptAllDevices?: boolean;
}

interface BluetoothLEScanFilter {
    name?: string;
    namePrefix?: string;
    services?: (BluetoothServiceUUID)[];
}

type BluetoothServiceUUID = number | string;

interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    watchAdvertisements(options?: { signal?: AbortSignal }): Promise<void>;
    unwatchAdvertisements(): void;
    watchingAdvertisements: boolean;
}

interface BluetoothAdvertisingEvent extends Event {
    device: BluetoothDevice;
    uuids: BluetoothServiceUUID[];
    manufacturerData: BluetoothManufacturerDataMap;
    serviceData: BluetoothServiceDataMap;
    name?: string;
    rssi?: number;
    txPower?: number;
    appearance?: number;
}

type BluetoothManufacturerDataMap = Map<number, DataView>;
type BluetoothServiceDataMap = Map<BluetoothServiceUUID, DataView>;

interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
    uuid: string;
    device: BluetoothDevice;
    isPrimary: boolean;
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

type BluetoothCharacteristicUUID = number | string;

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    getDescriptor(descriptor: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor>;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
}

interface BluetoothRemoteGATTDescriptor {
    characteristic: BluetoothRemoteGATTCharacteristic;
    uuid: string;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
}

type BluetoothDescriptorUUID = number | string;

// Extend the global Navigator interface
interface Navigator {
    bluetooth: Bluetooth;
}
