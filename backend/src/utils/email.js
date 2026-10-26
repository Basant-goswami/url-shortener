const { Resend } = require("resend");

/**
 * Send password reset email using Resend
 */
const sendPasswordResetEmail = async (email, resetUrl, name = "User") => {
  try {
    // 1. Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      console.log("❌ RESEND_API_KEY missing in .env");
      return { success: false, error: "Missing API Key" };
    }

    // 2. Initialize Resend inside the function
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log(`📤 Attempting to send email to: ${email}`);

    // 3. Send the email
    const { data, error } = await resend.emails.send({
      from: "ShortLink <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Reset Your Password - ShortLink",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #0ea5e9; text-align: center;">ShortLink Password Reset</h2>
          <p style="color: #4b5563; font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Click the button below to set a new password. 
            This link will expire in <strong>10 minutes</strong>.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <a href="${resetUrl}" style="color: #0ea5e9; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    // 4. Handle Resend API errors
    if (error) {
      console.log("❌ Resend API Error:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    // 5. Success
    console.log(`✅ Email sent successfully to ${email}. ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.log("❌ Exception in sendPasswordResetEmail:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendPasswordResetEmail };
