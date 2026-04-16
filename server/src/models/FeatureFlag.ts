import { db } from '../config/db';

export interface FeatureFlag {
    id?: number;
    key: string;
    enabled: number; // 0 or 1
    description?: string;
    created_at?: string;
}

export const getAllFlags = (): FeatureFlag[] => {
    const stmt = db.prepare('SELECT * FROM feature_flags ORDER BY key ASC');
    return stmt.all() as FeatureFlag[];
};

export const getFlag = (key: string): FeatureFlag | null => {
    const stmt = db.prepare('SELECT * FROM feature_flags WHERE key = ?');
    const flag = stmt.get(key) as FeatureFlag | undefined;
    return flag || null;
};

export const setFlag = (key: string, enabled: boolean): void => {
    const stmt = db.prepare('UPDATE feature_flags SET enabled = ? WHERE key = ?');
    stmt.run(enabled ? 1 : 0, key);
};

export const createFlag = (key: string, description: string): void => {
    const stmt = db.prepare('INSERT OR IGNORE INTO feature_flags (key, enabled, description) VALUES (?, 0, ?)');
    stmt.run(key, description);
};
