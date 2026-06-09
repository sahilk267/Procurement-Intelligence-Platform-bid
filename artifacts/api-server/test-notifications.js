#!/usr/bin/env node

import nodemailer from 'nodemailer';

async function testEmailConnection() {
  console.log("Testing email connection...\n");

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });

    // Test connection
    const isConnected = await transporter.verify();
    console.log(`Email connection: ${isConnected ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (isConnected) {
      // Send test email
      console.log("\nSending test email...");
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'test@example.com',
        to: 'test@example.com',
        subject: 'ProcureIntel Notification Test',
        html: `
          <h2>🔔 Notification System Test</h2>
          <p>This is a test email from the ProcureIntel notification system.</p>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST || 'localhost'}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT || '1025'}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p>If you're seeing this, the email notification system is working correctly!</p>
        `
      });

      console.log(`Test email sent: ✅ ${info.messageId}`);
      console.log("\nNote: Check your email client for the test message.");
      console.log("If using MailHog, visit http://localhost:8025 to view emails.");
    }

    return isConnected;
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
    console.log("\n💡 To test email notifications:");
    console.log("1. Install MailHog: choco install mailhog");
    console.log("2. Start MailHog: mailhog");
    console.log("3. Visit http://localhost:8025 to view emails");
    console.log("4. Or configure SMTP settings in environment variables");
    return false;
  }
}

testEmailConnection();