import jwt from "jsonwebtoken";
import "dotenv/config";

export const generateTokenAndSetCookie = (user, res) => {
    const payload = {
        email: user.email,
        id: user._id,
        role: user.role
    };

    try {
        let token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5d" });

        let options = {
            expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),    // Token validity only for 1 day
            httpOnly: true,
            secure: true,  // Required for HTTPS
            sameSite: "None", // Allows cross-origin cookies
            path: "/"
        };

        // Set the cookie, but DON'T send a response
        res.cookie("ZM_Cookie", token, options);  // Just set the cookie
        return token; // Return the token, so the calling function can use it if needed 

    } catch (err) {
        console.log(err.message);
        throw err;
    }
}