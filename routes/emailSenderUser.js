var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');

// Configure the email transporter
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'pawsiblemission@gmail.com',
    pass: 'zdhk ekuz jqtq rltg',
  },
});

// Function to send an email
var sendEmail = async function (to, subject, html) {
  return new Promise((resolve, reject) => {
    var mailOptions = {
      from: 'pawsiblemission@gmail.com',
      to: to,
      subject: subject,
      html: html,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error('Email sending error:', error);
        reject(error);
      } else {
        console.log('Email sent:', info.response);
        resolve(info.response);
      }
    });
  });
};

// PET REPORT
// POST route for sending emails
router.post('/send-email-user', async function(req, res, next) {
  try {
    var email = req.body.email;
    var status = req.body.status; // 'Accepted' or 'Declined'
    var subject = status === "Accepted" 
                    ? 'Your Account Has Been Verified - Welcome to Mission PAWSsible 🐾' 
                    : 'Your Account Status - Mission PAWSsible 🐾';
var htmlTemplate = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    .container {
      background-color: #f4f4f4;
      padding: 20px;
      border-radius: 8px;
    }
    h2 {
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    ${status === "Accepted"
      ? `
      <h2>Mission PAWSsible</h2>
      <p>Dear PawBuddy,</p>
      <p>Congratulations! We are pleased to inform you that your account has been verified for Mission PAWSsible. Welcome to our community dedicated to the welfare of animals.</p>
      <p>Your commitment to making a positive impact on the lives of animals aligns with our mission, and we look forward to working together to create a safe and caring environment for our furry friends.</p>
      <p>If you have any questions or need further information, please feel free to reach out. Once again, welcome to Mission PAWSsible!</p>
      <p>Best Regards,</p>
      <p><em>Mission PAWSsible Team 🐾</em></p>
      `
      : `
      <h2>Mission PAWSsible</h2>
      <p>Dear PawBuddy,</p>
      <p>Thank you for your interest in Mission PAWSsible. After careful consideration, we regret to inform you that your account has not been accepted at this time.</p>
      <p>We appreciate your dedication to animal welfare, and encourage you to explore other opportunities or initiatives that align with your passion.</p>
      <p>If you have any questions or would like feedback on your account, please do not hesitate to contact us. We appreciate your understanding and wish you the best in your endeavors.</p>
      <p>Best Regards,</p>
      <p><em>Mission PAWSsible Team 🐾</em></p>
      `
    }
  </div>
</body>
</html>
`;

    // Send the email
    await sendEmail(email, subject, htmlTemplate);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;