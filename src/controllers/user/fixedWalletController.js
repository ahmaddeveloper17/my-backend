const express = require('express');
const { CleanHTMLData, CleanDBData } = require('../../config/database/sanetize');
const User = require('../../models/auth');
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const checkAuthorization = require('../../middlewares/authMiddleware');
const fixedWallet = require('../../models/fixedWallet');
const setting = require('../../models/setting');
const flexibleWallet = require('../../models/flexibleWallet');
const transaction = require('../../models/transaction');
const { userdata, settingsdataById, settingsdata } = require('../../helpers/functions');



exports.buyFixed = async (req, res) => {
    const postData = req.body;
    const coinid = CleanHTMLData(CleanDBData(postData.coin));
    const period = parseInt(CleanHTMLData(CleanDBData(postData.period)))
    const amount = CleanHTMLData(CleanDBData(postData.amount));
    const autoReNew = CleanHTMLData(CleanDBData(postData.autoRenew));
    try {
        const authUser = await checkAuthorization(req, res);

        // Calculate expirationDate
        const now = new Date(); // Current date
        const expirationDate = new Date(now); // Create a copy of now
        expirationDate.setMonth(expirationDate.getMonth() + period); // Add the period in months

        if (authUser) {
            const data = new fixedWallet({
                userid: authUser,
                period,
                amount,
                coinid,
                autoReNew,
                expirationDate,
                status: "active",
            });
            await data.save();


            const userData = await userdata(authUser);
            const refPer = await settingsdata('referral_bonus');

            let refferalCommission = (amount * parseFloat(refPer.keyvalue)) / 100

            let detailRef = `Congratulations! You have earned a referral commission of amount ${refferalCommission} from user ${userData.username}`;

            let getCoinData = await settingsdataById(coinid)

            const tranRefeeralCommission = new transaction({
                senderid: authUser,
                receiverid: userData.sponsorid,  // Replace with the admin ID
                amount: refferalCommission,
                type: 'referral commission',
                coinid: coinid,
                coinname: getCoinData.keyname,
                detail: detailRef,
                status: "approved"
            });

            await tranRefeeralCommission.save();

            await flexibleWallet.updateOne(
                { userid: authUser, coinid: coinid },
                { $inc: { balance: -amount } } // Subtract the amount
            );

            res.json({ status: "success", message: "Fixed-Term has been purchased successfully!" });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.getFixedTerm = async (req, res) => {
    const postData = req.body;
    let { keynames } = req.body;

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            // Fetch fixedWallet data
            const fixedWall = await fixedWallet.find({ status: "active", userid: authUser });

            // Extract coin IDs from fixedWall
            const coinIds = fixedWall.map(wallet => wallet.coinid);

            // Fetch corresponding settings for the coin IDs
            const sett = await setting.find({ _id: { $in: coinIds } });

            // Map fixedWall entries with their respective coin names
            const fixedWallWithCoinNames = fixedWall
                .map(wallet => {
                    const coinSetting = sett.find(setting => setting._id.toString() === wallet.coinid.toString());
                    return {
                        ...wallet._doc, // Spread other wallet data
                        coinName: coinSetting ? coinSetting.keyname : "Unknown Coin" // Add the coin name
                    };
                })
                .sort((a, b) => {
                    // Compare by _id in descending order
                    if (a._id.toString() < b._id.toString()) return 1;  // a comes after b
                    if (a._id.toString() > b._id.toString()) return -1; // a comes before b
                    return 0; // Equal
                });


            const keysArray = keynames?.split(',').map((key) => key.trim());
            const getSettingCoin = await setting.find({ keyname: { $in: keysArray } });

            const maxAmountPurchase = await flexibleWallet.find({ userid: authUser });

            res.json({ status: "success", fixedWall: fixedWallWithCoinNames, getSettingCoin, maxAmountPurchase });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error);
        res.json({ status: "error", message: "An error occurred" });
    }
};
exports.getExpiredTerm = async (req, res) => {
    const postData = req.body;
    let { keynames } = req.body;

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            // Fetch fixedWallet data
            const fixedWall = await fixedWallet.find({ status: "expired", userid: authUser });

            // Extract coin IDs from fixedWall
            const coinIds = fixedWall.map(wallet => wallet.coinid);

            // Fetch corresponding settings for the coin IDs
            const sett = await setting.find({ _id: { $in: coinIds } });

            // Map fixedWall entries with their respective coin names
            const fixedWallWithCoinNames = fixedWall
                .map(wallet => {
                    const coinSetting = sett.find(setting => setting._id.toString() === wallet.coinid.toString());
                    return {
                        ...wallet._doc, // Spread other wallet data
                        coinName: coinSetting ? coinSetting.keyname : "Unknown Coin" // Add the coin name
                    };
                })
                .sort((a, b) => {
                    // Compare by _id in descending order
                    if (a._id.toString() < b._id.toString()) return 1;  // a comes after b
                    if (a._id.toString() > b._id.toString()) return -1; // a comes before b
                    return 0; // Equal
                });


            const keysArray = keynames?.split(',').map((key) => key.trim());
            const getSettingCoin = await setting.find({ keyname: { $in: keysArray } });

            res.json({ status: "success", fixedWall: fixedWallWithCoinNames, getSettingCoin });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error);
        res.json({ status: "error", message: "An error occurred" });
    }
};

exports.updateFixedActive = async (req, res) => {
    const postData = req.body;
    const id = CleanHTMLData(CleanDBData(postData.id));
    const autoReNew = CleanHTMLData(CleanDBData(postData.autoReNew));

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await fixedWallet.findById(id);
            data.autoReNew = autoReNew;
            await data.save();

            if (autoReNew === 'true') {
                res.json({ status: "success", message: "Auto Renewal has been On successfully!" });
            }
            else {
                res.json({ status: "success", message: "Auto Renewal has been Off successfully!" });
            }

        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}
