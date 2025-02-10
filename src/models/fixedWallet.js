const mongoose = require("mongoose");

const fixedWalletSchema = new mongoose.Schema(
    {
        userid: { type: String, required: true },
        coinid: { type: String, required: true },
        period: { type: String, required: true },
        amount: { type: Number, required: true },
        autoReNew: { type: Boolean, required: true },
        expirationDate: { type: Date, required: true },
        status: { type: String, required: true },
        dailyProfit: { type: Number, default: 0 },
        dailyReferralProfit: { type: Number, default: 0 }
    },
    { collection: "termWallet", versionKey: false, timestamps: true }
);

const fixedWallet = mongoose.model("fixedWallet", fixedWalletSchema);

module.exports = fixedWallet;

// terms  table