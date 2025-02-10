const mongoose = require("mongoose");

const flexibleWalletSchema = new mongoose.Schema(
    {
        userid: { type: String, required: true },
        coinid: { type: String, required: true },
        balance: { type: Number, required: true },
        network: { type: String },
    },
    { collection: "wallet", versionKey: false, timestamps: true }
);

const flexibleWallet = mongoose.model("flexibleWallet", flexibleWalletSchema);

module.exports = flexibleWallet;
