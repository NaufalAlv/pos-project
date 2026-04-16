import fs from 'fs';
import path from 'path';

const BUFFER_PATH = path.resolve(__dirname, '../../buffer.json');

export class BufferManager {
    getBuffer(): any[] {
        try {
            const data = fs.readFileSync(BUFFER_PATH, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    addToBuffer(payload: any): void {
        const buffer = this.getBuffer();
        buffer.push({ ...payload, buffered_at: Date.now() });
        this.writeBuffer(buffer);
        console.log(`[BufferManager] Transaction buffered. Queue size: ${buffer.length}`);
    }

    replaceBuffer(items: any[]): void {
        this.writeBuffer(items);
    }

    clearBuffer(): void {
        this.writeBuffer([]);
    }

    private writeBuffer(data: any[]): void {
        try {
            fs.writeFileSync(BUFFER_PATH, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[BufferManager] Failed to write buffer:', err);
        }
    }
}
