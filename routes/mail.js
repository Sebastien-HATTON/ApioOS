var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('email-templates').EmailTemplate
var path = require('path')


module.exports = function (Apio) {


    var transporter = nodemailer.createTransport(smtpTransport({
        host: "smtps.aruba.it",
        port: 465,
        secure: true,
        auth: {
            user: "info@apio.cc",
            pass: "@Pio22232425"
        }
    }));


    return {


        sendMailRegistration: function (req, res) {
            var templateDir = path.join(__dirname, '../mailtemplates', 'registration')
            var registration = new EmailTemplate(templateDir)
            var mail = {};
            var email = req.params.mail
            var user = {name: 'Joe', pasta: 'spaghetti'}
            registration.render(user, function (err, results) {
                if (err) {
                    return console.error(err)
                }
                mail.to = req.params.mail;
                mail.from = 'Apio <info@apio.cc>';
                mail.subject = 'Welcome';
                mail.html = results.html;
                mail.text = results.text;
                transporter.sendMail(mail, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(info);
                        if (Apio.Configuration.sendSystemMails) {
                            setTimeout(function () {
                                var data = {
                                    to: 'info@apio.cc',
                                    from: 'Apio <info@apio.cc>',
                                    subject: 'Nuovo Utente',
                                    text: 'Un nuovo utente si è registrato: ' + email
                                };

                                require("dns").resolve("www.google.com", function(err) {
                                    if (err) {
                                        console.log("Unable to send mail: no internet connection");
                                    } else {
                                        transporter.sendMail(data, function (err, info) {
                                            if (err) {
                                                console.log(err);
                                            } else if (info) {
                                                console.log(info);
                                            }
                                        });
                                    }
                                });
                            }, 3000);
                        }
                    }

                });
            });
        },
        sendSimpleMail: function (req, res) {
            if (req.body.mail !== "admin") {
                var data = {
                    to: req.body.mail,
                    from: "Apio <info@apio.cc>",
                    //from: "Apio <apioassistance@gmail.com>",
                    subject: "Notifica da ApioOS",
                    text: req.body.text
                };

                transporter.sendMail(data, function (err, info) {
                    if (err) {
                        console.log(err);
                        res.send(500);
                    } else if (info) {
                        console.log(info);
                        res.send(200);
                    }
                });
            }
        }
    };
};
