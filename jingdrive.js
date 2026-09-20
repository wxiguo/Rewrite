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

/*
 * Quantumult X
 * JingDrive API Mock
 *
 */

const url = $request.url || "";
const method = $request.method || "";
const body = $response.body || "";

function jsonResponse(obj) {
    return {
        body: JSON.stringify(obj)
    };
}

try {

    /*
     * /user_info
     * 模拟用户信息
     */
    if (url.includes("/user_info")) {
        const result = {
            code: 200,
            status: 0,
            isVip: true,
            vipExpiresDate: "2099-12-31 23:59:59",
            reward_amount: 0,
            isNewer: false
        };
        $done(jsonResponse(result));
        return;
    }

    /*
     * /app/launch
     * 模拟 App 配置
     */
    if (url.includes("/app/launch")) {
        const result = {
            code: 200,
            message: "请求成功",
            data: {
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
            }
        };
        $done(jsonResponse(result));
        return;
    }
} catch (e) {
    $done({});
}
