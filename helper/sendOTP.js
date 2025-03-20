const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure Nodemailer transporter
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// Test Email
// transporter.verify((error, success) => {
//   if (error) {
//     console.error("SMTP Error:", error);
//   } else {
//     console.log("SMTP Connection Successful!");
//   }
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper to send OTP email
const sendOtp = async (email, otp) => {
  const mailOptions = {
    from: {
      name: "AOA-Bangladesh",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Your OTP for Account Verification",
    html: `
     <body style="word-spacing: normal; background-color: #fafafa;margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;">
      <div
        style="
          display: none;
          font-size: 1px;
          color: #ffffff;
          line-height: 1px;
          max-height: 0px;
          max-width: 0px;
          opacity: 0;
          overflow: hidden;
        "
      >
        OTP for email confirmation
      </div>
      <div style="background-color: #fafafa" lang="und" dir="auto">
        <table
          align="center"
          border="0"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="width: 100%"
        >
          <tbody>
            <tr>
              <td>
                <div style="margin: 0px auto; max-width: 600px">
                  <table
                    align="center"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    style="width: 100%"
                  >
                    <tbody>
                      <tr>
                        <td
                          style="
                            direction: ltr;
                            font-size: 0px;
                            padding: 16px;
                            text-align: center;
                          "
                        >
                          <div
                            style="
                              background: #ffffff;
                              background-color: #ffffff;
                              margin: 0px auto;
                              border-radius: 8px;
                              max-width: 568px;
                            "
                          >
                            <table
                              align="center"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="
                                background: #ffffff;
                                background-color: #ffffff;
                                width: 100%;
                                border-radius: 8px;
                              "
                            >
                              <tbody>
                                <tr>
                                  <td
                                    style="
                                      direction: ltr;
                                      font-size: 0px;
                                      padding: 16px;
                                      text-align: center;
                                    "
                                  >
                                    <div
                                      class="mj-column-per-100 mj-outlook-group-fix"
                                      style="
                                        font-size: 0px;
                                        text-align: left;
                                        direction: ltr;
                                        display: inline-block;
                                        vertical-align: top;
                                        width: 100%;
                                      "
                                    >
                                      <table
                                        border="0"
                                        cellpadding="0"
                                        cellspacing="0"
                                        role="presentation"
                                        width="100%"
                                      >
                                        <tbody>
                                          <tr>
                                            <td
                                              style="
                                                vertical-align: top;
                                                padding: 32px;
                                              "
                                            >
                                              <table
                                                border="0"
                                                cellpadding="0"
                                                cellspacing="0"
                                                role="presentation"
                                                style=""
                                                width="100%"
                                              >
                                                <tbody>
                                                  <tr>
                                                    <td
                                                      align="center"
                                                      style="
                                                        font-size: 0px;
                                                        padding: 10px 25px;
                                                        padding-bottom: 16px;
                                                        word-break: break-word;
                                                      "
                                                    >
                                                      <table
                                                        border="0"
                                                        cellpadding="0"
                                                        cellspacing="0"
                                                        role="presentation"
                                                        style="
                                                          border-collapse: collapse;
                                                          border-spacing: 0px;
                                                        "
                                                      >
                                                        <tbody>
                                                          <tr>
                                                            <td
                                                              style="width: 180px"
                                                            >
                                                              <img
                                                                alt="Logo"
                                                                src="https://res.cloudinary.com/dzcpx6hrf/image/upload/v1741770718/aoab/website/atzhsk14oleiskkxx8na.png"
                                                                style="
                                                                  border: 0;
                                                                  display: block;
                                                                  outline: none;
                                                                  text-decoration: none;
                                                                  height: auto;
                                                                  width: 100%;
                                                                  font-size: 13px;
                                                                "
                                                                width="180"
                                                                height="auto"
                                                              />
                                                            </td>
                                                          </tr>
                                                        </tbody>
                                                      </table>
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td
                                                      align="center"
                                                      style="
                                                        font-size: 0px;
                                                        padding: 0;
                                                        word-break: break-word;
                                                      "
                                                    >
                                                      <div
                                                        style="
                                                          font-family: Inter,
                                                            Arial;
                                                          font-size: 13px;
                                                          line-height: 1;
                                                          text-align: center;
                                                          color: #000000;
                                                        "
                                                      >
                                                        <h1
                                                          style="margin: 16px 0px"
                                                        >
                                                          Please confirm your
                                                          email
                                                        </h1>
                                                        <p>
                                                          Use this code to confirm
                                                          your email and complete
                                                          signup.
                                                        </p>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            background-color: #D3D7DA;
                            border-radius: 8px;
                            vertical-align: top;
                            padding: 16px;
                          "
                        >
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style=""
                            width="100%"
                          >
                            <tbody>
                              <tr>
                                <td
                                  align="center"
                                  style="
                                    font-size: 0px;
                                    padding: 0;
                                    word-break: break-word;
                                  "
                                >
                                  <div
                                    style="
                                      font-family: Inter,
                                        Arial;
                                      font-size: 32px;
                                      font-weight: 700;
                                      letter-spacing: 16px;
                                      line-height: 32px;
                                      text-align: center;
                                      color: #000000;
                                    "
                                  >
                                    <p
                                      style="
                                        font-size: 32px;
                                        margin: 0px;
                                        margin-right: -16px;
                                        padding: 0px;
                                      "
                                    >
                                      ${otp}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            vertical-align: top;
                            padding-top: 4px;
                          "
                        >
                          <table
                            border="0"
                            cellpadding="0"
                            cellspacing="0"
                            role="presentation"
                            style=""
                            width="100%"
                          >
                            <tbody>
                              <tr>
                                <td
                                  align="center"
                                  style="
                                    font-size: 0px;
                                    padding: 10px 25px;
                                    word-break: break-word;
                                  "
                                >
                                  <div
                                    style="
                                      font-family: Inter,
                                        Arial;
                                      font-size: 13px;
                                      line-height: 1;
                                      text-align: center;
                                      color: #555555;
                                    "
                                  >
                                    <p>
                                      This code is valid for 90 Seconds.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOtp;
