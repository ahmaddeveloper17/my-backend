const express = require('express');
const { CleanHTMLData, CleanDBData, backOffice_link } = require('../../config/database/sanetize');
const User = require('../../models/auth');
const checkAuthorization = require('../../middlewares/authMiddleware');
const fixedWallet = require('../../models/fixedWallet');
const setting = require('../../models/setting');
const flexibleWallet = require('../../models/flexibleWallet');
const transaction = require('../../models/transaction');
const { ObjectId } = require('mongodb');
const { userdata, sponsordata, settingsdata } = require('../../helpers/functions');
const { addMonths } = require('date-fns');



exports.referralusers = async (req, res) => {
    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const data = await User.find({
                sponsorid: authUser
            })
            const updated = await data.map((user, i) => {
                return {
                    ...user.toObject(),
                    backOffice_link: `${backOffice_link}/public/uploads/profile/`
                }
            })
            res.json({ status: "success", data: updated });
        }
    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.dailyFixedProfit = async (req, res) => {
    try {
        // const authUser = await checkAuthorization(req, res);

        const keynames = "USDC, XLM"
        const keysArray = keynames?.split(',').map((key) => key.trim());
        const coinNamesArray = await setting.find({ keyname: { $in: keysArray } });

        // daily profit

        const getTermsWallet = await fixedWallet.find({ status: "active" })
        for (const profit of getTermsWallet) {

            const amount = profit.amount
            const userid = profit.userid
            const coinid = profit.coinid
            const period = profit.period
            const termId = profit._id

            const coinData = coinNamesArray.find(coin => coin._id.toString() === coinid.toString());

            let monthlyPer = 0

            if (period === '1') {
                monthlyPer = coinData.one_month_profit
            }
            if (period === '3') {
                monthlyPer = coinData.three_month_profit
            }
            if (period === '6') {
                monthlyPer = coinData.six_month_profit
            }

            let dailyPer = monthlyPer / 30
            let dailyProfit = ((amount * dailyPer) / 100).toFixed(3)

            const addDataInWallet = await flexibleWallet.updateOne(
                { userid, coinid }, // Filter by userId and coinId
                { $inc: { balance: dailyProfit } } // Increment the balance by the amount
            );

            const updateFixedTerm = await fixedWallet.updateOne(
                { _id: termId }, // Filter by userId and coinId
                { $inc: { dailyProfit: dailyProfit } } // Increment the balance by the amount
            );

            const DetailTransaction = `Daily profit of amount ${dailyProfit} has been added to ${coinData.keyname} wallet`

            const transactionsave = new transaction({
                receiverid: userid,
                amount: dailyProfit,
                type: "daily profit fixed-term",
                detail: DetailTransaction,
                coinname: coinData.keyname,
                coinid: coinData._id
            })

            await transactionsave.save();
        }

        // daily referral profit

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Set time to the start of the day (UTC)

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999); // Set time to the end of the day (UTC)

        const getTransaction = await transaction.find({
            type: "daily profit fixed-term",
            createdAt: {
                $gte: startOfDay, // Greater than or equal to the start of the day
                $lte: endOfDay    // Less than or equal to the end of the day
            }
        });

        const groupedSums = getTransaction.reduce((acc, item) => {
            const key = `${item.receiverid}-${item.coinname}-${item.coinid}`;
            if (!acc[key]) {
                acc[key] = {
                    receiverid: item.receiverid,
                    coinname: item.coinname,
                    coinid: item.coinid,
                    totalAmount: 0,
                };
            }
            acc[key].totalAmount += item.amount;
            return acc;
        }, {});

        // Converting grouped results to an array
        const result = Object.values(groupedSums);


        let profitDataFromSetting = await settingsdata('daily_referral_profit_fixed_terms')
        let daily_referral_profit_fixed_terms_per = parseFloat(profitDataFromSetting.keyvalue)


        for (const sumData of result) {
            let receiverData = await userdata(sumData.receiverid)
            let daily_referral_profit_fixed_terms_amount = ((sumData.totalAmount * daily_referral_profit_fixed_terms_per) / 100).toFixed(3)
            console.log(daily_referral_profit_fixed_terms_amount)

            const addDataInWallet = await flexibleWallet.updateOne(
                { userid: receiverData.sponsorid, coinid: sumData.coinid }, // Filter by userId and coinId
                { $inc: { balance: daily_referral_profit_fixed_terms_amount } } // Increment the balance by the amount
            );

            const DetailTransaction = `Daily referral profit of amount ${daily_referral_profit_fixed_terms_amount} has been added to ${sumData.coinname} wallet`

            const transactionsave = new transaction({
                receiverid: receiverData.sponsorid,
                amount: daily_referral_profit_fixed_terms_amount,
                type: "daily referral profit fixed-term",
                detail: DetailTransaction,
                coinname: sumData.coinname,
                coinid: sumData.coinid
            })

            await transactionsave.save();
        }

        res.json({ status: "success" });

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: error.message });
    }
}

exports.dailyFlexibleProfit = async (req, res) => {
    try {

        const keynames = "USDC, XLM, daily_profit_flexible"
        const keysArray = keynames?.split(',').map((key) => key.trim());
        const coinNamesArray = await setting.find({ keyname: { $in: keysArray } });

        const monthlyProfit = coinNamesArray.find(item => item.keyname === "daily_profit_flexible").keyvalue // Example monthly profit percentage

        // daily profit
        const UsersData = await User.find({ status: "approved", usertype: "user" })
        // console.log("🚀 ~ exports.dailyFixedProfit= ~ UsersData:", UsersData)
        for (const profit of UsersData) {
            const userid = profit._id
            const Wallets = await flexibleWallet.find({ userid })

            for (const wallet of Wallets) {
                const coinid = wallet.coinid
                const userid = wallet.userid
                const amount = wallet.balance
                const coinData = coinNamesArray.find(coin => coin._id.toString() === coinid.toString());

                if (amount > 0) {
                    let amountToAdd = ((amount * (parseFloat(monthlyProfit)) / 30) / 100).toFixed(3)
                    const addDataInWallet = await flexibleWallet.updateOne(
                        { userid, coinid },
                        { $inc: { balance: amountToAdd } }
                    );

                    const DetailTransaction = `Daily profit of amount ${amountToAdd} has been added to ${coinData.keyname} wallet`

                    const transactionsave = new transaction({
                        receiverid: userid,
                        amount: amountToAdd,
                        type: "daily profit flexible",
                        detail: DetailTransaction,
                        coinname: coinData.keyname,
                        coinid: coinData._id
                    })

                    await transactionsave.save();
                }
            }
        }


        // daily referral profit

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Set time to the start of the day (UTC)

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999); // Set time to the end of the day (UTC)

        const getTransaction = await transaction.find({
            type: "daily profit flexible",
            createdAt: {
                $gte: startOfDay, // Greater than or equal to the start of the day
                $lte: endOfDay    // Less than or equal to the end of the day
            }
        });

        const groupedSums = getTransaction.reduce((acc, item) => {
            const key = `${item.receiverid}-${item.coinname}-${item.coinid}`;
            if (!acc[key]) {
                acc[key] = {
                    receiverid: item.receiverid,
                    coinname: item.coinname,
                    coinid: item.coinid,
                    totalAmount: 0,
                };
            }
            acc[key].totalAmount += item.amount;
            return acc;
        }, {});

        // Converting grouped results to an array
        const result = Object.values(groupedSums);


        let profitDataFromSetting = await settingsdata('daily_referral_profit_flexible')
        let daily_referral_profit_fixed_terms_per = parseFloat(profitDataFromSetting.keyvalue)


        for (const sumData of result) {
            let receiverData = await userdata(sumData.receiverid)
            let daily_referral_profit_fixed_terms_amount = ((sumData.totalAmount * daily_referral_profit_fixed_terms_per) / 100).toFixed(3)

            const addDataInWallet = await flexibleWallet.updateOne(
                { userid: receiverData.sponsorid, coinid: sumData.coinid }, // Filter by userId and coinId
                { $inc: { balance: daily_referral_profit_fixed_terms_amount } } // Increment the balance by the amount
            );

            const DetailTransaction = `Daily referral profit of amount ${daily_referral_profit_fixed_terms_amount} has been added to ${sumData.coinname} wallet`

            const transactionsave = new transaction({
                receiverid: receiverData.sponsorid,
                amount: daily_referral_profit_fixed_terms_amount,
                type: "daily referral profit flexible",
                detail: DetailTransaction,
                coinname: sumData.coinname,
                coinid: sumData.coinid
            })

            await transactionsave.save();
        }

        res.json({ status: "success", message: "Success" });

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

function checkTimeDifference(dbTimestamp) {
    // Convert the timestamp into a Date object
    const dbDate = new Date(dbTimestamp);

    // Get the current date and time
    const currentDate = new Date();

    // Calculate the time difference in milliseconds
    const timeDifference = currentDate - dbDate;

    // Convert the time difference from milliseconds to hours
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    return hoursDifference
}

exports.dailyFixedProfitCopy = async (req, res) => {
    try {

        const keynames = "USDC, XLM"
        const keysArray = keynames?.split(',').map((key) => key.trim());
        const coinNamesArray = await setting.find({ keyname: { $in: keysArray } });

        // daily profit

        const getTermsWallet = await fixedWallet.find({ status: "active" })
        // console.log("🚀 ~ exports.dailyFixedProfitCopy= ~ getTermsWallet:", getTermsWallet.length)
        for (const profit of getTermsWallet) {

            const amount = profit.amount
            const userid = profit.userid
            const coinid = profit.coinid
            const period = profit.period
            const termId = profit._id
            const createdAt = profit.createdAt
            const updatedAt = profit.updatedAt

            // Check if 24 hours have passed
            const hoursDifference = checkTimeDifference(createdAt);

            if (hoursDifference >= 24) {
                console.log("24 hours have passed.");
                console.log(typeof (createdAt))

                const currentDate = new Date(); // Current date and time
                const twentyFourHoursAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

                const getTransactions = await transaction.findOne({
                    type: "daily profit fixed-term",
                    receiverid: userid,
                    fixedTermId: termId,
                    createdAt: { $gte: twentyFourHoursAgo } // Filter for records created within the last 24 hours
                });

                console.log(getTransactions)

                if (!getTransactions) {
                    console.log("24 hours have passed. For wallet");

                    const coinData = coinNamesArray.find(coin => coin._id.toString() === coinid.toString());
                    let monthlyPer = 0

                    if (period === '1') {
                        monthlyPer = coinData.one_month_profit
                    }
                    if (period === '3') {
                        monthlyPer = coinData.three_month_profit
                    }
                    if (period === '6') {
                        monthlyPer = coinData.six_month_profit
                    }

                    let dailyPer = monthlyPer / 365
                    let dailyProfit = ((amount * dailyPer) / 100).toFixed(3)

                    const addDataInWallet = await flexibleWallet.updateOne(
                        { userid, coinid }, // Filter by userId and coinId
                        { $inc: { balance: dailyProfit } } // Increment the balance by the amount
                    );

                    const updateFixedTerm = await fixedWallet.updateOne(
                        { _id: termId }, // Filter by userId and coinId
                        { $inc: { dailyProfit: dailyProfit } } // Increment the balance by the amount
                    );

                    const DetailTransaction = `Daily profit of amount ${dailyProfit} has been added to ${coinData.keyname} wallet`

                    const transactionsave = new transaction({
                        receiverid: userid,
                        amount: dailyProfit,
                        type: "daily profit fixed-term",
                        detail: DetailTransaction,
                        coinname: coinData.keyname,
                        coinid: coinData._id,
                        fixedTermId: termId
                    })

                    await transactionsave.save();

                    // daily referral Profit
                    let profitDataFromSetting = await settingsdata('daily_referral_profit_fixed_terms')
                    let daily_referral_profit_fixed_terms_per = parseFloat(profitDataFromSetting.keyvalue)

                    let receiverData = await userdata(transactionsave.receiverid)
                    let daily_referral_profit_fixed_terms_amount = ((transactionsave.amount * daily_referral_profit_fixed_terms_per) / 100).toFixed(3)
                    console.log(daily_referral_profit_fixed_terms_amount)

                    const addDataInWallet11 = await flexibleWallet.updateOne(
                        { userid: receiverData.sponsorid, coinid: transactionsave.coinid }, // Filter by userId and coinId
                        { $inc: { balance: daily_referral_profit_fixed_terms_amount } } // Increment the balance by the amount
                    );

                    const DetailTransaction11 = `Daily referral profit of amount ${daily_referral_profit_fixed_terms_amount} has been added to ${transactionsave.coinname} wallet`

                    const transactionsave11 = new transaction({
                        receiverid: receiverData.sponsorid,
                        amount: daily_referral_profit_fixed_terms_amount,
                        type: "daily referral profit fixed-term",
                        detail: DetailTransaction,
                        coinname: transactionsave.coinname,
                        coinid: transactionsave.coinid
                    })

                    await transactionsave11.save();

                }


            } else {
                console.log("24 hours have not passed.");
            }

        }


        res.json({ status: "success" });

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: error.message });
    }
}

exports.dailyFlexibleProfitCopy = async (req, res) => {
    try {

        const keynames = "USDC, XLM, daily_profit_flexible"
        const keysArray = keynames?.split(',').map((key) => key.trim());
        const coinNamesArray = await setting.find({ keyname: { $in: keysArray } });

        const monthlyProfit = coinNamesArray.find(item => item.keyname === "daily_profit_flexible").keyvalue // Example monthly profit percentage

        // daily profit
        const UsersData = await User.find({ status: "approved", usertype: "user" })
        // console.log("🚀 ~ exports.dailyFixedProfit= ~ UsersData:", UsersData)
        for (const profit of UsersData) {
            const userid = profit._id
            const Wallets = await flexibleWallet.find({ userid })

            for (const wallet of Wallets) {
                const coinid = wallet.coinid
                const userid = wallet.userid
                const amount = wallet.balance
                const coinData = coinNamesArray.find(coin => coin._id.toString() === coinid.toString());

                if (amount > 0) {
                    let amountToAdd = ((amount * (parseFloat(monthlyProfit)) / 365) / 100).toFixed(3)
                    const addDataInWallet = await flexibleWallet.updateOne(
                        { userid, coinid },
                        { $inc: { balance: amountToAdd } }
                    );

                    const DetailTransaction = `Daily profit of amount ${amountToAdd} has been added to ${coinData.keyname} wallet`

                    const transactionsave = new transaction({
                        receiverid: userid,
                        amount: amountToAdd,
                        type: "daily profit flexible",
                        detail: DetailTransaction,
                        coinname: coinData.keyname,
                        coinid: coinData._id
                    })

                    await transactionsave.save();
                }
            }
        }


        // daily referral profit

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Set time to the start of the day (UTC)

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999); // Set time to the end of the day (UTC)

        const getTransaction = await transaction.find({
            type: "daily profit flexible",
            createdAt: {
                $gte: startOfDay, // Greater than or equal to the start of the day
                $lte: endOfDay    // Less than or equal to the end of the day
            }
        });

        const groupedSums = getTransaction.reduce((acc, item) => {
            const key = `${item.receiverid}-${item.coinname}-${item.coinid}`;
            if (!acc[key]) {
                acc[key] = {
                    receiverid: item.receiverid,
                    coinname: item.coinname,
                    coinid: item.coinid,
                    totalAmount: 0,
                };
            }
            acc[key].totalAmount += item.amount;
            return acc;
        }, {});

        // Converting grouped results to an array
        const result = Object.values(groupedSums);


        let profitDataFromSetting = await settingsdata('daily_referral_profit_flexible')
        let daily_referral_profit_fixed_terms_per = parseFloat(profitDataFromSetting.keyvalue)


        for (const sumData of result) {
            let receiverData = await userdata(sumData.receiverid)
            let daily_referral_profit_fixed_terms_amount = ((sumData.totalAmount * daily_referral_profit_fixed_terms_per) / 100).toFixed(3)

            const addDataInWallet = await flexibleWallet.updateOne(
                { userid: receiverData.sponsorid, coinid: sumData.coinid }, // Filter by userId and coinId
                { $inc: { balance: daily_referral_profit_fixed_terms_amount } } // Increment the balance by the amount
            );

            const DetailTransaction = `Daily referral profit of amount ${daily_referral_profit_fixed_terms_amount} has been added to ${sumData.coinname} wallet`

            const transactionsave = new transaction({
                receiverid: receiverData.sponsorid,
                amount: daily_referral_profit_fixed_terms_amount,
                type: "daily referral profit flexible",
                detail: DetailTransaction,
                coinname: sumData.coinname,
                coinid: sumData.coinid
            })

            await transactionsave.save();
        }

        res.json({ status: "success", message: "Success" });

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: "An error occurred" });
    }
}

exports.termStatus = async (req, res) => {
    try {
        // const authUser = await checkAuthorization(req, res);
        const getTerms = await fixedWallet.find({ status: "active" })

        // console.log("🚀 ~ exports.termStatus= ~ getTerms:", getTerms)

        for (const getTerm of getTerms) {
            const autoReNew = getTerm.autoReNew
            const userid = getTerm.userid
            const coinid = getTerm.coinid
            const period = getTerm.period
            const amount = getTerm.amount
            const termId = getTerm._id
            const expirationDate = getTerm.expirationDate

            // Get current date and time
            const currentDate = new Date();
            // Convert expirationDate to a Date object
            const expirationDateCheck = new Date(expirationDate);
            // Check if the expirationDate has passed
            const isExpired = expirationDateCheck < currentDate;

            if (isExpired) {
                console.log('The record has expired');
                if (autoReNew) {
                    let expirationDateAdd
                    if (period === '1') {
                        expirationDateAdd = addMonths(new Date(expirationDate), 1); // Add 1 month
                    }
                    if (period === '3') {
                        expirationDateAdd = addMonths(new Date(expirationDate), 3); // Add 3 month
                    }
                    if (period === '6') {
                        expirationDateAdd = addMonths(new Date(expirationDate), 6); // Add 6 month
                    }
                    const updateExpireTime = await fixedWallet.updateOne(
                        { _id: termId }, // Filter by termId
                        {
                            $set: { expirationDate: expirationDateAdd }, // Set the new expirationDate
                        }
                    );
                    const transactionsave = new transaction({
                        senderid: userid,
                        type: "fixed-term",
                        fixedTermId: termId,
                        status: "renew"
                    })

                    await transactionsave.save();
                } else {
                    const updateTermStatus = await fixedWallet.updateOne(
                        { _id: termId }, // Filter by termId
                        {
                            $set: { status: "expired" }, // Set the status to inactive
                        }
                    );

                    const addDataInWallet = await flexibleWallet.updateOne(
                        { userid, coinid }, // Filter by userId and coinId
                        { $inc: { balance: amount } } // Increment the balance by the amount
                    );

                    const transactionsave = new transaction({
                        senderid: userid,
                        type: "fixed-term",
                        fixedTermId: termId,
                        status: "expired"
                    })

                    await transactionsave.save();

                }
            } else {
                console.log('The record is not expired yet');
            }
        }

        res.json({ status: "success" });

    } catch (error) {
        console.log("🚀 ~ router.post ~ error:", error)
        res.json({ status: "error", message: error.message });
    }
}