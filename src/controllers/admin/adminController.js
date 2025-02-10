const express = require('express');
const { CleanHTMLData, CleanDBData } = require('../../config/database/sanetize');
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require('../../models/auth');
const checkAuthorization = require('../../middlewares/authMiddleware');
const setting = require('../../models/setting');
const transaction = require('../../models/transaction');
const fixedWallet = require('../../models/fixedWallet');
const crypto = require('crypto');
const flexibleWallet = require('../../models/flexibleWallet');
const CryptoPayment = require('../../models/cryptoPayment');
const speakeasy = require("speakeasy");

exports.login = async (req, res) => {
	const postData = req.body;
	const username = CleanHTMLData(CleanDBData(postData.username));
	const password = CleanHTMLData(CleanDBData(postData.password));
	try {
		// Find the user by username only
		const user = await User.findOne({ username: username });

		if (!user) {
			return res.json({ status: "error", message: "Username or Password is incorrect" });
		}

		// Verify the password
		const passwordMatched = await bcrypt.compare(password, user.password);
		if (!passwordMatched) {
			return res.json({ status: "error", message: "Username or Password is incorrect" });
		}

		// Generate JWT token
		const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "7d" });

		// Log successful login
		res.json({ status: "success", message: "User logged in!", token, user });
		// res.json({ status: "success", message: "User logged in!" });
	} catch (error) {
		console.log('admin login error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.loginOtp = async (req, res) => {
	const postData = req.body;
	const otp = CleanHTMLData(CleanDBData(postData.otp));
	const username = CleanHTMLData(CleanDBData(postData.username));
	try {
		// Find the user by username only
		const user = await User.findOne({ username: username });

		const isVerified = speakeasy.totp.verify({
			secret: user.base32,
			encoding: "base32",
			token: otp, // Make sure to get the token from the request body
			window: 1,
		});

		if (!isVerified) {
			return res.json({ status: "error", message: "Invalid Code" });
		}

		// Generate JWT token
		const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "7d" });

		// Log successful login
		res.json({ status: "success", message: "User logged in!", token, user });
		// res.json({ status: "success", message: "User logged in!" });
	} catch (error) {
		console.log('admin login error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.generateLoginOtp = async (req, res) => {
	const postData = req.body;
	const authUser = await checkAuthorization(req, res);
	try {
		// Find the user by username only
		const user = await User.findOne({ _id: authUser });

		// Generate a new secret if the user doesn't already have one
		let secret = {};

		if (!user.base32) {
			const generatedSecret = speakeasy.generateSecret({
				name: `Earn-USDC:${user.username}`,
			});
			user.base32 = generatedSecret.base32;
			user.otpauth_url = generatedSecret.otpauth_url;
			await user.save();

			secret = {
				base32: generatedSecret.base32,
				otpauth_url: generatedSecret.otpauth_url,
				FAverified: false
			};
		} else {
			secret = {
				base32: user.base32,
				otpauth_url: user.otpauth_url,
				FAverified: user.FAverified
			};
		}
		// Log successful login
		res.json({ status: "success", secret });
	} catch (error) {
		console.log('admin login error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.enableDisableOtp = async (req, res) => {
	const postData = req.body;
	const FAverified = CleanHTMLData(CleanDBData(postData.FAverified));
	const authUser = await checkAuthorization(req, res);
	try {
		// Find the user by username only
		const user = await User.findOne({ _id: authUser });

		user.FAverified = FAverified;
		await user.save();
		
		let FaStatus
		if (FAverified == 'true') {
			FaStatus = 'enabled';
		}else{
			FaStatus = 'disabled';
		}

		// Log successful login
		res.json({ status: "success", message: `2 FA ${FaStatus}` });
	} catch (error) {
		console.log('admin login error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.userdata = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	try {
		if (authUser) {
			const user = await User.findById(authUser);
			if (user) {
				res.json({
					status: "success",
					data: user,
				});
			} else {
				res.json({ status: "error", message: "User not found" });
			}
		}
	} catch (error) {
		console.log('userdata error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.settingdata = async (req, res) => {
	let { keynames } = req.body;
	const authUser = await checkAuthorization(req, res);

	try {
		if (authUser) {
			const keysArray = keynames.split(',').map((key) => key.trim());
			const settings = await setting.find({ keyname: { $in: keysArray } });

			if (settings && settings.length > 0) {
				res.json({
					status: "success",
					data: settings,
				});
			} else {
				res.json({ status: "error", message: "Data not found" });
			}
		}
	} catch (error) {
		console.error('Error fetching setting:', error.message);
		res.status(500).json({ message: 'Server error' });
	}
};


exports.updatesetting = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	try {
		if (authuser) {
			const { obj } = req.body;
			const updates = Object.entries(obj).map(async ([keyname, keyvalue]) => {
				return setting.findOneAndUpdate(
					{ keyname },
					{ keyvalue },
				);
			});
			await Promise.all(updates);
			if (updates) {
				res.json({ status: 'success', message: 'Settings updated successfully' });
			} else {
				res.json({ status: 'error', message: 'Failed to update settings' });
			}
		}
	} catch (error) {
		console.log('Error update setting:', error.message);
		res.status(500).json({ message: 'Server error' });
	}
}

exports.updateAdminPassword = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	const postData = req.body;

	try {
		if (authuser) {
			const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
			const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));

			const user = await User.findOne({ _id: authuser });

			if (!user) {
				return res.json({ status: "error", message: "User not found" });
			}

			const passwordMatched = await bcrypt.compare(oldpassword, user.password)
			if (!passwordMatched) {
				return res.json({ status: "error", message: "Incorrect Old Password" });
			}

			const hashedPassword = await bcrypt.hash(newpassword, 12);

			await User.updateOne(
				{ _id: authuser },
				{ $set: { password: hashedPassword } }
			);

			return res.json({ status: "success", message: "Password updated successfully" });
		} else {
			return ResizeObserver.json({ status: "error", message: "Unauthorized" });
		}
	} catch (error) {
		console.error("Error updating password:", error.message);
		res.json({ status: "error", message: "Server error" });
	}
};

exports.allUsersData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;
	try {
		if (authUser) {
			const status = CleanHTMLData(CleanDBData(postData.status));

			let users = await User.find({ status, usertype: 'user' });

			if (users.length > 0) {
				const updatedUsers = await Promise.all(users.map(async (user) => {
					if (user.sponsorid) {
						const sponsor = await User.findOne({ _id: user.sponsorid });
						return {
							...user.toObject(),
							sponsorname: sponsor ? sponsor.username : null,
						};
					}
					return {
						...user.toObject(),
						sponsorname: null,
					};
				}));
				res.json({
					status: "success",
					data: updatedUsers,
				});
			} else {
				res.json({ status: "error", message: "No users found with the specified status and usertype" });
			}
		}
	} catch (error) {
		console.log('all userdata error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
};


exports.transactionData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;

	try {
		if (authUser) {
			// Ensure type is treated as an array for multiple values
			const typeArray = postData.type.split(",").map((type) => type.trim());

			const transactionData = await transaction.find({ type: { $in: typeArray } });

			if (transactionData.length > 0) {
				const updatedData = await Promise.all(transactionData.map(async (data) => {
					let sender = null;
					let receiver = null;

					if (data.senderid && data.senderid !== '0' && data.senderid !== null) {
						const user = await User.findOne({ _id: data.senderid });
						sender = user ? user.username : null;
					}
					if (data.receiverid && data.receiverid !== null && data.receiverid !== '0') {
						const user = await User.findOne({ _id: data.receiverid });
						receiver = user ? user.username : null;
					}

					return {
						...data.toObject(),
						sender,
						receiver,
					};
				}));

				res.json({
					status: "success",
					data: updatedData,
				});
			} else {
				res.json({
					status: "error",
					message: "No transactions found for the specified types.",
				});
			}
		} else {
			res.json({
				status: "error",
				message: "Unauthorized access.",
			});
		}
	} catch (error) {
		console.log('Get transaction data error:', error.message);
		res.json({
			status: "error",
			message: "Internal Server Error",
		});
	}
};


exports.updateuserData = async (req, res) => {
	const postData = req.body;
	const username = CleanHTMLData(CleanDBData(postData.username));
	const firstname = CleanHTMLData(CleanDBData(postData.firstname));
	const lastname = CleanHTMLData(CleanDBData(postData.lastname));
	const email = CleanHTMLData(CleanDBData(postData.email));
	const userid = CleanHTMLData(CleanDBData(postData.userid));

	try {
		const authUser = await checkAuthorization(req, res);
		if (authUser) {

			// Current user ki information lein
			const currentUser = await User.findById(userid);

			// Username validation (Agar dusre user ke paas same username ho)
			if (username && username !== currentUser.username) {
				const existingUsername = await User.findOne({ username, _id: { $ne: userid } });
				if (existingUsername) {
					return res.json({ status: "error", message: "Username already in use by another user" });
				}
			}

			// Email validation (Agar dusre user ke paas same email ho)
			if (email && email !== currentUser.email) {
				const existingEmail = await User.findOne({ email, _id: { $ne: userid } });
				if (existingEmail) {
					return res.json({ status: "error", message: "Email already in use by another user" });
				}
			}

			const user = await User.findByIdAndUpdate(
				userid,
				{ firstname, lastname, username, email }
			);

			return res.json({ status: "success", message: "User data updated successfully" });
		}
	} catch (error) {
		console.error("Error updating password:", error.message);
		res.json({ status: "error", message: "Server error" });
	}
};

exports.updateUserPassword = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	const postData = req.body;

	try {
		if (authuser) {
			const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));
			const userid = CleanHTMLData(CleanDBData(postData.userid));

			const user = await User.findOne({ _id: userid });

			if (!user) {
				return res.json({ status: "error", message: "User not found" });
			}

			const hashedPassword = await bcrypt.hash(newpassword, 12);

			await User.updateOne(
				{ _id: userid },
				{ $set: { password: hashedPassword } }
			);

			return res.json({ status: "success", message: "Password updated successfully" });
		} else {
			return ResizeObserver.json({ status: "error", message: "Unauthorized" });
		}
	} catch (error) {
		console.error("Error updating password:", error.message);
		res.json({ status: "error", message: "Server error" });
	}
};

exports.getTermsData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;
	try {
		if (authUser) {
			const status = CleanHTMLData(CleanDBData(postData.status));

			let termsData = await fixedWallet.find({ status });

			if (termsData.length > 0) {
				const updatedData = await Promise.all(termsData.map(async (data) => {
					let username = null;
					let coinname = null;

					if (data.userid && data.userid !== '0' && data.userid !== null) {
						const user = await User.findOne({ _id: data.userid });
						username = user ? user.username : null;
					}

					if (data.coinid && data.coinid !== null && data.coinid !== '0') {
						const coin = await setting.findOne({ _id: data.coinid });
						coinname = coin ? coin.keyname : null;
					}

					return {
						...data.toObject(),
						username,
						coinname,
					};
				}));
				res.json({
					status: "success",
					data: updatedData,
				});
			} else {
				res.json({ status: "error", message: "No terms found with the specified status" });
			}
		}
	} catch (error) {
		console.log('get terms data error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
};

exports.withdrawalData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;
	try {
		if (authUser) {
			const type = CleanHTMLData(CleanDBData(postData.type));
			const status = CleanHTMLData(CleanDBData(postData.status));

			let transactionData = await transaction.find({ type, status });

			if (transactionData.length > 0) {
				const updatedData = await Promise.all(transactionData.map(async (data) => {
					let sender = null;
					let receiver = null;

					if (data.senderid && data.senderid !== '0' && data.senderid !== null) {
						const user = await User.findOne({ _id: data.senderid });
						sender = user ? user.username : null;
					}
					if (data.receiverid && data.receiverid !== null && data.receiverid !== '0') {
						const user = await User.findOne({ _id: data.receiverid });
						receiver = user ? user.username : null;
					}

					return {
						...data.toObject(),
						sender,
						receiver,
					};
				}));
				res.json({
					status: "success",
					data: updatedData,
				});
			} else {
				res.json({ status: "error", message: "No data found with the specified status and type" });
			}
		}
	} catch (error) {
		console.log('get transaction data error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
};

exports.updateWithdrawalData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;
	try {
		if (authUser) {
			const wid = CleanHTMLData(CleanDBData(postData.wid));
			const status = CleanHTMLData(CleanDBData(postData.status));
			if (status == 'approved') {
				const updatewithdrawal = await transaction.findByIdAndUpdate(
					wid,
					{ status }
				);
				if (!updatewithdrawal) {
					return res.json({ status: "error", message: "Faild to " + status + " withdrawal" });
				} else {
					let transactionData = await transaction.findById(wid);

					let userId = transactionData.senderid;
					let amount = transactionData.amount;

					let userData = await User.findById(userId);

					let username = userData.username;
					let firstName = userData.firstname;
					let lastName = userData.lastname;
					let email = userData.email;

					// const company_name = 'Earn USDC';
					// const title = `Withdrawal Information from ${company_name}`;
					// const heading = "";
					// const subheading = "";

					// const body = `
					// 	<p style="text-align:left">Dear : ${firstName} ${lastName}</p>

					// 	<p style="text-align:left">We regret to inform you that your withdrawal request of ${amount} submitted has been rejected.</p>
					// 	<p style="text-align: left">
					// 		Please review your account details and ensure all information is accurate before submitting a new request. If you have any questions or need assistance, our support team is here to help.
					// 	</p>
					// 	<p style="text-align: left">Thank you for your understanding and cooperation.</p>
					// 	<p style="text-align: left">Best regards,</p>
					// 	<p style="text-align: left">${company_name} Team</p>
					// 	`;


					// const mailOptions = {
					// 	from: {
					// 		name: company_name,
					// 		address: company_mail,
					// 	},
					// 	to: {
					// 		name: username,
					// 		address: email,
					// 	},
					// 	subject: "Your Withdrawal Request Has Been Rejected",
					// 	html: emailTemplate(title, "", heading, subheading, body, company_name),
					// 	text: body,
					// };
					// transporter.sendMail(mailOptions, (err, info) => {
					// 	if (err) {
					// 		res.json({
					// 			status: "error",
					// 			message: "Withdrawal has been " + status + " but email not sent.",
					// 		});
					// 	} else {
					// 		res.json({
					// 			status: "success",
					// 			message: "withdrawal has been " + status + " successfully.",
					// 		});
					// 	}
					// });
					res.json({
						status: "success",
						message: "Withdrawal has been " + status + " successfully",
					});
				}
			} else if (status == "rejected") {
				const updatewithdrawal = await transaction.findByIdAndUpdate(
					wid,
					{ status }
				);
				if (!updatewithdrawal) {
					return res.json({ status: "error", message: "Faild to " + status + " withdrawal" });
				} else {
					let transactionData = await transaction.findById(wid);
					let userId = transactionData.senderid;
					let amount = transactionData.amount;
					let walletId = transactionData.referenceid;

					let updateWallet = await flexibleWallet.findOneAndUpdate(
						{ _id: walletId, userid: userId, },
						{ $inc: { balance: amount } },
						{ new: true }
					);

					if (!updateWallet) {
						return res.json({ status: "error", message: "Faild to update wallet" });
					} else {
						let userData = await User.findById(userId);

						let username = userData.username;
						let firstName = userData.firstname;
						let lastName = userData.lastname;
						let email = userData.email;

						// const company_name = 'Earn USDC';
						// const title = `Withdrawal Information from ${company_name}`;
						// const heading = "";
						// const subheading = "";

						// const body = `
						// <p style="text-align:left">Dear : ${firstName} ${lastName}</p>

						// <p style="text-align:left">We are pleased to inform you that your withdrawal request of ${amount} submitted on [date] has been approved.</p>
						// <p style="text-align: left">
						// 	The requested amount will be processed shortly, and you should receive the funds in your account within the expected timeframe. If you have any questions or need further assistance, please feel free to contact our support team.
						// </p>
						// <p style="text-align: left">Thank you for using ${company_name}.</p>
						// <p style="text-align: left">Best regards,</p>
						// <p style="text-align: left">${company_name} Team</p>
						// `;


						// const mailOptions = {
						// 	from: {
						// 		name: company_name,
						// 		address: company_mail,
						// 	},
						// 	to: {
						// 		name: username,
						// 		address: email,
						// 	},
						// 	subject: "Your Withdrawal Request Has Been Approved",
						// 	html: emailTemplate(title, "", heading, subheading, body, company_name),
						// 	text: body,
						// };
						// transporter.sendMail(mailOptions, (err, info) => {
						// 	if (err) {
						// 		res.json({
						// 			status: "error",
						// 			message: "Withdrawal has been " + status + " but email not sent.",
						// 		});
						// 	} else {
						// 		res.json({
						// 			status: "success",
						// 			message: "withdrawal has been " + status + " successfully.",
						// 		});
						// 	}
						// });
						res.json({
							status: "success",
							message: "Withdrawal has been " + status + " successfully",
						});
					}
				}
			}
		}
	} catch (error) {
		console.log('get transaction data error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}

exports.dashboardData = async (req, res) => {
	const authUser = await checkAuthorization(req, res);
	const postData = req.body;
	try {
		if (authUser) {
			let totalPayoutUsdc = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'approved',
						coinname: 'USDC'
					}
				},
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' }
					}
				}
			]);
			totalPayoutUsdc = totalPayoutUsdc.length > 0 ? totalPayoutUsdc[0].totalAmount : 0;

			let currentMonthPayoutUsdc = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'approved',
						coinname: 'USDC',
						updatedAt: {
							$gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
							$lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
						}
					}
				},
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' }
					}
				}
			]);
			currentMonthPayoutUsdc = currentMonthPayoutUsdc.length > 0 ? currentMonthPayoutUsdc[0].totalAmount : 0;

			let currentMonthPendingPayoutUsdc = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'pending',
						coinname: 'USDC',
						createdAt: {
							$gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
							$lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
						}
					}
				},
				{
					$count: "totalWithdrawals"
				}
			]);
			currentMonthPendingPayoutUsdc = currentMonthPendingPayoutUsdc.length > 0 ? currentMonthPendingPayoutUsdc[0].totalWithdrawals : 0;

			let payoutDetailUsdc = {
				totalPayoutUsdc,
				currentMonthPayoutUsdc,
				currentMonthPendingPayoutUsdc,
			}

			let totalPayoutXlm = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'approved',
						coinname: 'XLM'
					}
				},
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' }
					}
				}
			]);
			totalPayoutXlm = totalPayoutXlm.length > 0 ? totalPayoutXlm[0].totalAmount : 0;

			let currentMonthPayoutXlm = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'approved',
						coinname: 'XLM',
						updatedAt: {
							$gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
							$lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
						}
					}
				},
				{
					$group: {
						_id: null,
						totalAmount: { $sum: '$amount' }
					}
				}
			]);
			currentMonthPayoutXlm = currentMonthPayoutXlm.length > 0 ? currentMonthPayoutXlm[0].totalAmount : 0;

			let currentMonthPendingPayoutXlm = await transaction.aggregate([
				{
					$match: {
						type: 'withdrawal',
						status: 'pending',
						coinname: 'XLM',
						createdAt: {
							$gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
							$lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
						}
					}
				},
				{
					$count: "totalWithdrawals"
				}
			]);
			currentMonthPendingPayoutXlm = currentMonthPendingPayoutXlm.length > 0 ? currentMonthPendingPayoutXlm[0].totalWithdrawals : 0;

			let payoutDetailXlm = {
				totalPayoutXlm,
				currentMonthPayoutXlm,
				currentMonthPendingPayoutXlm,
			}

			const keynames = 'USDC, XLM';
			const keysArray = keynames.split(',').map((key) => key.trim());
			const settings = await setting.find({ keyname: { $in: keysArray } });

			const usdcid = settings[0]._id.toString();
			const xlmid = settings[1]._id.toString();

			let totalDepositUsdc = 0;
			let totalDepositXlm = 0;

			if (usdcid) {
				totalDepositUsdc = await flexibleWallet.aggregate([
					{
						$match: {
							coinid: usdcid
						}
					},
					{
						$group: {
							_id: null,
							totalDeposit: { $sum: '$balance' }
						}
					}
				]);
				totalDepositUsdc = totalDepositUsdc.length > 0 ? totalDepositUsdc[0].totalDeposit : 0;
			}

			if (xlmid) {
				totalDepositXlm = await flexibleWallet.aggregate([
					{
						$match: {
							coinid: xlmid
						}
					},
					{
						$group: {
							_id: null,
							totalDeposit: { $sum: '$balance' }
						}
					}
				]);
				totalDepositXlm = totalDepositXlm.length > 0 ? totalDepositXlm[0].totalDeposit : 0;
			}

			let totalActiveTerms = 0;
			let totalInactiveTerms = 0;

			totalActiveTerms = await fixedWallet.aggregate([
				{
					$match: {
						status: 'active',
					}
				},
				{
					$count: "totalActiveTerms"
				}
			]);
			totalActiveTerms = totalActiveTerms.length > 0 ? totalActiveTerms[0].totalActiveTerms : 0;

			totalInactiveTerms = await fixedWallet.aggregate([
				{
					$match: {
						status: 'expired',
					}
				},
				{
					$count: "totalInactiveTerms"
				}
			]);
			totalInactiveTerms = totalInactiveTerms.length > 0 ? totalInactiveTerms[0].totalInactiveTerms : 0;

			let totalActiveUsers = 0;
			let totalInactiveUsers = 0;

			totalActiveUsers = await User.aggregate([
				{
					$match: {
						status: 'approved',
						usertype: 'user',
					}
				},
				{
					$count: "totalActiveUsers"
				}
			]);
			totalActiveUsers = totalActiveUsers.length > 0 ? totalActiveUsers[0].totalActiveUsers : 0;

			totalInactiveUsers = await User.aggregate([
				{
					$match: {
						status: 'pending',
					}
				},
				{
					$count: "totalInactiveUsers"
				}
			]);
			totalInactiveUsers = totalInactiveUsers.length > 0 ? totalInactiveUsers[0].totalInactiveUsers : 0;

			res.json({
				status: 'success',
				data: {
					payoutDetailUsdc,
					payoutDetailXlm,
					totalDepositUsdc,
					totalDepositXlm,
					totalActiveTerms,
					totalInactiveTerms,
					totalActiveUsers,
					totalInactiveUsers
				}
			});
		}
	} catch (error) {
		console.log('get dashboard data error', error.message);
		res.json({ status: "error", message: "Internal Server Error" });
	}
}


exports.updatedailyprofit = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	try {
		if (authuser) {
			const { obj } = req.body;

			// Update USDC and XLM data
			const updatedData = [];

			// Update USDC data
			if (obj.USDC) {
				const usdcUpdate = await setting.findOneAndUpdate(
					{ keyname: 'USDC' },
					{
						$set: {
							one_month_profit: obj.USDC.one_month_profit,
							three_month_profit: obj.USDC.three_month_profit,
							six_month_profit: obj.USDC.six_month_profit
						}
					},
					{ new: true } // Return the updated document
				);
				updatedData.push(usdcUpdate);
			}

			// Update XLM data
			if (obj.XLM) {
				const xlmUpdate = await setting.findOneAndUpdate(
					{ keyname: 'XLM' },
					{
						$set: {
							one_month_profit: obj.XLM.one_month_profit,
							three_month_profit: obj.XLM.three_month_profit,
							six_month_profit: obj.XLM.six_month_profit
						}
					},
					{ new: true }
				);
				updatedData.push(xlmUpdate);
			}

			if (updatedData.length > 0) {
				res.json({ status: 'success', message: 'Daily profits updated successfully' });
			} else {
				res.json({ status: 'error', message: 'Failed to update settings' });
			}
		}
	} catch (error) {
		console.log('Error update setting:', error.message);
		res.status(500).json({ message: 'Server error' });
	}
}

exports.updateminimumfixedterms = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	try {
		if (authuser) {
			const { obj } = req.body;
			console.log('object', obj);
			// Update USDC and XLM data
			const updatedData = [];

			// Update USDC data
			if (obj.USDC) {
				const usdcUpdate = await setting.findOneAndUpdate(
					{ keyname: 'USDC' },
					{
						$set: {
							min_fixed_term_amount: obj.USDC.min_fixed_term_amount,
						}
					},
					{ new: true } // Return the updated document
				);
				updatedData.push(usdcUpdate);
			}

			// Update XLM data
			if (obj.XLM) {
				const xlmUpdate = await setting.findOneAndUpdate(
					{ keyname: 'XLM' },
					{
						$set: {
							min_fixed_term_amount: obj.XLM.min_fixed_term_amount,
						}
					},
					{ new: true }
				);
				updatedData.push(xlmUpdate);
			}

			if (updatedData.length > 0) {
				res.json({ status: 'success', message: 'Minimum Fixed Terms updated successfully' });
			} else {
				res.json({ status: 'error', message: 'Failed to update minimum fixed terms' });
			}
		}
	} catch (error) {
		console.log('Error update setting:', error.message);
		res.status(500).json({ message: 'Server error' });
	}
}

exports.depositSummary = async (req, res) => {
	const authuser = await checkAuthorization(req, res);
	try {
		if (authuser) {
			const data = await CryptoPayment.find()
			res.json({ status: 'error', data });
		}
	} catch (error) {
		console.log('Error update setting:', error.message);
		res.status(500).json({ message: 'Server error' });
	}
}