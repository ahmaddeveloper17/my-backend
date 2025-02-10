const mongoose = require("mongoose");

const userAuthSchema = new mongoose.Schema(
  {
    sponsorid: { type: String, required: true},
    referralCode: { type: String, required: true},
    username: { type: String, unique: true, required: true },
    firstname: { type: String, required: true },
    profileimage: { type: String},
    forgotpasswordotp: { type: String},
    lastname: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },  
    usertype: { type: String, default: 'user' },
    allowedroutes: { type: Array },
    status: { type: String, required: true },
    withdrawalCoinUsdc: { type: String },
    withdrawalNetworkUsdc: { type: String },
    withdrawalWalletAddressUsdc: { type: String },
    withdrawalCoinXlm: { type: String },
    withdrawalNetworkXlm: { type: String },
    withdrawalWalletAddressXlm: { type: String },
    base32: { type: String },
    otpauth_url: { type: String },
    FAverified: { type: Boolean, default: false },
  },
  { collection: "userdata", versionKey: false, timestamps: true }
);

const User = mongoose.model("User", userAuthSchema);

module.exports = User;
