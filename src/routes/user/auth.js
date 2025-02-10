const express = require("express");
const router = express.Router();
const authController = require("../../controllers/user/authController");
const checkAuthorization = require("../../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../../models/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verifyToken", authController.verifyToken);
router.post("/updatePassword", authController.updatePassword);
router.post("/updateProfile", authController.updateProfile);
// router.post('/updateProfileImage', authController.update);
router.post("/updateReferralCode", authController.updateReferralCode);
router.post("/updateReferralCode", authController.updateReferralCode);
router.post("/withdrawalMethod", authController.withdrawalMethod);
router.post("/dashboardData", authController.dashboardData);


const uploadDir = path.join(__dirname, "../../public/uploads/profile");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use absolute path
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const uploadResume = multer({ storage: storage });
router.post("/updateProfileImage",uploadResume.single("image"),async (req, res) => {
    const file = req.file;
    try {
      const authUser = await checkAuthorization(req, res);
      if (authUser) {
        if (file) {
          const user = await User.findByIdAndUpdate(authUser, {
            profileimage: file.filename,
          });
          res.json({
            status: "success",
            message: "Profile picture updated successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error updating password:", error.message);
      res.json({ status: "error", message: "Server error" });
    }
  }
);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verifyToken', authController.verifyToken);
router.post('/updatePassword', authController.updatePassword);
router.post('/forgotpassword', authController.forgotPassword);
router.post('/checkforgotpasswordotp', authController.checkforgotPasswordotp);
router.post('/changeforgotpassword', authController.changeforgotpassword);
router.post('/updateProfile', authController.updateProfile);
router.post('/updateReferralCode', authController.updateReferralCode);
// router.get('/profile', checkAuthorization, authController.getProfile);

module.exports = router;
