import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface BufferTransaction {
    buffer_id: string;
    global_uid: string;
    nozzle_id: number;
    fuel_type: string;
    volume_liters: number;
    price_per_liter_idr: number;
    total_amount_idr: number;
    status: 'PENDING' | 'SYNCED' | 'FAILED' | 'RETRY';
    retry_count: number;
    max_retries: number;
    pump_timestamp: string;
    queued_at: string;
    synced_at?: string;
    source_device_id: string;
    server_transaction_uid?: string;
    external_transaction_id?: string;
}

export interface PumpBuffer {
    schema_version: '2.0.0';
    device_id: string;
    last_sync_attempt: string;
    pending: BufferTransaction[];
    failed: BufferTransaction[];
}

const BUFFER_PATH = path.resolve(__dirname, '../../data/buffer.json');

class BufferManager {
    private buffer: PumpBuffer | null = null;

    async load(): Promise<PumpBuffer> {
        try {
            await fs.mkdir(path.dirname(BUFFER_PATH), { recursive: true });
            const raw = await fs.readFile(BUFFER_PATH, 'utf-8');
            const parsed = JSON.parse(raw);

            if (!parsed.schema_version || parsed.schema_version === '1.0.0' || !parsed.schema_version.startsWith('2.')) {
                console.warn('[Buffer] Detected legacy buffer format — migrating to v2.0.0');
                return await this.migrateLegacyBuffer(parsed);
            }

            this.buffer = parsed as PumpBuffer;
            return this.buffer;
        } catch {
            return this.initializeFreshBuffer();
        }
    }

    private async migrateLegacyBuffer(legacy: any): Promise<PumpBuffer> {
        const migratedPending: BufferTransaction[] = (legacy.pending ?? legacy ?? []).map(
            (old: any): BufferTransaction => ({
                buffer_id: uuidv4(),
                global_uid: old.global_uid ?? 'MIGRATION-UNKNOWN-REQUIRES-RESOLUTION',
                nozzle_id: old.nozzle ?? old.nozzle_id ?? 0,
                fuel_type: old.fuel_type ?? 'PERTAMAX',
                volume_liters: old.volume_L ?? old.volume_liters ?? old.litres_dispensed ?? 0,
                price_per_liter_idr: old.price_per_liter ?? old.price_per_liter_idr ?? 0,
                total_amount_idr: old.total ?? old.total_amount_idr ?? old.total_cost ?? 0,
                status: 'PENDING',
                retry_count: 0,
                max_retries: 5,
                pump_timestamp: old.timestamp ?? new Date().toISOString(),
                queued_at: new Date().toISOString(),
                source_device_id: old.device_id ?? 'MIGRATED-UNKNOWN',
                external_transaction_id: old.external_transaction_id || undefined
            })
        );

        const newBuffer: PumpBuffer = {
            schema_version: '2.0.0',
            device_id: legacy.device_id ?? 'PUMP-TERMINAL-01',
            last_sync_attempt: new Date().toISOString(),
            pending: migratedPending,
            failed: [],
        };

        await this.save(newBuffer);
        console.log(`[Buffer] Migration complete. ${migratedPending.length} records migrated.`);
        this.buffer = newBuffer;
        return newBuffer;
    }

    async enqueue(transaction: Omit<BufferTransaction, 'buffer_id' | 'queued_at'>): Promise<string> {
        const buffer = await this.load();
        
        const entry: BufferTransaction = {
            ...transaction,
            buffer_id: uuidv4(),
            queued_at: new Date().toISOString(),
        };

        buffer.pending.push(entry);
        await this.save(buffer);
        
        return entry.buffer_id;
    }

    async markSynced(bufferId: string, serverTransactionUid?: string): Promise<void> {
        const buffer = await this.load();
        buffer.pending = buffer.pending.filter(t => t.buffer_id !== bufferId);
        await this.save(buffer);
    }

    async replacePending(items: BufferTransaction[]): Promise<void> {
        const buffer = await this.load();
        buffer.pending = items;
        await this.save(buffer);
    }

    private async save(buffer: PumpBuffer): Promise<void> {
        await fs.writeFile(BUFFER_PATH, JSON.stringify(buffer, null, 2), 'utf-8');
        this.buffer = buffer;
    }

    private async initializeFreshBuffer(): Promise<PumpBuffer> {
        const fresh: PumpBuffer = {
            schema_version: '2.0.0',
            device_id: process.env.PUMP_DEVICE_ID ?? 'PUMP-TERMINAL-01',
            last_sync_attempt: new Date().toISOString(),
            pending: [],
            failed: [],
        };
        await this.save(fresh);
        return fresh;
    }
}

export const bufferManager = new BufferManager();
// Provide default export for backward compatibility with index.ts
export default BufferManager;
