import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PumpSession } from './pumpStateMachine';
import { BufferManager } from './bufferManager';

export class TransactionBridge {
    private posApiUrl: string;
    private pumpSecret: string;
    private buffer: BufferManager;

    constructor(posApiUrl: string, pumpSecret: string, buffer: BufferManager) {
        this.posApiUrl = posApiUrl;
        this.pumpSecret = pumpSecret;
        this.buffer = buffer;
    }

    /**
     * Inject a completed pump session into the POS transaction system
     */
    async injectTransaction(session: PumpSession): Promise<boolean> {
        const payload = {
            external_transaction_id: session.id,
            fuel_type: session.fuel_type,
            litres_dispensed: session.litres_dispensed,
            total_cost: session.total_cost,
            price_per_litre: session.price_per_litre,
            pump_id: session.pump_id,
        };

        // Sign a service JWT
        const serviceToken = jwt.sign(
            { service: 'pump-controller', session_id: session.id },
            this.pumpSecret,
            { expiresIn: '5m' }
        );

        try {
            const res = await axios.post(
                `${this.posApiUrl}/transactions/pump-inject`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 5000,
                }
            );

            console.log(`[TransactionBridge] Injection successful: ${res.data.transactionId}`);
            return true;
        } catch (error: any) {
            if (error.response?.status === 409) {
                console.log(`[TransactionBridge] Transaction already exists (idempotent): ${session.id}`);
                return true; // Already injected — success
            }

            console.error(`[TransactionBridge] Injection failed, buffering: ${error.message}`);
            this.buffer.addToBuffer(payload);
            return false;
        }
    }

    /**
     * Retry buffered transactions
     */
    async retryBuffered(): Promise<void> {
        const buffered = this.buffer.getBuffer();
        if (buffered.length === 0) return;

        console.log(`[TransactionBridge] Retrying ${buffered.length} buffered transactions...`);

        const remaining: any[] = [];

        for (const payload of buffered) {
            const serviceToken = jwt.sign(
                { service: 'pump-controller', session_id: payload.external_transaction_id },
                this.pumpSecret,
                { expiresIn: '5m' }
            );

            try {
                await axios.post(
                    `${this.posApiUrl}/transactions/pump-inject`,
                    payload,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceToken}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 5000,
                    }
                );
                console.log(`[TransactionBridge] Buffered tx injected: ${payload.external_transaction_id}`);
            } catch (error: any) {
                if (error.response?.status === 409) {
                    console.log(`[TransactionBridge] Already exists: ${payload.external_transaction_id}`);
                } else {
                    remaining.push(payload);
                }
            }
        }

        this.buffer.replaceBuffer(remaining);
    }
}
