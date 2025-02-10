const express = require('express');
const { CleanHTMLData, CleanDBData } = require('../../config/database/sanetize');
const checkAuthorization = require('../../middlewares/authMiddleware');
const transaction = require('../../models/transaction');
const userdata = require('../../models/auth');
const CryptoPayment = require('../../models/cryptoPayment');

exports.depositSummary = async (req, res) => {
    const postData = req.body;
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await CryptoPayment.find({userid: authUser})

            // const results = await Promise.all(
            //     data.map(async (transaction) => {
            //         const senderDetails = await userdata.findOne({ _id: transaction.senderid });
            //         return {
            //             ...transaction._doc, // Spread transaction data
            //             senderDetails,       // Attach user details
            //         };
            //     })
            // );
            
            res.json({ status: "success", data });
        }

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.withDrawalSummary = async (req, res) => {
    const postData = req.body;
    const keyname = CleanHTMLData(CleanDBData(postData.keyname));
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                senderid: authUser,
                type: "withdrawal"
            })

            if (data.length > 0) {
                res.json({ status: "success", data });
            }
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.referralCommission = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                receiverid: authUser,
                type: "referral commission"
            })

            const results = await Promise.all(
                data.map(async (transaction) => {
                    const senderDetails = await userdata.findOne({ _id: transaction.senderid });
                    return {
                        ...transaction._doc, // Spread transaction data
                        senderDetails,       // Attach user details
                    };
                })
            );
            res.json({ status: "success", data: results });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.dailyFixedProfit = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                receiverid: authUser,
                type: "daily profit fixed-term"
            })

            const results = await Promise.all(
                data.map(async (transaction) => {
                    const senderDetails = await userdata.findOne({ _id: transaction.senderid });
                    return {
                        ...transaction._doc, // Spread transaction data
                        senderDetails,       // Attach user details
                    };
                })
            );
            res.json({ status: "success", data: results });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.dailyFlexibleProfit = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                receiverid: authUser,
                type: "daily profit flexible"
            })

            const results = await Promise.all(
                data.map(async (transaction) => {
                    const senderDetails = await userdata.findOne({ _id: transaction.senderid });
                    return {
                        ...transaction._doc, // Spread transaction data
                        senderDetails,       // Attach user details
                    };
                })
            );
            res.json({ status: "success", data: results });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.dailyReferralFlexedProfit = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                receiverid: authUser,
                type: "daily referral fixed-term"
            })

            const results = await Promise.all(
                data.map(async (transaction) => {
                    const senderDetails = await userdata.findOne({ _id: transaction.senderid });
                    return {
                        ...transaction._doc, // Spread transaction data
                        senderDetails,       // Attach user details
                    };
                })
            );
            res.json({ status: "success", data: results });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.dailyReferralFlexibleProfit = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await transaction.find({
                receiverid: authUser,
                type: "daily referral flexible"
            })

            const results = await Promise.all(
                data.map(async (transaction) => {
                    const senderDetails = await userdata.findOne({ _id: transaction.senderid });
                    return {
                        ...transaction._doc, // Spread transaction data
                        senderDetails,       // Attach user details
                    };
                })
            );
            res.json({ status: "success", data: results });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}
