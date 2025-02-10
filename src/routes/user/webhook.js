const express = require('express');
const router = express.Router();
const checkAuthorization = require('../../middlewares/authMiddleware');
const webhookController = require('../../controllers/user/webhookController');

router.post('/coinPaymentWebhook', webhookController.coinPaymentWebhook);
router.post('/nowPaymentWebhook', webhookController.nowPaymentWebhook);

module.exports = router;