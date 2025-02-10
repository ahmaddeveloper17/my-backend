const express = require('express');
const router = express.Router();
const fixedWalletController = require('../../controllers/user/fixedWalletController');
const checkAuthorization = require('../../middlewares/authMiddleware');


router.post('/buyFixed', fixedWalletController.buyFixed);
router.post('/getFixedTerm', fixedWalletController.getFixedTerm);
router.post('/getExpiredTerm', fixedWalletController.getExpiredTerm);
router.post('/updateFixedActive', fixedWalletController.updateFixedActive);

module.exports = router;