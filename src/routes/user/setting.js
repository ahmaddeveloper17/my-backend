const express = require('express');
const router = express.Router();
const checkAuthorization = require('../../middlewares/authMiddleware');
const settingController = require('../../controllers/user/settingControllers');


router.post('/setting', settingController.setting);
router.post('/getSetting', settingController.getSetting);
router.post('/getSettingForWithdrawal', settingController.getSettingForWithdrawal);

module.exports = router;