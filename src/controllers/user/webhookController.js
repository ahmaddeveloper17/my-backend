const express = require('express');
const { CleanHTMLData, CleanDBData } = require('../../config/database/sanetize');
const checkAuthorization = require('../../middlewares/authMiddleware');
const Dummy = require('../../models/dummy');
const CryptoPayment = require('../../models/cryptoPayment');
const flexibleWallet = require('../../models/flexibleWallet');
const setting = require('../../models/setting');
const User = require("../../models/auth");


exports.nowPaymentWebhook = async (req, res) => {
    const postData = req?.body;
    try {

        const dummyData = new Dummy({
            dummydata: JSON.stringify(postData),
        })

        await dummyData.save();

        const orderid = postData?.order_id
        const status = postData?.payment_status // finished
        const amountToAdd = postData?.pay_amount
        const paymentid = postData?.payment_id
        const transactionid = postData?.purchase_id
        const actually_paid = postData?.actually_paid
        const depositFee = postData?.fee?.depositFee

        const CryptoPaymentSave = await CryptoPayment.findOneAndUpdate(
            { orderid }, // Filter: Match the document based on userId and paymentId
            { $set: { status, transactionid, paymentid, actually_paid, depositFee } }, // Update: Set the status to 'completed' and update the timestamp
            { new: true, upsert: false } // Options: Return the updated document, do not create a new one if it doesn't exist
        );

        const userid = CryptoPaymentSave?.userid
        const paycurrency = CryptoPaymentSave?.paycurrency

        const coinNameSearch = await setting.findOne(
            { keyname: paycurrency } // Filter: Match the document based on keyname (e.g., paycurrency)
        );

        const coinid = coinNameSearch?._id?.toString()

        if (status == "finished") {

            const updatedUser = await User.findOneAndUpdate(
                { _id: userid }, // Filter: Match the document based on `_id` and `userid`
                { $set: { status: 'approved' } } // Update: Set `userstatus` to 'approved'
            );

            const updatedWallet = await flexibleWallet.findOneAndUpdate(
                { userid, coinid }, // Filter: Match the document based on userid
                { $inc: { balance: amountToAdd } }, // Increment the balance by amountToAdd
                { new: true, upsert: false } // Options: Return the updated document, do not create a new one if it doesn't exist
            );
        }

        res.json({ status: "success", message: "" });
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.coinPaymentWebhook = async (req, res) => {
    const postData = req?.body;
    try {

        const dummyData = new Dummy({
            dummydata: JSON.stringify(postData),
        })

        await dummyData.save();

        const address = postData?.address
        const status_text = postData?.status_text // Deposit confirmed
        const amountToAdd = postData?.amount
        const paymentid = postData?.deposit_id
        const transactionid = postData?.txn_id

        const find = await CryptoPayment.findOne({ address })

        if (find.actually_paid + amountToAdd >= find.initialamount - 1) {

            await CryptoPayment.findOneAndUpdate(
                { address }, // Filter: Match the document based on userId and paymentId
                {
                    $set: { status: 'finished', transactionid, paymentid },
                    $inc: { actually_paid: amountToAdd }
                }, // Update: Set the status to 'completed' and update the timestamp
                { new: true, upsert: false } // Options: Return the updated document, do not create a new one if it doesn't exist
            );
        } else {

            await CryptoPayment.findOneAndUpdate(
                { address }, // Filter: Match the document based on userId and paymentId
                {
                    $set: { status: 'partially paid', transactionid, paymentid },
                    $inc: { actually_paid: amountToAdd }
                }, // Update: Set the status to 'completed' and update the timestamp
                { new: true, upsert: false } // Options: Return the updated document, do not create a new one if it doesn't exist
            );
        }


        const userid = find?.userid
        const coinname = find?.paycurrency
        const coinsearch = await setting.find({ keyname: coinname });
        const coinid = coinsearch[0]._id
        // console.log("🚀 ~ exports.coinPaymentWebhook= ~ coinid:", coinid)

        // const coinid = "674eca9d34bf7d0f74feebc2" // USDC coin

        if (status_text == "Deposit confirmed") {

            const updatedUser = await User.findOneAndUpdate(
                { _id: userid }, // Filter: Match the document based on `_id` and `userid`
                { $set: { status: 'approved' } } // Update: Set `userstatus` to 'approved'
            );


            const updatedWallet = await flexibleWallet.findOneAndUpdate(
                { userid, coinid }, // Filter: Match the document based on userid
                { $inc: { balance: amountToAdd } }, // Increment the balance by amountToAdd
                { new: true, upsert: false } // Options: Return the updated document, do not create a new one if it doesn't exist
            );
        }

        res.json({ status: "success", message: "" });
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}
