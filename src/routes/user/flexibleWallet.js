const express = require('express');
const router = express.Router();
const walletController = require('../../controllers/user/flexibleWalletController');
const checkAuthorization = require('../../middlewares/authMiddleware');


router.post('/buyCrypto', walletController.buyCrypto);
router.post('/withdrawal', walletController.withdrawal);
router.post('/nowPayments', walletController.nowPayments);
router.post('/coinPayments', walletController.coinPayments);

module.exports = router;