var aesjs = require("aes-js");
var appRoot = require("app-root-path");
var formidable = require("formidable");
var fs = require("fs");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var targz = require("tar.gz");
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
        //sync: function (req, res) {
        //    console.log("TOGLIERE uuid da questo handler e metterlom nel body della request");
        //    console.log("Il sistema apio con id " + req.params.uuid + " mi sta mandando dei file");
        //    //Devo rifiutare ogni chiamata che non mi manda l'auth
        //    //QUi mi arriva un tar.gz contenente tutte le app
        //    var form = new formidable.IncomingForm();
        //    form.uploadDir = "uploads";
        //    form.keepExtensions = true;
        //
        //    form.on("file", function (name, file) {
        //        Apio.Util.log("Received file " + file.name + " as " + file.path);
        //
        //        fs.rename(file.path, "uploads/" + file.name);
        //        Apio.Util.log("File moved to " + "uploads/" + file.name);
        //
        //        var compress = new targz().extract("./uploads/" + file.name, "./uploads/temp", function (err) {
        //            if (err) {
        //                Apio.Util.log("Error while extracting file" + file.name);
        //                console.log(err);
        //                res.send({
        //                    status: false
        //                });
        //            } else {
        //                Apio.Util.log("The extraction has ended!");
        //                //Rimuovo la vecchia cartella applications
        //                if (fs.existsSync("public/boards/" + req.params.uuid)) {
        //                    Apio.Util.log("Deleting directory " + "public/boards/" + req.params.uuid + " ...");
        //                    Apio.System.deleteFolderRecursive("public/boards/" + req.params.uuid);
        //                } else {
        //                    Apio.Util.log("Creating directory " + "public/boards/" + req.params.uuid + " ...");
        //                    fs.mkdirSync("public/boards/" + req.params.uuid)
        //                }
        //
        //                Apio.Util.log("Moving applications to " + "public/boards/" + req.params.uuid + " ...");
        //                fs.rename("uploads/temp/applications", "public/boards/" + req.params.uuid);
        //                Apio.Util.log("Deleting uploads/applications.tar.gz ...");
        //                fs.unlinkSync("uploads/applications.tar.gz");
        //                res.send({
        //                    status: true
        //                });
        //                Apio.Util.log("Sync operation completed!");
        //            }
        //        });
        //    });
        //
        //    form.parse(req, function (err, fields, files) {
        //        console.log("form.parse")
        //    });
        //},
        sync: function (req, res) {
            console.log("TOGLIERE uuid da questo handler e metterlom nel body della request");
            console.log("Il sistema apio con id " + req.params.uuid + " mi sta mandando dei file");
            //Devo rifiutare ogni chiamata che non mi manda l'auth
            //QUi mi arriva un tar.gz contenente tutte le app
            var form = new formidable.IncomingForm();
            form.uploadDir = "uploads";
            form.keepExtensions = true;

            form.on("file", function (name, file) {
                Apio.Util.log("Received file " + file.name + " as " + file.path);

                fs.rename(file.path, "uploads/" + file.name);
                Apio.Util.log("File moved to uploads/" + file.name);

                if (!fs.existsSync("uploads/temp")) {
                    fs.existsSync("uploads/temp");
                }

                //if (!fs.existsSync("uploads/temp/temp")) {
                //    fs.mkdirSync("uploads/temp/temp");
                //}

                var compress = new targz().extract("./uploads/" + file.name, "./uploads/temp", function (err) {
                    if (err) {
                        Apio.Util.log("Error while extracting file" + file.name);
                        console.log(err);
                        res.send({
                            status: false
                        });
                    } else {
                        Apio.Util.log("The extraction has ended!");
                        //if (!fs.existsSync("public/boards/" + req.params.uuid)) {
                        //    Apio.Util.log("Creating directory " + "public/boards/" + req.params.uuid + " ...");
                        //    fs.mkdirSync("public/boards/" + req.params.uuid);
                        //}

                        Apio.Util.log("Moving applications to public/boards/" + req.params.uuid + " ...");
                        //fs.rename("uploads/temp/applications", "public/boards/" + req.params.uuid);
                        //Files moving
                        //if (fs.existsSync("uploads/temp/temp")) {
                        var basePath = "uploads/temp/" + req.params.uuid;
                        if (!fs.existsSync("public/boards")) {
                            fs.mkdirSync("public/boards");
                        }

                        if (!fs.existsSync("public/boards/" + req.params.uuid)) {
                            fs.mkdirSync("public/boards/" + req.params.uuid);
                        }

                        if (fs.existsSync(basePath)) {
                            //fs.renameSync("uploads/temp/temp", "uploads/temp/" + req.params.uuid);
                            //var basePath = "uploads/temp";
                            var moveFiles = function (dir) {
                                var files = fs.readdirSync(dir);
                                for (var i in files) {
                                    var stats = fs.statSync(dir + "/" + files[i]);
                                    var newPath = ("public/boards/" + req.params.uuid + "/" + dir + "/" + files[i]).replace(basePath + "/", "");
                                    console.log("newPath: ", newPath);
                                    if (stats.isDirectory()) {
                                        if (!fs.existsSync(newPath)) {
                                            fs.mkdirSync(newPath);
                                        }
                                        moveFiles(dir + "/" + files[i]);
                                    } else {
                                        fs.renameSync(dir + "/" + files[i], newPath);
                                    }
                                }
                            };

                            moveFiles(basePath);
                            Apio.System.deleteFolderRecursive(basePath);
                        }

                        Apio.Util.log("Deleting uploads/applications.tar.gz ...");
                        fs.unlinkSync("uploads/applications.tar.gz");
                        res.send({
                            status: true
                        });

                        Apio.Database.db.collection("systems").findOne({apioId: req.params.uuid}, function (err, board) {
                            if (err) {
                                console.log("Error while getting board with apioId " + req.params.uuid + ": ", err);
                            } else if (board) {
                                var text = "";
                                if (board.name) {
                                    text += "La board " + board.name + " (apioId: " + req.params.uuid + ")";
                                } else {
                                    text += "La board con apioId " + req.params.uuid;
                                }

                                text += " ha terminato la sincronizzazione alle " + (new Date());

                                transporter.sendMail({
                                    to: "info@apio.cc",
                                    //from: "Apio <apioassistance@gmail.com>",
                                    from: "Apio <info@apio.cc>",
                                    subject: "Sincronizzazione terminata",
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

                        Apio.Util.log("Sync operation completed!");
                    }
                });
            });

            form.parse(req, function (err, fields, files) {
                console.log("form.parse");
            });
        },
        syncLogics: function (req, res) {
            var form = new formidable.IncomingForm();
            form.uploadDir = "servicesCloud";
            form.keepExtensions = true;

            form.parse(req, function (err, fields, files) {
                console.log("form.parse");
            });

            form.on("file", function (name, file) {
                new targz().extract(file.path, "./servicesCloud/apio_logic", function (err) {
                    if (err) {
                        console.log("Error while extracting file: ", err);
                    } else {
                        console.log("Extraction OK");
                        fs.unlinkSync(file.path);
                        res.sendStatus(200);
                    }
                });
            });
        },
        allowCloud: function (req, res) {
            if (req.body.permission) {
                Apio.Database.db.collection("systems").insert({apioId: req.body.boardId, test: ""}, function (err) {
                    if (err) {
                        console.log("An error occured while inserting the board " + req.body.boardId, err);
                        res.status(500).send();
                    } else {
                        console.log("The board " + req.body.boardId + " as been correctly inserted");
                        //Apio.io.to(req.body.boardId).emit("apio_board_enabled");
                        Apio.io.emit("apio_board_enabled", req.body.boardId);
                        res.status(200).send();
                    }
                });
            } else {
                Apio.Database.db.collection("systems").findAndRemove({apioId: req.body.boardId}, function (err, removedBoard) {
                    if (err) {
                        console.log("An error occured while removing the board " + req.body.boardId, err);
                        res.status(500).send();
                    } else if (removedBoard) {
                        console.log("The board " + req.body.boardId + " as been correctly removed");
                        res.status(200).send();
                    } else {
                        console.log("Unable to find the board " + req.body.boardId);
                        res.status(404).send();
                    }
                });
            }
        },
        //enableSync: function (req, res) {
        //    //Apio.Database.db.collection("systems").findOne({apioId: req.params.apioId}, function (error, board) {
        //    //    if (error) {
        //    //        console.log("Error while finding board with apioId " + req.params.apioId + ": ", error);
        //    //        res.status(500).error(error);
        //    //    } else if (board) {
        //    //        res.sendStatus(200);
        //    //    } else {
        //    //        res.sendStatus(404);
        //    //    }
        //    //});
        //    var isUUIDGood = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        //    if (isUUIDGood.test(req.params.apioId)) {
        //        if (Apio.boardsToSync.hasOwnProperty(req.params.apioId)) {
        //            res.sendFile("board_name.html", {root: appRoot.path + "/public/html"}, function (err) {
        //                if (err) {
        //                    console.log("Error while getting file " + appRoot.path + "/public/html/board_name.html: ", err);
        //                    res.status(500).end(err);
        //                } else {
        //                    console.log("Sent:", appRoot.path + "/public/html/board_name.html");
        //                }
        //            });
        //        } else {
        //            res.status(500).send("Board already registered");
        //        }
        //    } else {
        //        res.status(500).send("apioId not well formed");
        //    }
        //},
        enableSync: function (req, res) {
            var isUUIDGood = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (isUUIDGood.test(req.params.apioId)) {
                req.pause();
                Apio.servicesSocket.boardSync.emit("apio_ask_boards_to_sync");
                Apio.servicesSocket.boardSync.on("apio_get_boards_to_sync", function (data) {
                    req.resume();
                    if (data.hasOwnProperty(req.params.apioId)) {
                        res.sendFile("board_name.html", {root: appRoot.path + "/public/html"}, function (err) {
                            if (err) {
                                console.log("Error while getting file " + appRoot.path + "/public/html/board_name.html: ", err);
                                res.status(500).end(err);
                            } else {
                                console.log("Sent:", appRoot.path + "/public/html/board_name.html");
                            }
                            Apio.servicesSocket.boardSync.off("apio_get_boards_to_sync");
                        });
                    } else {
                        res.status(500).send("Board already registered");
                        Apio.servicesSocket.boardSync.off("apio_get_boards_to_sync");
                    }

                    //Apio.servicesSocket.boardSync.off("apio_get_boards_to_sync");
                });
            } else {
                res.status(500).send("apioId not well formed");
            }
        },
        //VECCHIO
        //assignToken: function (req, res) {
        //    var isUUIDGood = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        //    if (isUUIDGood.test(req.body.apioId)) {
        //        if (Apio.boardsToSync.hasOwnProperty(req.body.apioId)) {
        //            //var key = aesjs.util.convertStringToBytes(fs.readFileSync("./cloud_key.apio", "utf8"));
        //            //var string = req.body.apioId;
        //            //var stringBytes = aesjs.util.convertStringToBytes(string);
        //            //
        //            //var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
        //            //var encryptedBytes = aesCtr.encrypt(stringBytes);
        //            //
        //            //var byteArray = new Uint32Array(encryptedBytes);
        //            //var bytes = "";
        //            //for (var i in byteArray) {
        //            //    var hex = byteArray[i].toString(16);
        //            //    if (hex.length === 1) {
        //            //        hex = "0" + hex;
        //            //    }
        //            //    bytes += hex;
        //            //}
        //
        //            var bytes = Apio.Token.getFromText(req.body.apioId, fs.readFileSync("./cloud_key.apio", "utf8"));
        //
        //            Apio.Database.db.collection("systems").insert(req.body, function (err) {
        //                if (err) {
        //                    console.log("Error while inserting data of the new system: ", err);
        //                    res.status(500).send(err);
        //                } else {
        //                    if (!Apio.hasOwnProperty("connectedSockets")) {
        //                        Apio.connectedSockets = {};
        //                    }
        //
        //                    if (!Apio.connectedSockets.hasOwnProperty(req.body.apioId)) {
        //                        Apio.connectedSockets[req.body.apioId] = [];
        //                    }
        //
        //                    if (Apio.connectedSockets[req.body.apioId].indexOf(Apio.boardsToSync[req.body.apioId].socket.id) === -1) {
        //                        Apio.connectedSockets[req.body.apioId].push(Apio.boardsToSync[req.body.apioId].socket.id);
        //                    }
        //
        //                    Apio.boardsToSync[req.body.apioId].socket.emit("get_apio_token", bytes);
        //                    Apio.boardsToSync[req.body.apioId].socket.emit("apio.remote.sync.request", req.body);
        //                    delete Apio.boardsToSync[req.body.apioId];
        //                    res.sendStatus(200);
        //                }
        //            });
        //        } else {
        //            res.status(500).send("Board already registered");
        //        }
        //    } else {
        //        res.status(500).send("apioId not well formed");
        //    }
        //}
        assignToken: function (req, res) {
            var isUUIDGood = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (isUUIDGood.test(req.body.apioId)) {

                req.pause();
                Apio.servicesSocket.boardSync.emit("apio_ask_boards_to_sync");
                Apio.servicesSocket.boardSync.on("apio_get_boards_to_sync", function (data) {
                    console.log("apio_get_boards_to_sync: ", data);
                    req.resume();
                    if (data.hasOwnProperty(req.body.apioId)) {
                        var bytes = Apio.Token.getFromText(req.body.apioId, fs.readFileSync("./cloud_key.apio", "utf8"));

                        Apio.Database.db.collection("systems").insert(req.body, function (err) {
                            if (err) {
                                console.log("Error while inserting data of the new system: ", err);
                                res.status(500).send(err);
                            } else {
                                //if (!Apio.hasOwnProperty("connectedSockets")) {
                                //    Apio.connectedSockets = {};
                                //}
                                //
                                //if (!Apio.connectedSockets.hasOwnProperty(req.body.apioId)) {
                                //    Apio.connectedSockets[req.body.apioId] = [];
                                //}
                                //
                                //if (Apio.connectedSockets[req.body.apioId].indexOf(data[req.body.apioId]) === -1) {
                                //    Apio.connectedSockets[req.body.apioId].push(data[req.body.apioId]);
                                //}

                                Apio.servicesSocket.boardSync.emit("apio_board_has_been_enabled", {
                                    body: req.body,
                                    bytes: bytes
                                });
                                res.sendStatus(200);
                            }
                        });
                    } else {
                        res.status(500).send("Board already registered");
                    }

                    Apio.servicesSocket.boardSync.off("apio_get_boards_to_sync");
                });
            } else {
                res.status(500).send("apioId not well formed");
            }
        }
    }
};