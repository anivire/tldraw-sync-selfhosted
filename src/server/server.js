"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var ws_1 = require("ws");
var sync_core_1 = require("@tldraw/sync-core");
var tlschema_1 = require("@tldraw/tlschema");
var lodash_throttle_1 = require("lodash.throttle");
var client_s3_1 = require("@aws-sdk/client-s3");
var multer_1 = require("multer");
// Environment variables
var S3_ENDPOINT = process.env.S3_ENDPOINT;
var S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
var S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
var S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
var PORT = process.env.PORT || 3000;
var schema = (0, tlschema_1.createTLSchema)({
    shapes: __assign({}, tlschema_1.defaultShapeSchemas),
});
var s3 = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});
// Rooms map
var rooms = new Map();
// Get or create room
function getRoom(roomId) {
    return __awaiter(this, void 0, void 0, function () {
        var initialSnapshot, command, response, body, e_1, room;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (rooms.has(roomId)) {
                        return [2 /*return*/, rooms.get(roomId)];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    command = new client_s3_1.GetObjectCommand({
                        Bucket: S3_BUCKET_NAME,
                        Key: "rooms/".concat(roomId),
                    });
                    return [4 /*yield*/, s3.send(command)];
                case 2:
                    response = _a.sent();
                    if (!response.Body) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.Body.transformToString()];
                case 3:
                    body = _a.sent();
                    initialSnapshot = JSON.parse(body);
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    console.log('Room not found in S3, creating new:', e_1);
                    return [3 /*break*/, 6];
                case 6:
                    room = new sync_core_1.TLSocketRoom({
                        schema: schema,
                        initialSnapshot: initialSnapshot,
                        onDataChange: function () {
                            schedulePersistToS3(roomId, room);
                        },
                    });
                    rooms.set(roomId, room);
                    return [2 /*return*/, room];
            }
        });
    });
}
// Throttled persistence
var persistThrottles = new Map();
function schedulePersistToS3(roomId, room) {
    var _this = this;
    if (!persistThrottles.has(roomId)) {
        persistThrottles.set(roomId, (0, lodash_throttle_1.default)(function () { return __awaiter(_this, void 0, void 0, function () {
            var snapshot, command;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        snapshot = JSON.stringify(room.getCurrentSnapshot());
                        command = new client_s3_1.PutObjectCommand({
                            Bucket: S3_BUCKET_NAME,
                            Key: "rooms/".concat(roomId),
                            Body: snapshot,
                            ContentType: 'application/json',
                        });
                        return [4 /*yield*/, s3.send(command)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 10000));
    }
    persistThrottles.get(roomId)();
}
// Express app
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Asset upload
var upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
app.post('/api/uploads/:uploadId', upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uploadId, objectName, contentType, e_2;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                uploadId = req.params.uploadId;
                objectName = "uploads/".concat(uploadId.replace(/[^a-zA-Z0-9_-]+/g, '_'));
                contentType = (_b = (_a = req.file) === null || _a === void 0 ? void 0 : _a.mimetype) !== null && _b !== void 0 ? _b : '';
                if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid content type' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, s3.send(new client_s3_1.HeadObjectCommand({
                        Bucket: S3_BUCKET_NAME,
                        Key: objectName,
                    }))];
            case 2:
                _d.sent();
                return [2 /*return*/, res.status(409).json({ error: 'Upload already exists' })];
            case 3:
                e_2 = _d.sent();
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: objectName,
                    Body: (_c = req.file) === null || _c === void 0 ? void 0 : _c.buffer,
                    ContentType: contentType,
                }))];
            case 5:
                _d.sent();
                res.json({ ok: true });
                return [2 /*return*/];
        }
    });
}); });
// Asset download
app.get('/api/uploads/:uploadId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uploadId, objectName, command, response, status_1, buffer, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uploadId = req.params.uploadId;
                objectName = "uploads/".concat(uploadId.replace(/[^a-zA-Z0-9_-]+/g, '_'));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                command = new client_s3_1.GetObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: objectName,
                    Range: req.headers.range,
                });
                return [4 /*yield*/, s3.send(command)];
            case 2:
                response = _a.sent();
                if (response.ContentType)
                    res.set('content-type', response.ContentType);
                if (response.ETag)
                    res.set('etag', response.ETag);
                if (response.ContentLength)
                    res.set('content-length', response.ContentLength.toString());
                if (response.LastModified)
                    res.set('last-modified', response.LastModified.toISOString());
                res.set('cache-control', 'public, max-age=31536000, immutable');
                res.set('access-control-allow-origin', '*');
                if (response.ContentRange)
                    res.set('content-range', response.ContentRange);
                status_1 = response.ContentRange ? 206 : 200;
                res.status(status_1);
                if (!response.Body) return [3 /*break*/, 4];
                return [4 /*yield*/, response.Body.transformToByteArray()];
            case 3:
                buffer = _a.sent();
                res.send(Buffer.from(buffer));
                return [3 /*break*/, 5];
            case 4:
                res.status(404).end();
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                e_3 = _a.sent();
                console.error('S3 get error:', e_3);
                res.status(404).end();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Unfurl (placeholder)
app.get('/api/unfurl', function (req, res) {
    // Implement unfurl logic here, e.g., using a library
    res.json({ title: 'Placeholder', description: 'Placeholder' });
});
// Start server
var server = app.listen(PORT, function () {
    console.log("Server running on port ".concat(PORT));
});
// WebSocket server
var wss = new ws_1.WebSocketServer({ server: server });
wss.on('connection', function (ws, req) { return __awaiter(void 0, void 0, void 0, function () {
    var url, path, roomIdMatch, roomId, sessionId, room, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = new URL(req.url, "http://".concat(req.headers.host));
                path = url.pathname;
                roomIdMatch = path.match(/^\/api\/connect\/(.+)$/);
                if (!roomIdMatch) {
                    ws.close();
                    return [2 /*return*/];
                }
                roomId = roomIdMatch[1];
                sessionId = url.searchParams.get('sessionId');
                if (!sessionId) {
                    ws.close();
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, getRoom(roomId)];
            case 2:
                room = _a.sent();
                room.handleSocketConnect({ sessionId: sessionId, socket: ws });
                return [3 /*break*/, 4];
            case 3:
                e_4 = _a.sent();
                console.error('Error connecting to room:', e_4);
                ws.close();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
