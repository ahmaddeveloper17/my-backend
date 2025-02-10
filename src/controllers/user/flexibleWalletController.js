var axios = require('axios');
const express = require("express");
const {
    CleanHTMLData,
    CleanDBData,
} = require("../../config/database/sanetize");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const checkAuthorization = require('../../middlewares/authMiddleware');
const flexibleWallet = require('../../models/flexibleWallet');
const transaction = require('../../models/transaction');
const setting = require('../../models/setting');
const User = require('../../models/auth');
const { userdata, sponsordata, settingsdata } = require('../../helpers/functions');
const CryptoPayment = require('../../models/cryptoPayment');
const Coinpayments = require('coinpayments');

const CoinPaymentKey = process.env.COINPAYMENT_KEY
const CoinPaymentSecret = process.env.COINPAYMENT_SECRET
const NowPaymentSecret = process.env.NOWPAYMENT_KEY

function generateRandomCode() {
  const randomLetters = Array.from({ length: 10 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
  ).join('');

  const randomNumbers = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 10) // 0-9
  ).join('');

  return `${randomLetters}-${randomNumbers}`;
}

const credentials = {
  key: CoinPaymentKey,
  secret: CoinPaymentSecret,
};
const client = new Coinpayments(credentials);

exports.buyCrypto = async (req, res) => {
    const postData = req.body;
    const coin = CleanHTMLData(CleanDBData(postData.coin));
    const network = CleanHTMLData(CleanDBData(postData.network));
    const amount = parseFloat(CleanHTMLData(CleanDBData(postData.amount))); // Ensure it's a number
    console.log(coin)

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            // Check if a wallet already exists for this coin and user
            const verifyWallet = await flexibleWallet.findOne({
                coinid: coin,
                userid: authUser,
            });

            let wallet;
            if (verifyWallet) {
                // Wallet exists, update the balance
                verifyWallet.balance += amount; // Add the amount to the existing balance
                wallet = await verifyWallet.save();
            } else {
                // Wallet does not exist, create a new one
                wallet = new flexibleWallet({
                    userid: authUser,
                    coinid: coin,
                    balance: amount,
                    network,
                });
                await wallet.save();
            }

            const coinName = await setting.findById(coin);

      // Log the transaction
      const detailForTransaction = `${amount} ${coinName.keyname} deposited using ${network}`;
      const tran = new transaction({
        senderid: authUser,
        receiverid: "", // Replace with the admin ID
        amount,
        type: "deposit",
        detail: detailForTransaction,
        referenceid: wallet._id, // Reference the wallet's ID
        status: "approved",
        coinname: coinName.keyname,
      });

            await tran.save();

            // Update user status if needed (unsure if creating a new user instance is the correct approach here)
            await User.updateOne(
                { _id: authUser }, // Use the authenticated user's ID
                { status: "approved" } // Update status
            );

            const userData = await userdata(authUser);
            const refPer = await settingsdata('referral_bonus');

            let refferalCommission = (amount * parseFloat(refPer.keyvalue)) / 100

            let detailRef = `Congratulations! You have earned a referral commission of amount ${refferalCommission} from user ${userData.username}`;

            const tranRefeeralCommission = new transaction({
                senderid: authUser,
                receiverid: userData.sponsorid,  // Replace with the admin ID
                amount: refferalCommission,
                type: 'referral commission',
                detail: detailRef,
                status: "approved"
            });

            await tranRefeeralCommission.save();

            res.json({ status: "success", message: "Deposit successful! Funds added to your account balance." });
        } else {
            res.json({ status: "error", message: "Unauthorized user." });
        }
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
        res.json({ status: "error", message: "An error occurred." });
    }

};

exports.withdrawal = async (req, res) => {
    const postData = req.body;
    const coinNameFromPa = CleanHTMLData(CleanDBData(postData.coin));
    const amount = parseFloat(CleanHTMLData(CleanDBData(postData.amount))); // Ensure it's a number
    const memo = CleanHTMLData(CleanDBData(postData.memo));
    const network = CleanHTMLData(CleanDBData(postData.cryptoChain));
    const walletAddress = CleanHTMLData(CleanDBData(postData.walletAddress));

    try {
        const authUser = await checkAuthorization(req, res);

        if (authUser) {
            const coinsearch = await setting.find({
                keyname:coinNameFromPa
            })
            let coinid = coinsearch[0].id
            const updatedWallet = await flexibleWallet.findOneAndUpdate(
                {
                    coinid: coinid,
                    userid: authUser,
                }, // Find the wallet by ID
                { $inc: { balance: -amount } }, // Subtract the specified amount from the balance
                { new: true, upsert: false } // Return the updated document (new: true), no insert if not found
            );

            // const coinName = await setting.findById(coin);

            const user =  await userdata(authUser)
            // const coinname = user?.withdrawalCoin

            // Log the transaction
            const detailForTransaction = `${amount} ${coinNameFromPa} withdrawal`;
            const tran = new transaction({
                senderid: authUser,
                receiverid: "0", // Replace with the admin ID
                amount,
                type: "withdrawal",
                detail: detailForTransaction,
                referenceid: updatedWallet._id, // Reference the wallet's ID
                status: "pending",
                coinname: coinNameFromPa,
                memo:memo,
                network,
                walletAddress
            });

            await tran.save();

            res.json({ status: "success", message: "Withdrawal request has been sent to admin, it will be verify soon." });
        } else {
            res.json({ status: "error", message: "Unauthorized user." });
        }
    } catch (error) {
        console.error("🚀 ~ buyCrypto ~ error:", error);
        res.json({ status: "error", message: "An error occurred." });
    }
};

exports.nowPayments = async (req, res) => {
  const postData = req.body;
  // console.log("🚀 ~ exports.nowPayments= ~ postData:", postData)
  const coin = CleanHTMLData(CleanDBData(postData.coin));
  const coinname = CleanHTMLData(CleanDBData(postData.coinname));
  const network = CleanHTMLData(CleanDBData(postData.network));
  const amount = parseFloat(CleanHTMLData(CleanDBData(postData.amount)));

  try {
    const authUser = await checkAuthorization(req, res);

    if (authUser) {

      const orderid = generateRandomCode()
      let currency, payCurrency
      if (network === "Binance Smart Chain (BSC)" && coinname === "USDC") {
        currency = "usdcbsc"
        payCurrency = "usd"
      } else if (network === "XLM (Stellar)" && coinname === "USDC") {
        currency = "usdcxlm"
        payCurrency = "usd"
      } else if (network === "XLM (Stellar)" && coinname === "XLM") {
        currency = "xlm"
        payCurrency = "xlm"

      }



      const data = JSON.stringify({
        price_amount: amount,
        price_currency: payCurrency,
        pay_currency: currency,
        ipn_callback_url: "https://backendearnusdc.m5networkhub.com/user/api/nowPaymentWebhook",
        order_id: orderid,
        order_description: `${coinname} ${amount} deposit from ${network}`,
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.nowpayments.io/v1/payment',
        headers: {
          'x-api-key': NowPaymentSecret,
          'Content-Type': 'application/json',
        },
        data,
      };

      const response = await axios(config);
      const resFromNow = response.data
      // console.log("Response data:", resFromNow);

      const CryptoPaymentsave = new CryptoPayment({
        source: "nowPayment",
        userid: authUser,
        address: resFromNow.pay_address,
        paymentid: resFromNow.payment_id,
        paycurrency: coinname,
        network: network,
        orderid: orderid,
        status: 'pending',
        initialamount:amount
      })


      await CryptoPaymentsave.save()

      res.json({ status: "success", data: response.data, resFromNow });
    }
  } catch (error) {
    console.error("Error in nowPayments API:", error);
    res.json({ status: "error", message: error?.response?.data?.message || "Something went wrong. Please try again later" });
  }
};

exports.coinPayments = async (req, res) => {
  const postData = req.body;
  // console.log("🚀 ~ exports.coinPayments= ~ postData:", postData)
  // const coin = CleanHTMLData(CleanDBData(postData.coin));
  // const coinname = CleanHTMLData(CleanDBData(postData.coinname));
  // const network = CleanHTMLData(CleanDBData(postData.network));
  const amount = parseFloat(CleanHTMLData(CleanDBData(postData.amount)));

  try {
    const authUser = await checkAuthorization(req, res);

    if (authUser) {

      const orderid = generateRandomCode()

      const options = {
        // currency: 'LTCT', // Replace with your desired currency
        currency: 'USDC.TRC20', // Replace with your desired currency
        ipn_url: 'https://backendearnusdc.m5networkhub.com/user/api/coinPaymentWebhook', // Optional
      };

      const address = await client.getCallbackAddress(options);
      // console.log('Callback Address:', address);

      const CryptoPaymentsave = new CryptoPayment({
        source: "coinPayment",
        userid: authUser,
        address: address.address,
        orderid: orderid,
        paycurrency: 'USDC',
        network: "Tron/TRC20",
        status: 'pending',
        initialamount:amount
      })

      await CryptoPaymentsave.save()

      res.json({ status: "success", data: {pay_address:address.address} });
    }
  } catch (error) {
    console.error("Error in coinPayments API:", error);
    res.json({ status: "error", message: "Something went wrong. Please try again later" });
  }
};
