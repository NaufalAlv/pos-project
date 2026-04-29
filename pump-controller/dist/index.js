"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const pumpStateMachine_1 = require("./pumpStateMachine");
const telemetryEmitter_1 = require("./telemetryEmitter");
const transactionBridge_1 = require("./transactionBridge");
const bufferManager_1 = require("./bufferManager");
const chaosEngine_1 = require("./chaosEngine");
const storageTankManager_1 = require("./storageTankManager");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const port = process.env.PORT || 5001;
const pumpSecret = process.env.PUMP_SERVICE_SECRET || '';
const posApiUrl = process.env.POS_API_URL || 'http://localhost:5000/api';
const NUM_PUMPS = Number(process.env.NUM_PUMPS || 2);
// Socket.io
const io = new socket_io_1.Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Initialize Services ---
const pumps = new Map();
for (let i = 1; i <= NUM_PUMPS; i++) {
    pumps.set(i, new pumpStateMachine_1.PumpStateMachine(i));
}
const tankManager = new storageTankManager_1.StorageTankManager();
tankManager.setSocket(io);
const pumpArray = Array.from(pumps.values());
const telemetry = new telemetryEmitter_1.TelemetryEmitter(io, pumpArray, tankManager);
const bridge = new transactionBridge_1.TransactionBridge(posApiUrl, pumpSecret);
const chaos = new chaosEngine_1.ChaosEngine(pumps, telemetry, tankManager);
// Start the telemetry broadcast loop
telemetry.start();
/**
 * Fetch fuel configs from POS API and initialize storage tanks
 */
async function initTanksFromPOS() {
    try {
        const serviceToken = jsonwebtoken_1.default.sign({ service: 'pump-controller' }, pumpSecret, { expiresIn: '1h' });
        const res = await axios_1.default.get(`${posApiUrl}/fuel-config/active`, {
            headers: { Authorization: `Bearer ${serviceToken}` },
            timeout: 5000,
        });
        const configs = res.data.map((fc) => ({
            fuel_type: fc.fuel_type,
            capacity_litres: fc.tank_capacity || 10000,
            refuel_speed: fc.refuel_speed || 50,
        }));
        tankManager.initTanks(configs);
    }
    catch (error) {
        console.warn(`[PumpController] Could not fetch fuel configs from POS: ${error.message}`);
        console.log('[PumpController] Using default tank configuration');
        tankManager.initTanks([
            { fuel_type: 'Pertamax', capacity_litres: 10000, refuel_speed: 50 },
            { fuel_type: 'Pertalite', capacity_litres: 10000, refuel_speed: 50 },
            { fuel_type: 'Solar', capacity_litres: 8000, refuel_speed: 40 },
        ]);
    }
}
// --- Pump state change listener (per-pump) ---
for (const [pumpId, pump] of pumps) {
    pump.setOnStateChange(async (session) => {
        console.log(`[Pump ${pumpId}] State: ${session.state} | Litres: ${session.litres_dispensed} | Cost: ${session.total_cost}`);
        io.emit('state_change', {
            pump_id: pumpId,
            state: session.state,
            session_id: session.id,
            fault_type: session.fault_type,
            timestamp: Date.now(),
        });
        // On COMPLETED — inject transaction to POS as PENDING
        if (session.state === 'COMPLETED') {
            console.log(`[Pump ${pumpId}] Session completed. Injecting PENDING transaction: ${session.id}`);
            await bridge.injectTransaction(session);
        }
    });
}
// --- Retry buffered transactions every 30 seconds ---
setInterval(() => { bridge.retryBuffered(); }, 30000);
// --- Helper: get pump or return 404 ---
function getPump(req, res) {
    const pumpId = Number(req.params.pumpId);
    const pump = pumps.get(pumpId);
    if (!pump) {
        res.status(404).json({ message: `Pump ${pumpId} not found. Available: ${Array.from(pumps.keys()).join(', ')}` });
        return null;
    }
    return pump;
}
// ==========================================
//   PUMP REST ENDPOINTS (per-pump via :pumpId)
// ==========================================
/**
 * GET /api/pumps — list all pump statuses
 */
app.get('/api/pumps', async (req, res) => {
    const statuses = Array.from(pumps.entries()).map(([id, pump]) => {
        const session = pump.getSession();
        return {
            ...session,
            chaos: chaos.getActiveFault(id),
        };
    });
    const buf = await bufferManager_1.bufferManager.load();
    res.json({ pumps: statuses, tanks: tankManager.getTankStatus(), buffer_size: buf.pending.length });
});
/**
 * POST /api/pump/:pumpId/authorize
 */
app.post('/api/pump/:pumpId/authorize', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    const { fuel_type, price_per_litre, token, target_litres, target_cost } = req.body;
    if (!fuel_type || !price_per_litre) {
        return res.status(400).json({ message: 'fuel_type and price_per_litre are required' });
    }
    const tankCheck = tankManager.canAuthorize(fuel_type);
    if (!tankCheck.allowed) {
        return res.status(409).json({ message: tankCheck.reason });
    }
    if (token) {
        try {
            console.log(`[Pump ${pump.pumpId}] Auth by:`, jsonwebtoken_1.default.decode(token));
        }
        catch (e) { }
    }
    const success = pump.authorize(fuel_type, price_per_litre, target_litres, target_cost);
    if (!success) {
        return res.status(409).json({ message: `Cannot authorize — pump ${pump.pumpId} is in ${pump.getState()} state` });
    }
    res.json({ message: `Pump ${pump.pumpId} authorized`, session: pump.getSession() });
});
/**
 * POST /api/pump/:pumpId/start
 */
app.post('/api/pump/:pumpId/start', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    const success = pump.startPumping();
    if (!success) {
        return res.status(409).json({ message: `Cannot start — pump ${pump.pumpId} is in ${pump.getState()} state` });
    }
    res.json({ message: `Pump ${pump.pumpId} pumping started`, session: pump.getSession() });
});
/**
 * POST /api/pump/:pumpId/stop
 */
app.post('/api/pump/:pumpId/stop', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    const success = pump.complete();
    if (!success) {
        return res.status(409).json({ message: `Cannot stop — pump ${pump.pumpId} is in ${pump.getState()} state` });
    }
    res.json({ message: `Pump ${pump.pumpId} completed`, session: pump.getSession() });
});
/**
 * POST /api/pump/:pumpId/reset
 */
app.post('/api/pump/:pumpId/reset', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    const success = pump.reset();
    if (!success) {
        return res.status(409).json({ message: `Cannot reset — pump ${pump.pumpId} is in ${pump.getState()} state` });
    }
    chaos.clearFault(pump.pumpId);
    res.json({ message: `Pump ${pump.pumpId} reset to IDLE`, session: pump.getSession() });
});
/**
 * GET /api/pump/:pumpId/status
 */
app.get('/api/pump/:pumpId/status', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    res.json({
        session: pump.getSession(),
        chaos: chaos.getActiveFault(pump.pumpId),
        tanks: tankManager.getTankStatus(),
    });
});
/**
 * POST /api/pump/:pumpId/chaos
 */
app.post('/api/pump/:pumpId/chaos', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    const { fault_type } = req.body;
    if (!fault_type || !['LOW_PRESSURE', 'NOZZLE_JAM', 'TANK_EMPTY'].includes(fault_type)) {
        return res.status(400).json({ message: 'Invalid fault_type' });
    }
    const success = chaos.triggerFault(pump.pumpId, fault_type);
    if (!success) {
        return res.status(409).json({ message: `Cannot trigger fault in ${pump.getState()} state` });
    }
    res.json({ message: `Chaos: ${fault_type} triggered on pump ${pump.pumpId}` });
});
/**
 * POST /api/pump/:pumpId/chaos/clear
 */
app.post('/api/pump/:pumpId/chaos/clear', (req, res) => {
    const pump = getPump(req, res);
    if (!pump)
        return;
    chaos.clearFault(pump.pumpId);
    res.json({ message: `Chaos cleared for pump ${pump.pumpId}` });
});
// Legacy endpoints removed — clients should use /api/pump/:pumpId/...
// ==========================================
//   TANK ENDPOINTS (unchanged)
// ==========================================
app.get('/api/tank/status', (req, res) => {
    res.json({ tanks: tankManager.getTankStatus() });
});
app.post('/api/tank/refuel', (req, res) => {
    const { fuel_type } = req.body;
    if (!fuel_type)
        return res.status(400).json({ message: 'fuel_type is required' });
    const result = tankManager.startRefuel(fuel_type);
    if (!result.success) {
        return res.status(409).json({ message: result.message });
    }
    // Lock all IDLE pumps
    for (const [, pump] of pumps) {
        if (pump.getState() === 'IDLE')
            pump.lock();
    }
    res.json({ message: result.message, tanks: tankManager.getTankStatus() });
});
app.post('/api/tank/refuel/cancel', (req, res) => {
    const { fuel_type } = req.body;
    if (!fuel_type)
        return res.status(400).json({ message: 'fuel_type is required' });
    const result = tankManager.cancelRefuel(fuel_type);
    if (!result.success) {
        return res.status(409).json({ message: result.message });
    }
    // Unlock LOCKED pumps if no tanks refueling
    if (!tankManager.isAnyRefueling()) {
        for (const [, pump] of pumps) {
            if (pump.getState() === 'LOCKED')
                pump.unlock();
        }
    }
    res.json({ message: result.message, tanks: tankManager.getTankStatus() });
});
app.post('/api/tank/set-level', (req, res) => {
    const { fuel_type, litres } = req.body;
    if (!fuel_type || typeof litres !== 'number') {
        return res.status(400).json({ message: 'fuel_type and litres are required' });
    }
    const result = tankManager.setLevel(fuel_type, litres);
    if (!result.success) {
        return res.status(409).json({ message: result.message });
    }
    res.json({ message: result.message, tanks: tankManager.getTankStatus() });
});
app.post('/api/tank/reload-config', async (req, res) => {
    try {
        await initTanksFromPOS();
        res.json({ message: 'Tank config reloaded', tanks: tankManager.getTankStatus() });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to reload config', error: error.message });
    }
});
// ==========================================
//   SOCKET.IO
// ==========================================
io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    // Send current state for all pumps
    for (const [pumpId, pump] of pumps) {
        socket.emit('state_change', {
            pump_id: pumpId,
            state: pump.getState(),
            session_id: pump.getSession().id,
            fault_type: pump.getSession().fault_type,
            timestamp: Date.now(),
        });
    }
    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});
// ==========================================
//   START SERVER
// ==========================================
server.listen(Number(port), '0.0.0.0', async () => {
    console.log(`[PumpController] 🛢️  Running on http://0.0.0.0:${port}`);
    console.log(`[PumpController] ${NUM_PUMPS} pumping stations active`);
    console.log(`[PumpController] POS API target: ${posApiUrl}`);
    console.log(`[PumpController] WebSocket broadcasting telemetry at ~60fps`);
    await initTanksFromPOS();
});
