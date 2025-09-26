import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

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

// Logout route
router.post("/logout", authController.logout);

export default router;
