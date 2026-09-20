/*************************************

应用名称：京e行
脚本功能：解锁会员
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?://api\.jingdrive\.cn/user_info.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/jingdrive.js
^https?://api\.jingdrive\.cn/app/launch.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/jingdrive.js

[mitm]
hostname = api.jingdrive.cn

*************************************/


const url = $request.url || "";
const KEY = "1234567890123456";
const IV  = "1234567890123456";

function encryptAES(text) {
    try {
        const result = $crypto.encrypt(
            text,
            "AES",
            KEY,
            {
                iv: IV,
                mode: "CBC",
                padding: "PKCS7"
            }
        );
		
        /*
         * 某些 QX 版本返回 ArrayBuffer，
         * 转成 Base64。
         */
        if (typeof result === "string") {
            return result;
        }
        return $utils.base64Encode(result);
    } catch (e) {
        console.log(
            "[jingdrive] AES error: " + e
        );
        return null;
    }
}

function makeResponse(data) {
    const plaintext =
        JSON.stringify(data);
    const encrypted =
        encryptAES(plaintext);
    if (!encrypted) {
        console.log(
            "[jingdrive] encryption failed"
        );
        $done({});
        return;
    }
	
    /*
     * 原始外层结构：
     *
     * {
     *     code: 200,
     *     message: "请求成功",
     *     data: "<Base64>"
     * }
     */
    return {
        body: JSON.stringify({
            code: 200,
            message: "请求成功",
            data: encrypted
        })
    };
}

/*
 * ------------------------------------------------
 * /user_info
 * ------------------------------------------------
 */
if (url.includes("/user_info")) {
    const data = {
        status: 0,
        isVip: true,
        vipExpiresDate: "2099-12-31 23:59:59",
        reward_amount: 0,
        isNewer: false
    };
	const result = makeResponse(data);
	if (result) {
	    $done(result);
	}
    return;
}

/*
 * ------------------------------------------------
 * /app/launch
 * ------------------------------------------------
 */
if (url.includes("/app/launch")) {
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
        allowBuyVipYear: true,
        allowShowWxPay: true,
        allowWatchRewardVideo: true,
        planRouteNeedVip: false,
        allowLongPlanCount: 999,
        allowUseCountForNotVip: 999
    };
	const result = makeResponse(data);
	if (result) {
	    $done(result);
	}
    return;
}
