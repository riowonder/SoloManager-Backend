const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Login route
router.post("/login", authController.login);

// Signup route
router.post("/signup", authController.signup); 

// OTP verification route
router.post("/verify-otp", authController.otpVerification);

// Reset password: send OTP
router.post("/reset-password", authController.resetPassword); 

// Reset password: verify OTP
router.post("/reset-password/verify-otp", authController.resetPswdOTP);

// Change password (after OTP verification)
router.post("/change-password", authController.changePassword);

// Check if user is authenticated
router.get("/is-authenticated", authController.isAuthenticated);

// Login route for manager
router.post("/manager-login", authController.managerLogin);

module.exports = router;
