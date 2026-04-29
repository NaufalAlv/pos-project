"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBridge = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bufferManager_1 = require("./bufferManager");
class TransactionBridge {
    constructor(posApiUrl, pumpSecret) {
        this.posApiUrl = posApiUrl;
        this.pumpSecret = pumpSecret;
    }
    /**
     * Inject a completed pump session into the POS transaction system
     */
    async injectTransaction(session) {
        // Step 1: Assign global_uid if known, otherwise leave undefined for POS to resolve later
        const global_uid = undefined; // Anonymous by default for pure pump sim
        const payload = {
            external_transaction_id: session.id,
            fuel_type: session.fuel_type,
            litres_dispensed: session.litres_dispensed,
            total_cost: session.total_cost,
            price_per_litre: session.price_per_litre,
            pump_id: session.pump_id,
            global_uid
        };
        const serviceToken = jsonwebtoken_1.default.sign({ service: 'pump-controller', session_id: session.id }, this.pumpSecret, { expiresIn: '5m' });
        try {
            const res = await axios_1.default.post(`${this.posApiUrl}/transactions/pump-inject`, payload, {
                headers: {
                    'Authorization': `Bearer ${serviceToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            });
            console.log(`[TransactionBridge] Injection successful: ${res.data.transactionId}`);
            return true;
        }
        catch (error) {
            if (error.response?.status === 409) {
                console.log(`[TransactionBridge] Transaction already exists (idempotent): ${session.id}`);
                return true;
            }
            console.error(`[TransactionBridge] Injection failed, buffering: ${error.message}`);
            await bufferManager_1.bufferManager.enqueue({
                global_uid: global_uid || 'ANONYMOUS',
                nozzle_id: 1, // default or from session if available
                fuel_type: session.fuel_type,
                volume_liters: session.litres_dispensed,
                price_per_liter_idr: session.price_per_litre,
                total_amount_idr: session.total_cost,
                status: 'PENDING',
                retry_count: 0,
                max_retries: 5,
                pump_timestamp: new Date().toISOString(),
                source_device_id: process.env.PUMP_DEVICE_ID ?? 'PUMP-01',
                external_transaction_id: session.id
            });
            return false;
        }
    }
    /**
     * Retry buffered transactions
     */
    async retryBuffered() {
        const buffer = await bufferManager_1.bufferManager.load();
        const buffered = buffer.pending;
        if (buffered.length === 0)
            return;
        console.log(`[TransactionBridge] Retrying ${buffered.length} buffered transactions...`);
        const remaining = [];
        for (const record of buffered) {
            const payload = {
                external_transaction_id: record.external_transaction_id || record.buffer_id,
                fuel_type: record.fuel_type,
                litres_dispensed: record.volume_liters,
                total_cost: record.total_amount_idr,
                price_per_litre: record.price_per_liter_idr,
                pump_id: record.nozzle_id,
                global_uid: record.global_uid === 'ANONYMOUS' ? undefined : record.global_uid
            };
            const serviceToken = jsonwebtoken_1.default.sign({ service: 'pump-controller', session_id: payload.external_transaction_id }, this.pumpSecret, { expiresIn: '5m' });
            try {
                await axios_1.default.post(`${this.posApiUrl}/transactions/pump-inject`, payload, {
                    headers: {
                        'Authorization': `Bearer ${serviceToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000,
                });
                console.log(`[TransactionBridge] Buffered tx injected: ${payload.external_transaction_id}`);
                await bufferManager_1.bufferManager.markSynced(record.buffer_id);
            }
            catch (error) {
                if (error.response?.status === 409) {
                    console.log(`[TransactionBridge] Already exists: ${payload.external_transaction_id}`);
                    await bufferManager_1.bufferManager.markSynced(record.buffer_id);
                }
                else {
                    remaining.push(record);
                }
            }
        }
        await bufferManager_1.bufferManager.replacePending(remaining);
    }
}
exports.TransactionBridge = TransactionBridge;
