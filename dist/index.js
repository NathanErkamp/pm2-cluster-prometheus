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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
exports.timeSyncRun = exports.getAggregateMetrics = exports.isClusterMode = void 0;
var pm2 = require("pm2");
var client = require("prom-client");
/**
 * This process's PM proc id
 */
var currentProcId = parseInt(process.env.pm_id, 10);
/**
 * Indicates the process is being ran in PM2's cluster mode
 */
exports.isClusterMode = process.env.exec_mode === 'cluster_mode';
/**
 * Returns a list of PM2 processes when running in clustered mode
 */
function getProcList() {
    return new Promise(function (resolve, reject) {
        pm2.list(function (err, list) {
            err ? reject(err)
                // only return processes with the same name
                : resolve(list.filter(function (o) { return o.name === process.env.name && o.pm2_env.status === 'online'; }));
        });
    });
}
/**
 * Broadcasts message to all processes in the cluster, resolving with the number of processes sent to
 * @param packet The packet to send
 */
function broadcastToAll(packet) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, getProcList().then(function (list) {
                    list.forEach(function (proc) { return pm2.sendDataToProcessId(proc.pm_id, packet, function (err) { return true; }); });
                    return list.length;
                })];
        });
    });
}
/**
 * Sends a message to all processes in the cluster and resolves once all processes repsonsed or after a timeout
 * @param topic The name of the topic to broadcast
 * @param data The optional data payload
 * @param timeoutInMilliseconds The length of time to wait for responses before rejecting the promise
 */
function awaitAllProcMessagesReplies(topic, timeoutInMilliseconds) {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var responses, procLength, timeoutHandle, handler;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    responses = [];
                    return [4 /*yield*/, broadcastToAll({
                            id: currentProcId,
                            replyTo: currentProcId,
                            originalProcId: currentProcId,
                            topic: topic,
                            data: {},
                            isReply: false,
                        })];
                case 1:
                    procLength = _a.sent();
                    timeoutHandle = setTimeout(function () { return reject('timeout'); }, timeoutInMilliseconds);
                    handler = function (response) {
                        if (!response.isReply || response.topic !== topic) {
                            return;
                        }
                        responses.push(response);
                        if (responses.length === procLength) {
                            process.removeListener('message', handler);
                            clearTimeout(timeoutHandle);
                            resolve(responses);
                        }
                    };
                    process.on('message', handler);
                    return [2 /*return*/];
            }
        });
    }); });
}
/**
 * Sends a reply to the processes which originated a broadcast
 * @param originalPacket The original packet received
 * @param data The optional data to responed with
 */
function sendProcReply(originalPacket, data) {
    if (data === void 0) { data = {}; }
    var returnPacket = __assign(__assign({}, originalPacket), { data: data, isReply: true, id: currentProcId, originalProcId: currentProcId });
    pm2.sendDataToProcessId(originalPacket.replyTo, returnPacket, function (err) { return true; });
}
/**
 * Init
 */
if (exports.isClusterMode) {
    var handleProcessMessage = function (packet) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(packet && packet.topic === 'metrics-get' && !packet.isReply)) return [3 /*break*/, 2];
                    _a = sendProcReply;
                    _b = [packet];
                    return [4 /*yield*/, client.register.getMetricsAsJSON()];
                case 1:
                    _a.apply(void 0, _b.concat([_c.sent()]));
                    _c.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    process.removeListener('message', handleProcessMessage);
    process.on('message', handleProcessMessage);
}
/**
 * Returns the aggregate metric if running in cluster mode, otherwise, just the current
 * instance's metrics
 * @param timeoutInMilliseconds How long to wait for other processes to provide their metrics.
 */
function getAggregateMetrics(timeoutInMilliseconds) {
    if (timeoutInMilliseconds === void 0) { timeoutInMilliseconds = 10e3; }
    return __awaiter(this, void 0, void 0, function () {
        var procMetrics;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!exports.isClusterMode) return [3 /*break*/, 2];
                    return [4 /*yield*/, awaitAllProcMessagesReplies('metrics-get', timeoutInMilliseconds)];
                case 1:
                    procMetrics = _a.sent();
                    return [2 /*return*/, client.AggregatorRegistry.aggregate(procMetrics.map(function (o) { return o.data; }))];
                case 2: return [2 /*return*/, client.register];
            }
        });
    });
}
exports.getAggregateMetrics = getAggregateMetrics;
/**
 * Creates a timer which executes when the current time is cleanly divisible by `syncTimeInMS`
 * @param syncTimeInMilliseconds The time, in milliseconds
 * @param fun The function to execute
 * @returns The timer handle
 */
function timeSyncRun(syncTimeInMilliseconds, fun) {
    var handle = setTimeout(fun, syncTimeInMilliseconds - Date.now() % syncTimeInMilliseconds);
    handle.unref();
    return handle;
}
exports.timeSyncRun = timeSyncRun;
