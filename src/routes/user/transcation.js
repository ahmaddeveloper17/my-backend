const express = require('express');
const router = express.Router();
const checkAuthorization = require('../../middlewares/authMiddleware');
const transcationController = require('../../controllers/user/transcationController');


router.post('/depositSummary', transcationController.depositSummary);
router.post('/withDrawalSummary', transcationController.withDrawalSummary);
router.post('/referral-commission', transcationController.referralCommission);
router.post('/dailyFixedProfit', transcationController.dailyFixedProfit);
router.post('/dailyFlexibleProfit', transcationController.dailyFlexibleProfit);
router.post('/dailyReferralFlexedProfit', transcationController.dailyReferralFlexedProfit);
router.post('/dailyReferralFlexibleProfit', transcationController.dailyReferralFlexibleProfit);

module.exports = router;