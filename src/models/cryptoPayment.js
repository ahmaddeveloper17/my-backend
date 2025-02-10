const mongoose = require("mongoose");

const CryptoPaymentSchema = new mongoose.Schema(
    {
        source: { type: String, required: true },
        userid: { type: String, required: true },
        address: { type: String, required: true },
        paymentid: { type: String },
        paycurrency: { type: String },
        transactionid: { type: String },
        actually_paid: { type: Number },
        depositFee: { type: String },
        network: { type: String },
        orderid: { type: String, required: true },
        status: { type: String, required: true },
        initialamount: { type: Number, }
    },
    { collection: "cryptoPayment", versionKey: false, timestamps: true }
);

const CryptoPayment = mongoose.model("CryptoPayment", CryptoPaymentSchema);

module.exports = CryptoPayment;

// terms  table