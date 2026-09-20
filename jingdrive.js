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
const AES = (function() {
    const Sbox = [
        99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,
        156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,
        18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,
        91,106,203,190,57,74,76,88,207,208,239,170,85,75,163,169,149,161,244,50,22,191,186,62,10,198,242,94,221,
        6,157,247,213,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,
        37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,60,81,168,148,245,223,36,92,180,211,40,17,102,143,
        86,43,42,215,26,197,62,94,251,240,161,224,125,23,172,130,214,142,226,205,188,143,110,134,53,101,146,15,
        159,84,93,12,137,13,236,97,34,167,224,72,248,9,249,158,111,245,67,115,117,151,194,2,243,153,196,165,104,
        140,210,115,126,170,163,70,16,137,79,40,208,134,124,182,145,218,70,92,127,136,101,29,152,248,206,255,243,
        228,60,158,144,147,193,168,80,64,100,61,185,178,133,157,249,240,220,107,219,87,14,39,81,171,77,225,90,
        217,162,155,17,211,255,207,229,66,74,244,88,219,130,202,56,80,35,127,24,180,44,214,196,17,212,83,45
    ];
    const Rcon = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];

    function toUtf8Bytes(str) {
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code < 0x80) bytes.push(code);
            else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            else if (code < 0xd800 || code >= 0xe000) {
                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }
        }
        return bytes;
    }

    function toBase64(bytes) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let res = '';
        for (let i = 0; i < bytes.length; i += 3) {
            let b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
            res += chars[b1 >> 2];
            res += chars[((b1 & 3) << 4) | ((b2 || 0) >> 4)];
            res += b2 !== undefined ? chars[((b2 & 15) << 2) | ((b3 || 0) >> 6)] : '=';
            res += b3 !== undefined ? chars[b3 & 63] : '=';
        }
        return res;
    }

    function keyExpansion(keyBytes) {
        const Nk = keyBytes.length / 4;
        const Nr = Nk + 6;
        let w = new Uint32Array(4 * (Nr + 1));
        for (let i = 0; i < Nk; i++) {
            w[i] = (keyBytes[4 * i] << 24) | (keyBytes[4 * i + 1] << 16) | (keyBytes[4 * i + 2] << 8) | keyBytes[4 * i + 3];
        }
        for (let i = Nk; i < 4 * (Nr + 1); i++) {
            let temp = w[i - 1];
            if (i % Nk === 0) {
                temp = ((temp << 8) | (temp >>> 24));
                temp = (Sbox[(temp >>> 24) & 0xff] << 24) | (Sbox[(temp >>> 16) & 0xff] << 16) | (Sbox[(temp >>> 8) & 0xff] << 8) | Sbox[temp & 0xff];
                temp ^= (Rcon[i / Nk] << 24);
            }
            w[i] = w[i - Nk] ^ temp;
        }
        return { w, Nr };
    }

    function encryptBlock(pt, w, Nr) {
        let s = new Uint8Array(16);
        for (let i = 0; i < 16; i++) s[i] = pt[i] ^ ((w[Math.floor(i / 4)] >>> (24 - 8 * (i % 4))) & 0xff);
        for (let round = 1; round < Nr; round++) {
            let t = new Uint8Array(16);
            for (let i = 0; i < 16; i++) t[i] = Sbox[s[i]];
            s[0] = t[0]; s[4] = t[4]; s[8] = t[8]; s[12] = t[12];
            s[1] = t[5]; s[5] = t[9]; s[9] = t[13]; s[13] = t[1];
            s[2] = t[10]; s[6] = t[14]; s[10] = t[2]; s[14] = t[6];
            s[3] = t[15]; s[7] = t[3]; s[11] = t[7]; s[15] = t[11];

            for (let c = 0; c < 4; c++) {
                let a = s[4 * c], b = s[4 * c + 1], c_ = s[4 * c + 2], d = s[4 * c + 3];
                let h = (x) => ((x << 1) ^ (((x >> 7) & 1) * 0x11b)) & 0xff;
                s[4 * c]     = h(a) ^ (h(b) ^ b) ^ c_ ^ d;
                s[4 * c + 1] = a ^ h(b) ^ (h(c_) ^ c_) ^ d;
                s[4 * c + 2] = a ^ b ^ h(c_) ^ (h(d) ^ d);
                s[4 * c + 3] = (h(a) ^ a) ^ b ^ c_ ^ h(d);
            }

            let rw = w[4 * round], rw1 = w[4 * round + 1], rw2 = w[4 * round + 2], rw3 = w[4 * round + 3];
            for (let i = 0; i < 4; i++) {
                s[i] ^= (rw >>> (24 - 8 * i)) & 0xff;
                s[4 + i] ^= (rw1 >>> (24 - 8 * i)) & 0xff;
                s[8 + i] ^= (rw2 >>> (24 - 8 * i)) & 0xff;
                s[12 + i] ^= (rw3 >>> (24 - 8 * i)) & 0xff;
            }
        }

        let t = new Uint8Array(16);
        for (let i = 0; i < 16; i++) t[i] = Sbox[s[i]];
        s[0] = t[0]; s[4] = t[4]; s[8] = t[8]; s[12] = t[12];
        s[1] = t[5]; s[5] = t[9]; s[9] = t[13]; s[13] = t[1];
        s[2] = t[10]; s[6] = t[14]; s[10] = t[2]; s[14] = t[6];
        s[3] = t[15]; s[7] = t[3]; s[11] = t[7]; s[15] = t[11];

        let fw = w[4 * Nr], fw1 = w[4 * Nr + 1], fw2 = w[4 * Nr + 2], fw3 = w[4 * Nr + 3];
        for (let i = 0; i < 4; i++) {
            s[i] ^= (fw >>> (24 - 8 * i)) & 0xff;
            s[4 + i] ^= (fw1 >>> (24 - 8 * i)) & 0xff;
            s[8 + i] ^= (fw2 >>> (24 - 8 * i)) & 0xff;
            s[12 + i] ^= (fw3 >>> (24 - 8 * i)) & 0xff;
        }
        return s;
    }

    return {
        encryptCBC: function(plainText, keyStr, ivStr) {
            let key = toUtf8Bytes(keyStr);
            let iv = toUtf8Bytes(ivStr);
            let data = toUtf8Bytes(plainText);

            let padLen = 16 - (data.length % 16);
            for (let i = 0; i < padLen; i++) data.push(padLen);

            let { w, Nr } = keyExpansion(key);
            let out = [];
            let prev = iv.slice(0, 16);

            for (let i = 0; i < data.length; i += 16) {
                let block = data.slice(i, i + 16);
                for (let j = 0; j < 16; j++) block[j] ^= prev[j];
                let encrypted = encryptBlock(block, w, Nr);
                for (let j = 0; j < 16; j++) out.push(encrypted[j]);
                prev = encrypted;
            }

            return toBase64(out);
        }
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
