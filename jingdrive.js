/*************************************

应用名称：京e行
脚本功能：修改返回数据
使用声明：⚠️仅供参考，🈲转载与售卖！

[rewrite_local]
^https?://api\.jingdrive\.cn/user_info.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/jingdrive.js
^https?://api\.jingdrive\.cn/app/launch.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/jingdrive.js

[mitm]
hostname = api.jingdrive.cn

*************************************/

// ==================== 1. 轻量级 AES 加密模块 ====================
// ==================== AES-128-CBC / PKCS#7 ====================
const AES = (() => {

    // 标准 AES S-Box，必须正好 256 个元素
    const SBOX = [
        0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
        0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
        0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
        0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
        0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
        0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
        0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
        0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
        0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
        0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
        0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
        0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
        0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
        0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
        0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
        0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
    ];

    const RCON = [
        0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36
    ];

    function utf8(str) {
        const out = [];

        for (const ch of str) {
            const cp = ch.codePointAt(0);

            if (cp <= 0x7f) {
                out.push(cp);
            } else if (cp <= 0x7ff) {
                out.push(
                    0xc0 | (cp >> 6),
                    0x80 | (cp & 0x3f)
                );
            } else if (cp <= 0xffff) {
                out.push(
                    0xe0 | (cp >> 12),
                    0x80 | ((cp >> 6) & 0x3f),
                    0x80 | (cp & 0x3f)
                );
            } else {
                out.push(
                    0xf0 | (cp >> 18),
                    0x80 | ((cp >> 12) & 0x3f),
                    0x80 | ((cp >> 6) & 0x3f),
                    0x80 | (cp & 0x3f)
                );
            }
        }

        return out;
    }

    function base64(bytes) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        let result = "";

        for (let i = 0; i < bytes.length; i += 3) {
            const a = bytes[i];
            const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
            const c = i + 2 < bytes.length ? bytes[i + 2] : 0;

            result += chars[a >> 2];
            result += chars[((a & 3) << 4) | (b >> 4)];
            result += i + 1 < bytes.length
                ? chars[((b & 15) << 2) | (c >> 6)]
                : "=";
            result += i + 2 < bytes.length
                ? chars[c & 63]
                : "=";
        }

        return result;
    }

    function xtime(x) {
        return ((x << 1) ^ ((x & 0x80) ? 0x1b : 0)) & 0xff;
    }

    function expandKey(key) {
        if (key.length !== 16) {
            throw new Error("AES-128 key must be 16 bytes");
        }

        const w = new Uint8Array(176);

        for (let i = 0; i < 16; i++) {
            w[i] = key[i];
        }

        let bytesGenerated = 16;
        let rconIndex = 1;
        const temp = new Uint8Array(4);

        while (bytesGenerated < 176) {

            for (let i = 0; i < 4; i++) {
                temp[i] = w[bytesGenerated - 4 + i];
            }

            if (bytesGenerated % 16 === 0) {

                const t = temp[0];

                temp[0] = SBOX[temp[1]];
                temp[1] = SBOX[temp[2]];
                temp[2] = SBOX[temp[3]];
                temp[3] = SBOX[t];

                temp[0] ^= RCON[rconIndex++];
            }

            for (let i = 0; i < 4; i++) {
                w[bytesGenerated] =
                    w[bytesGenerated - 16] ^ temp[i];

                bytesGenerated++;
            }
        }

        return w;
    }

    function addRoundKey(state, key, round) {
        const offset = round * 16;

        for (let i = 0; i < 16; i++) {
            state[i] ^= key[offset + i];
        }
    }

    function subBytes(state) {
        for (let i = 0; i < 16; i++) {
            state[i] = SBOX[state[i]];
        }
    }

    function shiftRows(state) {
        const t = state.slice();

        state[0]  = t[0];
        state[4]  = t[4];
        state[8]  = t[8];
        state[12] = t[12];

        state[1]  = t[5];
        state[5]  = t[9];
        state[9]  = t[13];
        state[13] = t[1];

        state[2]  = t[10];
        state[6]  = t[14];
        state[10] = t[2];
        state[14] = t[6];

        state[3]  = t[15];
        state[7]  = t[3];
        state[11] = t[7];
        state[15] = t[11];
    }

    function mixColumns(state) {

        for (let c = 0; c < 4; c++) {

            const i = c * 4;

            const a = state[i];
            const b = state[i + 1];
            const c2 = state[i + 2];
            const d = state[i + 3];

            state[i] =
                xtime(a) ^
                (xtime(b) ^ b) ^
                c2 ^
                d;

            state[i + 1] =
                a ^
                xtime(b) ^
                (xtime(c2) ^ c2) ^
                d;

            state[i + 2] =
                a ^
                b ^
                xtime(c2) ^
                (xtime(d) ^ d);

            state[i + 3] =
                (xtime(a) ^ a) ^
                b ^
                c2 ^
                xtime(d);
        }
    }

    function encryptBlock(input, roundKeys) {

        const state = new Uint8Array(input);

        addRoundKey(state, roundKeys, 0);

        for (let round = 1; round <= 10; round++) {

            subBytes(state);
            shiftRows(state);

            if (round !== 10) {
                mixColumns(state);
            }

            addRoundKey(state, roundKeys, round);
        }

        return state;
    }

    function encryptCBC(plainText, keyText, ivText) {

        const data = utf8(plainText);
        const key = utf8(keyText);
        const iv = utf8(ivText);

        if (key.length !== 16) {
            throw new Error("Key must be 16 bytes");
        }

        if (iv.length !== 16) {
            throw new Error("IV must be 16 bytes");
        }

        // PKCS#7
        const pad = 16 - (data.length % 16);

        for (let i = 0; i < pad; i++) {
            data.push(pad);
        }

        const roundKeys = expandKey(key);

        let previous = iv.slice();
        const output = [];

        for (let offset = 0; offset < data.length; offset += 16) {

            const block = new Uint8Array(16);

            for (let i = 0; i < 16; i++) {
                block[i] =
                    data[offset + i] ^
                    previous[i];
            }

            const encrypted =
                encryptBlock(block, roundKeys);

            for (let i = 0; i < 16; i++) {
                output.push(encrypted[i]);
            }

            previous = Array.from(encrypted);
        }

        return base64(output);
    }

    return {
        encryptCBC
    };
})();

// ==================== 2. 业务逻辑处理 ====================
const url = $request.url || "";
const KEY = "1234567890123456";
const IV  = "1234567890123456";

function encryptAES(text) {
    try {
        return AES.encryptCBC(text, KEY, IV);
    } catch (e) {
        console.log("[jingdrive] AES error: " + e);
        return null;
    }
}

function makeResponse(data) {
    const plaintext = JSON.stringify(data);
    const encrypted = encryptAES(plaintext);
    if (!encrypted) {
        console.log("[jingdrive] encryption failed");
        $done({});
        return null;
    }

    return {
        body: JSON.stringify({
            code: 200,
            message: "请求成功",
            data: encrypted
        })
    };
}

// ------------------------------------------------
// 路由分发
// ------------------------------------------------
if (url.includes("/user_info")) {
    const data = {
        status: 0,
        isVip: true,
        vipExpiresDate: "2099-12-31 23:59:59",
        reward_amount: 0,
        isNewer: false
    };
    const result = makeResponse(data);
    $done(result ? result : {});
} else if (url.includes("/app/launch")) {
    const data = {
	    checkProvince: false,
	    needCheckProvince: false,
	    supportProvince: [
	        "北京市",
	        "天津市",
	        "河北省"
	    ],
	    displayPoint: true,
	    useAvoid: true,
	    version: "1.8.1",
	    newerVersionArray: [
	        "1.7.9",
	        "1.8.1"
	    ],
	    apiBaseUrl: "http://api.jingdrive.cn/",
	    mediaBaseUrl: "http://media.jingdrive.cn/",
	    allPointUrl: "points",
	    rangePolygonUrl: "rangePolygon",
	    entranceAndExitUrl: "entrance_exit",
	    limitedRuleUrl: "limited_rule",
	    wxPayUrl: "wx/prepay",
	    wxCheckOrderUrl: "wx/checkOrder",
	    buyIdentifiers: "buy_identifiers",
	    inBuyUrl: "in_buy",
	    inBuyCopyUrl: "in_buy_copy",
	    freeTicketUrl: "free_ticket",
	    userInfoUrl: "user_info",
	    appStartUrl: "app_start",
	    serverConnectUrl: "server_connect",
	    needInfoUrl: "need_info",
	    commentUrl: "point/getComment",
	    longPlanRouteUrl: "planRoute",
	    rewardInfoUrl: "getRewardInfo",
	    exchangeRewardUrl: "exchangeReward",
	    pushAliasUrl: "push/alias",
	    planRecordSave: "planRecord/save",
	    planRecordInvalid: "planRecord/invalided",
	    planRecordDeleteBatch: "planRecord/delete/batch",
	    planRecordCollect: "planRecord/collect",
	    planRecordMerge: "planRecord/merge",
	    planRecordGet: "planRecord/get",
	    planRecordCopy: "planRecord/copy",
	    planRecordRadarAlert: "planRecord/radarAlert",
	    allowBuyVipYear: true,
	    allowShowWxPay: true,
	    allowWatchRewardVideo: true,
	    planRouteNeedVip: false,
	    allowLongPlanCount: 999,
	    allowUseCountForNotVip: 999
	};
    const result = makeResponse(data);
    $done(result ? result : {});
} else {
    $done({});
}
