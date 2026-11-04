import nodemailer from "nodemailer";

const requiredConfig = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

const getTransporter = () => {
  const missing = requiredConfig.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Registration email is not configured. Missing: ${missing.join(", ")}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

export const sendRegistrationOtp = async ({ email, name, otp }) => {
  const missing = requiredConfig.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV !== "production") {
    console.warn(`[DEV ONLY] Registration OTP for ${email}: ${otp}`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verify your IT Community BD account",
    text: `Hello ${name}, your IT Community BD verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Hello ${name},</p><p>Your IT Community BD verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 5 minutes. If you did not request this, ignore this email.</p>`
  });
};
