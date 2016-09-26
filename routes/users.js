var aesjs = require("aes-js");
var crypto = require("crypto");
var fs = require("fs");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var formidable = require('formidable');
//var transporter = nodemailer.createTransport(smtpTransport({
//    host: "smtp.gmail.com",
//    port: 465,
//    secure: true,
//    auth: {
//        user: "apioassistance@gmail.com",
//        pass: "Apio22232425."
//    }
//}));

var transporter = nodemailer.createTransport(smtpTransport({
    host: "smtps.aruba.it",
    port: 465,
    secure: true,
    auth: {
        user: "info@apio.cc",
        pass: "@Pio22232425"
    }
}));

module.exports = function (Apio) {
    return {
        getSession: function (req, res) {
            res.status(200).send(req.session.email);
        },
        getSessionComplete: function (req, res) {
            res.status(200).send(req.session);
        },
        getSessionToken: function (req, res) {
            res.status(200).send({
                email: req.session.email,
                token: req.session.token
            });
        },
        //getUser: function (req, res) {
        //    Apio.Database.db.collection("Users").findOne({email: req.body.email}, function (err, data) {
        //        res.send({
        //            user: data
        //        });
        //    });
        //},
        getUser: function (req, res) {
            if (Apio.Configuration.type === "cloud") {
                if (req.session.apioId === "Continue to Cloud") {
                    Apio.Database.db.collection("Users").findOne({email: req.body.email}, function (err, data) {
                        res.send({
                            user: data
                        });
                    });
                } else {
                    if (req.body.email === "info@apio.cc") {
                        Apio.Database.db.collection("Users").findOne({
                            email: req.body.email
                        }, function (err, data) {
                            data.role = "superAdmin";
                            res.send({
                                user: data
                            });
                        });
                    } else {
                        Apio.Database.db.collection("Users").findOne({
                            "apioId.code": req.session.apioId,
                            email: req.body.email
                        }, function (err, data) {
                            for (var x = 0; data.role === undefined && x < data.apioId.length; x++) {
                                if (data.apioId[x].code === req.session.apioId) {
                                    data.role = data.apioId[x].role;
                                }
                            }
                            res.send({
                                user: data
                            });
                        });
                    }
                }
            } else if (Apio.Configuration.type === "gateway") {
                Apio.Database.db.collection("Users").findOne({email: req.body.email}, function (err, data) {
                    res.send({
                        user: data
                    });
                });
            }
        },
        update: function (req, res) {

        },
        editAccess: function (req, res) {
            Apio.Database.db.collection("Users").findOne({email: req.params.email}, function (err, user) {
                if (err) {
                    console.log("An error has occurred while editing access to apioOS with id (" + req.body.apioId + ") to user " + req.params.email);
                    res.status(500).send({
                        status: false
                    });
                } else {
                    if (null == user) {
                        console.log("The user with email " + req.params.email + "has no Cloud Account");
                        //console.log(req);
                        var usr = {
                            email: req.body.email,
                            password: req.body.password,
                            apioId: [
                                req.body.apioId
                            ],
                            role: req.body.role
                        };
                        Apio.Database.db.collection('Users').insert(usr, function (err) {
                            if (err) {
                                console.log(err);
                                res.status(500).send({
                                    status: false
                                });
                            } else {
                                fs.mkdirSync('public/users/' + usr._id.toString());
                                console.log("Creata directory " + 'public/users/' + usr._id.toString())
                                res.send({
                                    status: true
                                });
                            }
                        });
                    } else {
                        var action = "";
                        if (req.body.grant === true || req.body.grant === "true") {
                            action = "$push";
                        } else {
                            action = "$pull";
                        }
                        console.log("DEVO " + action + "are l'apio id " + req.body.apioId + " dentro l'utente con email " + req.params.email);
                        var updateField_ = {};
                        updateField_[action] = {
                            apioId: req.body.apioId
                        };


                        Apio.Database.db.collection("Users").update({email: req.params.email}, updateField_, function (err, data) {
                            if (err) {
                                console.log("An error has occurred while granting access to apioOS with id (" + req.body.apioId + ") to user " + req.params.email);
                                console.log(err);
                                console.log("The body is " + JSON.stringify(req.body));
                                res.status(500).send({
                                    status: false
                                });
                            } else {
                                res.send({
                                    status: true
                                });
                            }
                        });
                    }
                }
            });
        },
        logout: function (req, res) {
            if (Apio.hasOwnProperty("user")) {
                if (Apio.user.hasOwnProperty("email")) {
                    var index = Apio.user.email.indexOf(req.session.email);
                    if (index > -1) {
                        Apio.user.email.splice(index, 1);
                    }
                }
            }
            req.session.destroy(function () {
                console.log("The session has been destroyed");
            });

            res.writeHead(302, {
                Location: "/"
            });
            res.end();
        },
        changePassword: function (req, res) {
            var hash = crypto.createHash("sha256").update(req.body.password).digest("base64");
            var newHash = crypto.createHash("sha256").update(req.body.newPassword).digest("base64");
            var user = {
                email: req.body.email,
                password: hash
            };

            var key = newHash;
            while (key.length < 32) {
                key += "0";
            }
            key = newHash.substring(0, 32);

            var token = Apio.Token.getFromText(user.email, key);
            req.session.token = token;

            Apio.Database.db.collection("Users").findAndModify(user, [], {$set: {password: newHash, token: token}}, function (err, result) {
                if (err) {
                    console.log(err);
                    res.status(500).send({
                        status: false
                    });
                } else {
                    res.send({
                        status: true
                    });
                }
            });
        },
        create: function (req, res) {
            var usr = {
                email: req.body.email,
                password: req.body.password,
                apioId: req.session.apioId
            };

            Apio.Users.create(usr, function (err, data) {
                if (err) {
                    res.send({
                        status: false,
                        error: err
                    });
                } else if (data) {
                    //Apio.io.emit("apio_user_new", data);
                    var socketIds = Apio.connectedSockets[req.session.email];
                    for (var i in socketIds) {
                        if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                            Apio.io.sockets.connected[socketIds[i]].emit("apio_user_new", data);
                        }
                    }
                    //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                    var event = {
                        server: "apio_user_new.fromgateway",
                        remote: "apio_user_new.fromcloud"
                    };
                    Apio.System.sync(event, usr);

                    if (Apio.Configuration.sendSystemMails) {
                        var text = "L'utente " + req.body.email + " si è registrato";
                        if (Apio.Configuration.type === "cloud") {
                            text += " sul cloud";
                        } else if (Apio.Configuration.type === "gateway") {
                            text += " sulla board con apioId " + Apio.System.getApioIdentifier();
                        }

                        text += " alle " + (new Date());

                        require("dns").resolve("www.google.com", function(err) {
                            if (err) {
                                console.log("Unable to send mail: no internet connection");
                            } else {
                                transporter.sendMail({
                                    to: "info@apio.cc",
                                    //from: "Apio <apioassistance@gmail.com>",
                                    from: "Apio <info@apio.cc>",
                                    subject: "Nuovo utente",
                                    text: text
                                }, function (err, info) {
                                    if (err) {
                                        console.log("Error while sending mail: ", err);
                                    } else if (info) {
                                        console.log("Mail successfully sent: ", info);
                                    }
                                });
                            }
                        });
                    }

                    res.send({
                        status: true,
                        user: data
                    });
                }
            });
        },
        modifyAdditionalInfo: function (req, res) {
            Apio.Database.db.collection("Users").findOne({email: req.session.email}, function (err, user) {
                if (err) {
                    res.status(500).send(err);
                } else if (user) {
                    var updt = {};
                    if (user.hasOwnProperty("additional_info")) {
                        for (var i in req.body.data) {
                            updt["additional_info." + i] = req.body.data[i];
                        }
                    } else {
                        updt.additional_info = {};
                        for (var i in req.body.data) {
                            updt.additional_info[i] = req.body.data[i];
                        }
                    }

                    Apio.Database.db.collection("Users").update({email: req.session.email}, {$set: updt}, function (error, result) {
                        if (error) {
                            res.status(500).send();
                        } else if (result) {
                            res.status(200).send();
                        }
                    });
                }
            });
        },
        uploadImage: function (req, res) {
            var url = undefined;
            url = "public/users/" + req.session.email;
            console.log('URL FOMRIDABLE ', "public/users/" + req.session.email);
            if (!fs.existsSync(url)) {
                fs.mkdirSync(url);
            }
            //res.writeHead(200, {'Content-Type': 'application/json'});
            res.setHeader("Content-Type", "application/json");
            var form = new formidable.IncomingForm();
            form.uploadDir = url;
            form.keepExtensions = true;
            form.on('file', function (name, file) {
                console.log("END UPLOAD FILE")
                fs.renameSync(file.path, url + "/tempImageProfile.png");
                res.status(200).send(true);
            });
            form.parse(req, function (err, fields, files) {
                console.log('file uploaded: ', files);
            });
        },
        saveLastUploadImage: function (req, res) {
            url = "public/users/" + req.session.email;

            console.log('URL FOMRIDABLE ', "public/users/" + req.body.name);
            if (fs.existsSync(url + '/tempImageProfile.png')) {
                fs.renameSync(url + '/tempImageProfile.png', url + '/' + req.body.name + '.png');
                res.status(200).send(true);
                Apio.Database.db.collection("Users").findOne({email: req.session.email}, function (err, user) {
                    if (err) {
                        res.status(500).send(err);
                    } else if (user) {
                        var updt = {};
                        if (user.hasOwnProperty("additional_info")) {
                            console.log('profileImage su: ', req.body.name);
                            updt["additional_info.profileImage"] = req.body.name;
                        } else {
                            updt.additional_info = {};
                            updt.additional_info['profileImage'] = req.body.name;
                        }
                        Apio.Database.db.collection("Users").update({email: req.session.email}, {$set: updt}, function (error, result) {
                            if (error) {
                                res.status(500).send();
                            } else if (result) {
                                console.log('aggiornamento su profileImage avventuo con successo: ', req.body.name);
                                res.status(200).send();
                            }
                        });
                    }
                });
            } else {
                res.status(500).send(true);
            }
        },
        //list: function (req, res) {
        //    if (Apio.Configuration.type === "gateway") {
        //        console.log("E' stata chiamata la rotta Users");
        //        console.log(req.session);
        //        if (req.session.email === "admin" || req.session.priviligies === "superAdmin") {
        //            Apio.Database.db.collection('Users').find().toArray(function (err, users) {
        //                if (err) {
        //                    res.status(500).send({
        //                        status: false
        //                    });
        //                } else {
        //                    var user = [];
        //                    for (var a in users) {
        //                        console.log(users[a].email);
        //                        if (users[a].name !== "verify") {
        //                            user[a] = users[a];
        //                        }
        //                    }
        //                    res.send({
        //                        status: true,
        //                        users: user
        //                    });
        //                }
        //            });
        //        } else if (req.session.priviligies === "administrator") {
        //            Apio.Database.db.collection('Users').findOne({email: req.session.email}, function (err, doc) {
        //                if (err) {
        //                    res.status(500).send({
        //                        status: false
        //                    });
        //                } else if (doc) {
        //                    res.send({
        //                        status: true,
        //                        users: doc.user
        //                    });
        //                }
        //            });
        //        }
        //    } else if (Apio.Configuration.type === "cloud") {
        //        console.log("E' stata chiamata la rotta Users");
        //        console.log(req.session);
        //        if (req.session.email === "info@apio.cc" || req.session.priviligies === "superAdmin") {
        //            if (req.session.apioId === "Continue to Cloud") {
        //                Apio.Database.db.collection('Users').find().toArray(function (err, users) {
        //                    if (err) {
        //                        res.status(500).send({
        //                            status: false
        //                        });
        //                    } else {
        //                        var user = [];
        //                        for (var a in users) {
        //                            console.log(users[a].email);
        //                            if (users[a].name !== "verify") {
        //                                user[a] = users[a];
        //                            }
        //                        }
        //                        res.send({
        //                            status: true,
        //                            users: user
        //                        });
        //                    }
        //                });
        //            } else {
        //                Apio.Database.db.collection('Users').find({"apioId.code": req.session.apioId}).toArray(function (err, users) {
        //                    if (err) {
        //                        res.status(500).send({
        //                            status: false
        //                        });
        //                    } else {
        //                        var user = [];
        //                        for (var a in users) {
        //                            console.log(users[a].email);
        //                            if (users[a].name !== "verify") {
        //                                user[a] = users[a];
        //                            }
        //                        }
        //                        res.send({
        //                            status: true,
        //                            users: user
        //                        });
        //                    }
        //                });
        //            }
        //        } else if (req.session.priviligies === "administrator") {
        //            Apio.Database.db.collection('Users').findOne({
        //                email: req.session.email,
        //                "apioId.code": req.session.apioId
        //            }, function (err, doc) {
        //                if (err) {
        //                    res.status(500).send({
        //                        status: false
        //                    });
        //                } else if (doc) {
        //                    res.send({
        //                        status: true,
        //                        users: doc.user
        //                    });
        //                }
        //            });
        //        }
        //    }
        //},
        list: function (req, res) {
            if (Apio.Configuration.type === "gateway") {
                console.log("E' stata chiamata la rotta Users");
                console.log(req.session);
                if (req.session.email === "admin" || req.session.priviligies === "superAdmin") {
                    Apio.Database.db.collection('Users').find().toArray(function (err, users) {
                        if (err) {
                            res.status(500).send({
                                status: false
                            });
                        } else {
                            var user = [];
                            for (var a in users) {
                                console.log(users[a].email);
                                if (users[a].name !== "verify") {
                                    user[a] = users[a];
                                }
                            }
                            res.send({
                                status: true,
                                users: user
                            });
                        }
                    });
                } else if (req.session.priviligies === "administrator") {
                    Apio.Database.db.collection('Users').findOne({email: req.session.email}, function (err, doc) {
                        if (err) {
                            res.status(500).send({
                                status: false
                            });
                        } else if (doc) {
                            res.send({
                                status: true,
                                users: doc.user
                            });
                        }
                    });
                }
            } else if (Apio.Configuration.type === "cloud") {
                console.log("E' stata chiamata la rotta Users");
                console.log(req.session);
                if (req.session.email === "info@apio.cc" || req.session.priviligies === "superAdmin") {
                    if (req.session.apioId === "Continue to Cloud") {
                        Apio.Database.db.collection('Users').find().toArray(function (err, users) {
                            if (err) {
                                res.status(500).send({
                                    status: false
                                });
                            } else {
                                var user = [];
                                for (var a in users) {
                                    console.log(users[a].email);
                                    if (users[a].name !== "verify") {
                                        user[a] = users[a];
                                    }
                                }
                                res.send({
                                    status: true,
                                    users: user
                                });
                            }
                        });
                    } else {
                        Apio.Database.db.collection('Users').find({"apioId.code": req.session.apioId}).toArray(function (err, users) {
                            if (err) {
                                res.status(500).send({
                                    status: false
                                });
                            } else {
                                var user = [];
                                for (var a in users) {
                                    console.log(users[a].email);
                                    if (users[a].name !== "verify") {
                                        user[a] = users[a];
                                        for (var x = 0; user[a].role === undefined && x < user[a].apioId.length; x++) {
                                            if (user[a].apioId[x].code === req.session.apioId) {
                                                user[a].role = user[a].apioId[x].role;
                                                delete user[a].apioId;
                                            }
                                        }
                                    }
                                }
                                res.send({
                                    status: true,
                                    users: user
                                });
                            }
                        });
                    }
                } else if (req.session.priviligies === "administrator") {
                    Apio.Database.db.collection('Users').findOne({
                        email: req.session.email,
                        "apioId.code": req.session.apioId
                    }, function (err, doc) {
                        if (err) {
                            res.status(500).send({
                                status: false
                            });
                        } else if (doc) {
                            res.send({
                                status: true,
                                users: doc.user
                            });
                        }
                    });
                }
            }
        },
        delete: function (req, res) {
            var usr = {
                email: req.body.email,
                userEmail: req.session.email,
                apioId: req.session.apioId
            };

            Apio.Users.delete(usr, function (err, data) {
                if (err) {
                    res.send(500);
                } else {
                    //Apio.io.emit("apio_user_delete", usr);
                    var socketIds = Apio.connectedSockets[req.session.email];
                    for (var i in socketIds) {
                        if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                            Apio.io.sockets.connected[socketIds[i]].emit("apio_user_delete", usr);
                        }
                    }
                    //MIGLIORARE (TROVARE TUTTE LE E-MAIL E MANDARE SOLO Lì)
                    var event = {
                        server: "apio.server.user.delete",
                        remote: "apio.remote.user.delete"
                    };
                    Apio.System.sync(event, usr);
                    res.send(200)
                }
            });
        },
        updateUserOnApplication: function (req, res) {
            console.log(req.body);
            var usr = {
                method: req.body.method,
                objectId: req.body.objectId,
                email: req.body.user,
                apioId: req.session.apioId
            };

            Apio.Users.shareApp(usr, function (err, data) {
                if (err) {
                    res.send(500);
                } else {
                    res.send(200);
                    //Apio.io.emit("apio_server_new", usr);

                    //Apio.io.emit("apio_server_new", usr.objectId);
                    var socketIds = Apio.connectedSockets[req.session.email];
                    if (usr.method === "add") {
                        //Apio.io.emit("apio_server_new", usr.objectId);
                        for (var i in socketIds) {
                            if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_server_new", usr.objectId);
                            }
                        }
                    } else if (usr.method === "delete") {
                        //Apio.io.emit("apio_server_delete", usr.objectId);
                        for (var i in socketIds) {
                            if (req.session.apioId === Apio.io.sockets.connected[socketIds[i]].client.request.session.apioId) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_server_delete", usr.objectId);
                            }
                        }
                    }
                    var event = {
                        server: "apio.server.user.updateUser",
                        remote: "apio.remote.user.updateUser"
                    };
                    Apio.System.sync(event, usr);
                }
            });
        },
        assignUser: function (req, res) {
            var usr = {
                method: req.body.method,
                email: req.body.email,
                user: req.body.user,
                apioId: req.session.apioId
            };

            Apio.Users.assignUser(usr, function (err, data) {
                if (err) {
                    res.send(500);
                } else {
                    res.send(200);
                    var event = {
                        server: "apio.server.user.assignUser",
                        remote: "apio.remote.user.assignUser"
                    };
                    Apio.System.sync(event, usr);
                }
            });
        },
        setAdminPermission: function (req, res) {
            console.log("/apio/user/setAdminPermission");
            var usr = {
                email: req.body.email,
                role: req.body.role,
                apioId: req.session.apioId
            };

            Apio.Users.setPermission(usr, function (err, data) {
                if (err) {
                    res.send(500);
                } else {
                    res.send(200);
                    var event = {
                        server: "apio.server.user.setPermission",
                        remote: "apio.remote.user.setPermission"
                    };
                    Apio.System.sync(event, usr);
                }
            });
        },
        authenticate: function (req, res) {
            console.log("/apio/user/authenticate");
            var email = req.body.email;
            var password = req.body.password;
            var rememberMe = req.body.rememberMe;
            console.log("Mi arriva da autenticare: ", req.body);
            Apio.Database.db.collection('Users').findOne({email: req.body.email}, function (err, data) {
                if (err || !data) {
                    res.send({
                        status: false
                    });
                } else {
                    var hash = crypto.createHash('sha256').update(req.body.password).digest('base64');
                    if (data.password == hash) {
                        req.session.email = req.body.email;
                        req.session.auth = true;
                        if (Apio.Configuration.type === "cloud") {
                            req.session.apioId = "Continue to Cloud";
                        } else if (Apio.Configuration.type == "gateway") {
                            req.session.apioId = Apio.System.getApioIdentifier();
                        }
                        if (data.role) {
                            req.session.priviligies = data.role;
                        } else {
                            req.session.priviligies = "error";
                        }

                        if (rememberMe == 1) {
                            var hour = 43200000;
                            req.session.cookie.expires = new Date(Date.now() + hour);
                        } else {
                            req.session.cookie.expires = null;
                        }

                        req.session.token = data.token;

                        //Generazione token
                        //while (hash.length < 32) {
                        //    hash += "0";
                        //}
                        //
                        //var key = hash.substring(0, 32);

                        //var string = req.session.email;
                        //var stringBytes = aesjs.util.convertStringToBytes(string);
                        //
                        //var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
                        //var encryptedBytes = aesCtr.encrypt(stringBytes);
                        //
                        //var byteArray = new Uint32Array(encryptedBytes);
                        //var bytes = "";
                        //for (var i in byteArray) {
                        //    var hex = byteArray[i].toString(16);
                        //    if (hex.length === 1) {
                        //        hex = "0" + hex;
                        //    }
                        //    bytes += hex;
                        //}

                        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!req.session: ", req.session);
                        //

                        res.send({
                            user: data,
                            status: true
                        });
                    } else {
                        console.log("Password errata");
                        res.send({
                            status: false,
                            errors: [{
                                type: 'CredentialError'
                            }]
                        });
                    }
                }
            });
        }
    }
};