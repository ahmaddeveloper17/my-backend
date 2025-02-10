const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const checkAuthorization = require('../../middlewares/authMiddleware');


router.post('/login', adminController.login);
// router.post('/verifyToken', authController.verifyToken);
router.post('/userdata', adminController.userdata);
router.post('/settingdata', adminController.settingdata);
router.post('/updatesetting', adminController.updatesetting);
router.post('/updateadminpassword', adminController.updateAdminPassword);
router.post('/getallusers', adminController.allUsersData);
router.post('/transactionData', adminController.transactionData);
router.post('/updateuserpassword', adminController.updateUserPassword);
router.post('/updateuserdata', adminController.updateuserData);
router.post('/gettermsdata', adminController.getTermsData);
router.post('/withdrawaldata', adminController.withdrawalData);
router.post('/updatewithdrawaldata', adminController.updateWithdrawalData);
router.post('/dashboardData', adminController.dashboardData);
router.post('/updatedailyprofit', adminController.updatedailyprofit);
router.post('/updateminimumfixedterms', adminController.updateminimumfixedterms);
router.post('/depositSummary', adminController.depositSummary);
router.post('/generateLoginOtp', adminController.generateLoginOtp);
router.post('/loginOtp', adminController.loginOtp);
router.post('/enableDisableOtp', adminController.enableDisableOtp);

module.exports = router;