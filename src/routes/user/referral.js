const express = require('express');
const router = express.Router();
const referralController = require('../../controllers/user/referralController');
const checkAuthorization = require('../../middlewares/authMiddleware');


router.post('/referral-users', referralController.referralusers);
router.post('/dailyFixedProfit', referralController.dailyFixedProfit);
router.post('/dailyFlexibleProfit', referralController.dailyFlexibleProfit);
router.post('/dailyFlexibleProfitCopy', referralController.dailyFlexibleProfitCopy);
router.post('/dailyFixedProfitCopy', referralController.dailyFixedProfitCopy);
router.post('/termStatus', referralController.termStatus);

module.exports = router;