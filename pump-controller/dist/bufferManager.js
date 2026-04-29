"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferManager = void 0;
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const BUFFER_PATH = path_1.default.resolve(__dirname, '../../data/buffer.json');
class BufferManager {
    constructor() {
        this.buffer = null;
    }
    async load() {
        try {
            await promises_1.default.mkdir(path_1.default.dirname(BUFFER_PATH), { recursive: true });
            const raw = await promises_1.default.readFile(BUFFER_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            if (!parsed.schema_version || parsed.schema_version === '1.0.0' || !parsed.schema_version.startsWith('2.')) {
                console.warn('[Buffer] Detected legacy buffer format — migrating to v2.0.0');
                return await this.migrateLegacyBuffer(parsed);
            }
            this.buffer = parsed;
            return this.buffer;
        }
        catch {
            return this.initializeFreshBuffer();
        }
    }
    async migrateLegacyBuffer(legacy) {
        const migratedPending = (legacy.pending ?? legacy ?? []).map((old) => ({
            buffer_id: (0, uuid_1.v4)(),
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
        }));
        const newBuffer = {
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
    async enqueue(transaction) {
        const buffer = await this.load();
        const entry = {
            ...transaction,
            buffer_id: (0, uuid_1.v4)(),
            queued_at: new Date().toISOString(),
        };
        buffer.pending.push(entry);
        await this.save(buffer);
        return entry.buffer_id;
    }
    async markSynced(bufferId, serverTransactionUid) {
        const buffer = await this.load();
        buffer.pending = buffer.pending.filter(t => t.buffer_id !== bufferId);
        await this.save(buffer);
    }
    async replacePending(items) {
        const buffer = await this.load();
        buffer.pending = items;
        await this.save(buffer);
    }
    async save(buffer) {
        await promises_1.default.writeFile(BUFFER_PATH, JSON.stringify(buffer, null, 2), 'utf-8');
        this.buffer = buffer;
    }
    async initializeFreshBuffer() {
        const fresh = {
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
exports.bufferManager = new BufferManager();
// Provide default export for backward compatibility with index.ts
exports.default = BufferManager;
