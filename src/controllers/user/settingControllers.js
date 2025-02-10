const express = require('express');
const { CleanHTMLData, CleanDBData } = require('../../config/database/sanetize');
const User = require('../../models/auth');
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const checkAuthorization = require('../../middlewares/authMiddleware');
const setting = require('../../models/setting');
const flexibleWallet = require('../../models/flexibleWallet');

exports.setting = async (req, res) => {
    const postData = req.body;
    const keyname = CleanHTMLData(CleanDBData(postData.keyname));
    const keyvalue = CleanHTMLData(CleanDBData(postData.keyvalue));
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = new setting({
                keyname,
                keyvalue
            });
            await data.save();
            res.json({ status: "success", message: "Cryptocurrency added successful!" });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.getSetting = async (req, res) => {
    const postData = req.body;
    let { keynames } = req.body;
    // const keyname = CleanHTMLData(CleanDBData(postData.keyname));
    // const keyvalue = CleanHTMLData(CleanDBData(postData.keyvalue));
    
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {

            const keysArray = keynames?.split(',').map((key) => key.trim());
            const data = await setting.find({ keyname: { $in: keysArray } });

            if (data.length > 0) {
                res.json({ status: "success", data });
            }
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.getSettingForWithdrawal = async (req, res) => {
    const postData = req.body;
    let { keynames } = req.body;
    // const keyname = CleanHTMLData(CleanDBData(postData.keyname));
    // const keyvalue = CleanHTMLData(CleanDBData(postData.keyvalue));

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {

            const keysArray = keynames?.split(',').map((key) => key.trim());
            const sett = await setting.find({ keyname: { $in: keysArray } });


            // Step 2: For each setting, fetch the referenced setting by referenceid
            const settingsWithCoinName = await Promise.all(sett.map(async (settingItem) => {
                const referenceId = settingItem.referenceid;
                const referencedSetting = await setting.findById(referenceId);
                
                // Step 3: If referenced setting exists, add its CoinName to the current setting
                
                if (referencedSetting) {
                    // settingItem.CoinName = referencedSetting.keyname;
                    settingItem = {
                        ...settingItem.toObject(),  // Convert the mongoose object to a plain JavaScript object
                        CoinName : referencedSetting.keyname
                    };
                }
                
                return settingItem;
            }));

            const coinid = settingsWithCoinName[0]?.referenceid

            const walletBalance = await flexibleWallet.findOne({ coinid, userid: authUser });

            if (settingsWithCoinName.length > 0) {
                res.json({ status: "success", sett: settingsWithCoinName, walletBalance });
            }
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}