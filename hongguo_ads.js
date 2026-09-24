/*************************************

应用名称：红果短剧 
脚本功能：广告拦截
适用版本：7.3.7
使用声明：⚠️仅供参考，🈲转载与售卖！

[rewrite_local]
^https?://ad\.zijieapi\.com/api/ad/v1/.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/hongguo_ads.js
^https?://ad\.zijieapi\.com/api/incentive/marketing/done.* url script-response-body https://raw.githubusercontent.com/wxiguo/Rewrite/main/hongguo_ads.js

[mitm]
hostname = ad.zijieapi.com

*************************************/

// ============================================================

// ---------- 配置 ----------
// "empty"   : 返回「无广告」的合成响应（默认，广告位静默跳过）
// "passthrough": 不改写，仅做日志（用于排查/抓包）
const MODE = "empty";

// 无广告响应模板。
// ⚠️ 依据静态分析推断：成功码为 0、物料字段为 adm。
//    若真机实测出现异常，请抓一次真实的「无填充」响应后按实际结构修改此处。
const EMPTY_BODIES = {
    // 聚合 / 开屏 / Banner / 召回 类
    ads: {
        code: 0,
        msg: "",
        status_code: 0,
        data: {
            ads: [],
            ad_list: [],
            materials: [],
            has_more: false
        }
    },
    // 激励视频（看广告解锁）类
    inspire: {
        code: 0,
        msg: "",
        status_code: 0,
        data: {
            ads: [],
            inspire_ad: [],
            reward_ad: [],
            has_more: false
        }
    }
};

const url = ($request && $request.url) || "";

function log(msg) {
    console.log("[hongguo_ads] " + msg);
}

function pickTemplate(u) {
    if (/(inspire|reward)/.test(u)) return EMPTY_BODIES.inspire;
    return EMPTY_BODIES.ads;
}

function finish(bodyObj) {
    const body = JSON.stringify(bodyObj);
    if (typeof $done === "function") {
        $done({
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": String(body.length)
            },
            body: body
        });
    }
}

// ---------- 主流程 ----------
if (!/ad\.zijieapi\.com/.test(url)) {
    // 非广告域名，放行
    $done({});
} else if (MODE === "passthrough") {
    log("passthrough " + url);
    $done({});
} else {
    log("intercept " + url);
    finish(pickTemplate(url));
}

