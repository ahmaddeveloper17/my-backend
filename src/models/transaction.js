const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        senderid: { type: String },
        receiverid: { type: String, required: true },
        amount: { type: Number, required: true },
        type: { type: String, required: true },
        detail: { type: String, required: true },
        coinid: { type: String },
        coinname: { type: String },
        referenceid: { type: String },
        status: { type: String },
        memo: { type: String },
        network: { type: String },
        walletAddress: { type: String },
        fixedTermId: { type: String },
    },
    { collection: "transaction", versionKey: false, timestamps: true }
);

const transaction = mongoose.model("transaction", transactionSchema);

module.exports = transaction;
