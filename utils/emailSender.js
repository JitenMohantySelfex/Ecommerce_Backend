const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `E-Commerce App <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    try {
      const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
        firstName: this.firstName,
        url: this.url,
        subject
      });

      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText.fromString(html)
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the E-Commerce Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }

  async sendOrderConfirmation() {
    await this.send('orderConfirmation', 'Your order has been confirmed!');
  }

  async sendOrderStatusUpdate() {
    await this.send('orderStatusUpdate', 'Your order status has been updated');
  }
}

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending simple email:', err);
    throw err;
  }
};

module.exports = { Email, sendEmail };