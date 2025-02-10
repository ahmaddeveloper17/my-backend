const express = require("express");
const {
  CleanHTMLData,
  CleanDBData,
  backOffice_link,
} = require("../../config/database/sanetize");
const User = require("../../models/auth");
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const checkAuthorization = require('../../middlewares/authMiddleware');
const userLink = 'https://app.earnusdc.com/'
const flexibleWallet = require('../../models/flexibleWallet');
const setting = require('../../models/setting');
const { userdata, sponsordata, settingsdata } = require('../../helpers/functions');
const transaction = require("../../models/transaction");
const fixedWallet = require("../../models/fixedWallet");
const axios = require('axios');


function generateReferralCode(length = 8) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let referralCode = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralCode += characters[randomIndex];
  }
  return referralCode;
}

exports.register = async (req, res) => {
  const postData = req.body;
  console.log("🚀 ~ exports.register= ~ postData:", postData)
  const referralCode1 = CleanHTMLData(CleanDBData(postData.referralCode));
  const username = CleanHTMLData(CleanDBData(postData.username));
  const firstname = CleanHTMLData(CleanDBData(postData.firstname));
  const lastname = CleanHTMLData(CleanDBData(postData.lastname));
  const email = CleanHTMLData(CleanDBData(postData.email));
  const password = CleanHTMLData(CleanDBData(postData.password));

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.json({
        status: "error",
        message: "User already exists with this email",
      });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.json({
        status: "error",
        message: "User already exists with this username",
      });
    }

    let sponsorid = null;
    if (referralCode1) {
      const referringUser = await User.findOne({ referralCode: referralCode1 });
      if (referringUser) {
        sponsorid = referringUser._id;
      } else {
        return res.json({ status: "error", message: "Invalid sponsor!" });
      }
    }

    // Create new user with emailotp field set to null
    const referralCode = generateReferralCode();

    const userData = new User({
      sponsorid,
      username,
      firstname,
      lastname,
      email,
      password: hashedPassword,
      referralCode,
      status: "pending"
    });
    const user = await userData.save();

    let getUSDC = await settingsdata('USDC')
    let getXLM = await settingsdata('XLM')

    let usdcId = getUSDC._id
    let xlmId = getXLM._id

    const insertUSDC = new flexibleWallet({
      userid: user._id,
      coinid: usdcId,
      balance: 0
    });
    const usdc = await insertUSDC.save();

    const insertXLM = new flexibleWallet({
      userid: user._id,
      coinid: xlmId,
      balance: 0
    });
    const xlm = await insertXLM.save();


    res.json({ status: "success", message: "You have been registered successfully!" });
  } catch (error) {
    console.log("🚀 ~ router.post ~ error:", error)
    res.json({ status: "error", message: "User cannot be registered" });
  }
}

exports.login = async (req, res) => {
  const postData = req.body;
  console.log("🚀 ~ exports.login= ~ postData:", postData)
  const emailOrUsername = CleanHTMLData(CleanDBData(postData.identifier));
  const password = CleanHTMLData(CleanDBData(postData.password));
  console.log("🚀 ~ exports.login= ~ emailOrUsername:", emailOrUsername)
  console.log("🚀 ~ exports.login= ~ password:", password)
  try {
    // Find the user by email or username
    let user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    console.log("🚀 ~ exports.login= ~ user:", user)
    
    if (!user) {
      return res.json({
        status: "error",
        message: "Email/Username or Password is incorrect",
      });
    }

    // Verify the password
    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      return res.json({
        status: "error",
        message: "Email/Username or Password is incorrect",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    let referralLink = userLink + "auth/signup/" + user.referralCode;

    user = {
      ...user.toObject(), // Convert the mongoose object to a plain JavaScript object
      referralLink,
    };

    // Log successful login

    res.json({
      status: "success",
      message: "Logged in successfully!",
      token,
      user,
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", message: "Internal Server Error" });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    // console.log("🚀 ~ exports.verifyToken= ~ authUser:", typeof authUser, authUser)
    if (authUser) {
      let user = await User.findById(authUser);
      const sponsor = await User.findById(user.sponsorid).select("username");

      let referralLink = userLink + "auth/signup/" + user.referralCode;

      // Add sponsorName to the user object
      user = {
        ...user.toObject(), // Convert the mongoose object to a plain JavaScript object
        sponsorName: sponsor.username,
        referralLink,
        profileimage: `${backOffice_link}/public/uploads/profile/${user.profileimage}`,
      };

      res.json({ status: "success", user });
    }
  } catch (error) {
    console.log("error:", error);
    res.json({ status: "error", message: "Error fetching user profile" });
  }
};

exports.updatePassword = async (req, res) => {
  const authuser = await checkAuthorization(req, res); // Authorization check
  const postData = req.body;

  try {
    if (authuser) {
      // Clean and validate input
      const oldpassword = CleanHTMLData(CleanDBData(postData.currentPassword));
      const newpassword = CleanHTMLData(CleanDBData(postData.newPassword));

      // Fetch user data from 'usersdata' collection
      const user = await User.findOne({ _id: authuser });

      if (!user) {
        return res.json({ status: "error", message: "User not found" });
      }

      const passwordMatched = await bcrypt.compare(oldpassword, user.password);
      if (!passwordMatched) {
        return res.json({ status: "error", message: "Incorrect Old Password" });
      }

      const hashedPassword = await bcrypt.hash(newpassword, 12);

      // Update the password in the 'usersdata' collection
      await User.updateOne(
        { _id: authuser },
        { $set: { password: hashedPassword } }
      );

      return res.json({
        status: "success",
        message: "Password updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating password:", error.message);
    res.json({ status: "error", message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  const postData = req.body;
  const username = CleanHTMLData(CleanDBData(postData.username));
  const firstname = CleanHTMLData(CleanDBData(postData.firstName));
  const lastname = CleanHTMLData(CleanDBData(postData.lastName));
  const email = CleanHTMLData(CleanDBData(postData.email));

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      // Current user ki information lein
      const currentUser = await User.findById(authUser);

      // Username validation (Agar dusre user ke paas same username ho)
      if (username && username !== currentUser.username) {
        const existingUsername = await User.findOne({
          username,
          _id: { $ne: authUser },
        });
        if (existingUsername) {
          return res.json({
            status: "error",
            message: "Username already in use by another user",
          });
        }
      }

      // Email validation (Agar dusre user ke paas same email ho)
      if (email && email !== currentUser.email) {
        const existingEmail = await User.findOne({
          email,
          _id: { $ne: authUser },
        });
        if (existingEmail) {
          return res.json({
            status: "error",
            message: "Email already in use by another user",
          });
        }
      }

      const user = await User.findByIdAndUpdate(authUser, {
        firstname,
        lastname,
        username,
        email,
      });

      return res.json({
        status: "success",
        message: "Profile updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating password:", error.message);
    res.json({ status: "error", message: "Server error" });
  }
};

exports.updateReferralCode = async (req, res) => {
  const postData = req.body;
  const referralCode = CleanHTMLData(CleanDBData(postData.ReferralCode));

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      // Fetch current user information
      const currentUser = await User.findById(authUser);

      // Check if the referral code is unique (not already used by another user)
      if (referralCode && referralCode !== currentUser.referralCode) {
        const existingReferralCode = await User.findOne({
          referralCode,
          _id: { $ne: authUser },
        });
        if (existingReferralCode) {
          return res.json({
            status: "error",
            message:
              "This referral code is already associated with another user.",
          });
        }
      }

      // Update the referral code
      await User.findByIdAndUpdate(authUser, { referralCode });

      return res.json({
        status: "success",
        message: "Referral code has been successfully updated.",
      });
    }
  } catch (error) {
    console.error("Error updating referral code:", error.message);
    return res.json({
      status: "error",
      message:
        "An error occurred while updating the referral code. Please try again later.",
    });
  }
};

exports.withdrawalMethod = async (req, res) => {
  const postData = req.body;
  const withdrawalCoin = CleanHTMLData(CleanDBData(postData.coin));
  const withdrawalNetwork = CleanHTMLData(CleanDBData(postData.network));
  const withdrawalWalletAddress = CleanHTMLData(CleanDBData(postData.walletAddress));

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      if (withdrawalCoin === "XLM") {
        const user = await User.findByIdAndUpdate(authUser, {
          withdrawalCoinXlm: withdrawalCoin,
          withdrawalNetworkXlm: withdrawalNetwork,
          withdrawalWalletAddressXlm: withdrawalWalletAddress,
        });
      } else {
        const user = await User.findByIdAndUpdate(authUser, {
          withdrawalCoinUsdc: withdrawalCoin,
          withdrawalNetworkUsdc: withdrawalNetwork,
          withdrawalWalletAddressUsdc: withdrawalWalletAddress,
        });
      }
      // Fetch current user information

      return res.json({
        status: "success",
        message: "Withdrawal Method has been successfully updated.",
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.json({
      status: "error",
      message: "An error occurred",
    });
  }
};

exports.dashboardData = async (req, res) => {
  const postData = req.body;

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      // Count users with sponsorid matching the authenticated user's _id
      const referralUsers = await User.countDocuments({ sponsorid: authUser });

      // daily profit flexible
      // Aggregate to calculate the sum of amounts for daily profit flexible by coin type
      const dailyProfitFlexibleUSDC = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily profit flexible",
            coinname: "USDC",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const dailyProfitFlexibleXLM = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily profit flexible",
            coinname: "XLM",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      // Extract total amounts or default to 0 if no matching transactions
      const totalUSDCFlexible = dailyProfitFlexibleUSDC[0]?.totalAmount || 0;
      const totalXLMFlexible = dailyProfitFlexibleXLM[0]?.totalAmount || 0;


      // daily profit fixed-term
      // Aggregate to calculate the sum of amounts for daily profit fixed by coin type
      const dailyProfitFixedUSDC = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily profit fixed-term",
            coinname: "USDC",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const dailyProfitFixedXLM = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily profit fixed-term",
            coinname: "XLM",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      // Extract total amounts or default to 0 if no matching transactions
      const totalUSDCFixed = dailyProfitFixedUSDC[0]?.totalAmount || 0;
      const totalXLMFixed = dailyProfitFixedXLM[0]?.totalAmount || 0;


      // daily referral fixed-term
      // Aggregate to calculate the sum of amounts for daily profit fixed by coin type
      const dailyReferralFixedUSDC = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily referral fixed-term",
            coinname: "USDC",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const dailyReferralFixedXLM = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily referral fixed-term",
            coinname: "XLM",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      // Extract total amounts or default to 0 if no matching transactions
      const totalUSDCReferralFixed = dailyReferralFixedUSDC[0]?.totalAmount || 0;
      const totalXLMReferralFixed = dailyReferralFixedXLM[0]?.totalAmount || 0;


      // daily referral flexible
      // Aggregate to calculate the sum of amounts for daily profit fixed by coin type
      const dailyReferralFlexibleUSDC = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily referral flexible",
            coinname: "USDC",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const dailyReferralFlexibleXLM = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "daily referral flexible",
            coinname: "XLM",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      // Extract total amounts or default to 0 if no matching transactions
      const totalUSDCReferralFlexible = dailyReferralFlexibleUSDC[0]?.totalAmount || 0;
      const totalXLMReferralFlexible = dailyReferralFlexibleXLM[0]?.totalAmount || 0;


      // referral commission
      // Aggregate to calculate the sum of amounts for daily profit fixed by coin type
      const ReferralCommissionUSDC = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "referral commission",
            coinname: "USDC",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const ReferralCommissionXLM = await transaction.aggregate([
        {
          $match: {
            receiverid: authUser,
            type: "referral commission",
            coinname: "XLM",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      // Extract total amounts or default to 0 if no matching transactions
      const totalUSDCReferralCommissionUSDC = ReferralCommissionUSDC[0]?.totalAmount || 0;
      const totalXLMReferralCommissionUSDC = ReferralCommissionXLM[0]?.totalAmount || 0;

      const USDCid = "674eca9d34bf7d0f74feebc2"
      const XLMid = "674ecab034bf7d0f74feebc4"
      // flexible terms
      // Aggregate to calculate the sum of amounts from fixedWallet collection
      const fixedWalletAmountXLM = await fixedWallet.aggregate([
        {
          $match: {
            userid: authUser,
            status: "active",
            coinid: XLMid,  // Provided XLM
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const fixedWalletAmountUSDC = await fixedWallet.aggregate([
        {
          $match: {
            userid: authUser,
            status: "active",
            coinid: USDCid,  // Provided USDC
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const totalFixedWalletAmountXLM = fixedWalletAmountXLM[0]?.totalAmount || 0;
      const totalFixedWalletAmountUSDC = fixedWalletAmountUSDC[0]?.totalAmount || 0;


      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar&vs_currencies=usd';

      const response = await axios.get(url);
      const prices = response.data;

      const USDCPriceInUSD = prices['usd-coin']?.usd || 1;
      const XLMPriceInUSD = prices['stellar']?.usd || 1;

      const totalFixedWalletAmount = (totalFixedWalletAmountXLM * XLMPriceInUSD) + (totalFixedWalletAmountUSDC * USDCPriceInUSD)

      // Count documents with 'active' status in fixedWallet
      const activeTermCount = await fixedWallet.countDocuments({
        userid: authUser,
        status: "active",
      });

      // Count documents with 'expire' status in fixedWallet
      const expireTermCount = await fixedWallet.countDocuments({
        userid: authUser,
        status: "expire",
      });

      const walletBalance = await flexibleWallet.find({ userid: authUser })

      const WalletBalanceUSDC = walletBalance.find(item => item.coinid === USDCid)?.balance || 0;
      const WalletBalanceXLM = walletBalance.find(item => item.coinid === XLMid)?.balance || 0;

      const TotalUSDCPrice = WalletBalanceUSDC * USDCPriceInUSD
      const TotalXLMPrice = WalletBalanceXLM * XLMPriceInUSD

      const TotalAssertUSD = TotalUSDCPrice + TotalXLMPrice
      // console.log('Prices:', prices);
      // console.log(`USDC Price in USD: ${USDCPriceInUSD}`);
      // console.log(`XLM Price in USD: ${XLMPriceInUSD}`);

      return res.json({
        status: "success",
        data: {
          referralUsers,
          dailyProfitFlexible: {
            USDC: totalUSDCFlexible?.toFixed(3),
            XLM: totalXLMFlexible?.toFixed(3),
          },
          dailyProfitFixed: {
            USDC: totalUSDCFixed?.toFixed(3),
            XLM: totalXLMFixed?.toFixed(3),
          },
          dailyReferralFixed: {
            USDC: totalUSDCReferralFixed?.toFixed(3),
            XLM: totalXLMReferralFixed?.toFixed(3),
          },
          dailyReferralFlexible: {
            USDC: totalUSDCReferralFlexible?.toFixed(3),
            XLM: totalXLMReferralFlexible?.toFixed(3),
          },
          referralCommission: {
            USDC: totalUSDCReferralCommissionUSDC?.toFixed(3),
            XLM: totalXLMReferralCommissionUSDC?.toFixed(3),
          },
          fixedWalletAmount: {
            USDC: totalFixedWalletAmountUSDC?.toFixed(3),
            XLM: totalFixedWalletAmountXLM?.toFixed(3),
            totalFixedWalletAmount: totalFixedWalletAmount?.toFixed(3)
          },
          activeTermCount,
          expireTermCount,
          walletBalance: {
            USDC: WalletBalanceUSDC?.toFixed(3),
            XLM: WalletBalanceXLM?.toFixed(3),
            TotalAssertUSD: TotalAssertUSD?.toFixed(3)
          }
        },
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.json({
      status: "error",
      message: "An error occurred",
    });
  }
};

exports.changeforgotpassword = async (req, res) => {
  const postData = req.body;
  try {
    const email = CleanHTMLData(CleanDBData(postData.email));
    const hashedPassword = await bcrypt.hash(postData.password, 12);
    const Email = await User.findOne({ email: email });
    if (!Email) {
      return res.json({ status: "error", message: "Invalid email" });
    }
    await User.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    return res.json({
      status: "success",
      message: "Password has been changed successfully",
    });
  } catch (error) {
    console.error("error during change password", error.message);
    res.json({ message: "error during change password", error });
  }
};
exports.checkforgotPasswordotp = async (req, res) => {
  const postData = req.body;
  try {
    const otp = CleanHTMLData(
      CleanDBData(Object.values(postData).slice(0, -1).join(""))
    );
    const email = CleanHTMLData(CleanDBData(postData.email));
    const Otp = await User.findOne({ forgotpasswordotp: otp });
    const Email = await User.findOne({ email: email });
    if (!Otp) {
      return res.json({ status: "error", message: "Invalid otp" });
    }
    if (!Email) {
      return res.json({ status: "error", message: "Invalid email" });
    }
    return res.json({
      status: "success",
      message: "OTP matched successfully",
    });
  } catch (error) {
    console.error("Invalid OTP", error.message);
    res.json({ message: "Invalid OTP", error });
  }
};
exports.forgotPassword = async (req, res) => {
  const postData = req.body;
  try {
    const email = CleanHTMLData(CleanDBData(postData.email));
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.json({ status: "error", message: "User not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.forgotpasswordotp = otp;
    await user.save();
    return res.json({
      status: "success",
      message: "An email has been sent to your registered email with the OTP. Please check your inbox.",
      otp,
    });
  } catch (error) {
    console.error("Error OTP generated", error.message);
    res.json({ message: "Error OTP generated", error });
  }
};
