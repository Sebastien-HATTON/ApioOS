//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

//var Nightmare = require("nightmare");
var exec = require("child_process").exec;
var fs = require("fs");
var request = require("request");
var formidable = require('formidable');
var validator = require("validator");
var fetch = require('node-fetch');
module.exports = function (Apio) {
    return {
        manageDriveFile: function (req, res) {
            //in case of request from to cloud
            console.log('********* REQ manageDriveFile *********');
            var url = undefined;
            var newPath = '';
            var oldPath = '';
            var imageName = '';
            var imageType = '';
            url = "public/users/" + req.session.email + '/temp';
            console.log('URL FOMRIDABLE ', "public/users/" + req.session.email + '/temp');
            //ATTENTION!!! rendere asyncrono le operazioni di fs e innestare le callback di conseguenza
            if (!fs.existsSync(url)) {
                fs.mkdirSync(url);
            }


            //res.writeHead(200, {'Content-Type': 'application/json'});
            res.setHeader("Content-Type", "application/json");
            var form = new formidable.IncomingForm();
            form.uploadDir = url;
            form.keepExtensions = true;

            form.parse(req, function (err, fields, files) {
                console.log('file uploaded: ', files);
                console.log('fields uploaded: ', fields);
                if (err) {
                    res.status(500).send(true);
                } else {
                    newPath = 'public/' + fields.uploadPath;
                    oldPath = files.file.path;
                    imageName = fields.imageName;

                    var tmpType = files.file.type.split('/');
                    imageType = tmpType[1];
                }
            });

            form.on('file', function (name, file) {
                console.log("END UPLOAD FILE ", name, file);

            });
            form.on('end', function () {
                console.log('END UPLOAD');
                console.log(oldPath);
                console.log(newPath);
                if (!fs.existsSync(newPath)) {
                    console.log('******** MAKE A PATH IN OBJECT ********')
                    fs.mkdirSync(newPath);
                }
                if (fs.existsSync(newPath + '/' + imageName + '.' + imageType)) {
                    fs.unlinkSync(newPath + '/' + imageName + '.' + imageType)
                }

                fs.renameSync(oldPath, newPath + '/' + imageName + '.' + imageType);
                exec("sudo chown -R azureuser:azureuser .", function (err) {
                    if (err) {
                        res.status(500).send(true);
                    } else {
                        res.status(200).send(true);
                        if (fs.existsSync(oldPath)) {
                            fs.unlinkSync(oldPath);
                        }
                    }
                });


            });


            //build the case of gateway
        },
        getBindToProperty: function (req, res) {
            Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (error, obj) {
                if (error) {
                    res.status(500).send(error);
                } else if (obj) {
                    delete obj._id;
                    delete obj.name;
                    res.status(200).send(obj);
                } else {
                    res.sendStatus(404);
                }
            });
        },
        modifyBindToProperty: function (req, res) {
            Apio.Database.db.collection("Communication").findOne({name: "addressBindToProperty"}, function (error, obj) {
                if (error) {
                    res.status(500).send(error);
                } else if (obj) {
                    delete obj._id;
                    var keys = Object.keys(obj);
                    var bodyKeys = Object.keys(req.body);
                    //Creating a unique object with both the keys of the old and the new object
                    for (var k in bodyKeys) {
                        if (keys.indexOf(bodyKeys[k]) === -1) {
                            keys.push(bodyKeys[k]);
                        }
                    }

                    for (var k in keys) {
                        if (keys[k] !== "name") {
                            if (!req.body.hasOwnProperty(keys[k])) {
                                //If the new object hasn't got the property it has been removed, so also in the final object it have to be removed
                                delete obj[keys[k]];
                            } else {
                                //If the new object contains the property it is the same or it has been modified, so in the final object it have to be overwritten
                                obj[keys[k]] = req.body[keys[k]];
                            }
                        }
                    }

                    Apio.Database.db.collection("Communication").update({name: "addressBindToProperty"}, obj, function (err, result) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.sendStatus(200);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        },
        getIntegrated: function (req, res) {
            Apio.Database.db.collection("Communication").findOne({name: "integratedCommunication"}, function (error, obj) {
                if (error) {
                    res.status(500).send(error);
                } else if (obj) {
                    delete obj._id;
                    delete obj.name;
                    res.status(200).send(obj);
                } else {
                    res.sendStatus(404);
                }
            });
        },
        modifyIntegrated: function (req, res) {
            Apio.Database.db.collection("Communication").findOne({name: "integratedCommunication"}, function (error, obj) {
                if (error) {
                    res.status(500).send(error);
                } else if (obj) {
                    delete obj._id;
                    var keys = Object.keys(obj);
                    var bodyKeys = Object.keys(req.body);
                    //Creating a unique object with both the keys of the old and the new object
                    for (var k in bodyKeys) {
                        if (keys.indexOf(bodyKeys[k]) === -1) {
                            keys.push(bodyKeys[k]);
                        }
                    }

                    for (var k in keys) {
                        if (keys[k] !== "name") {
                            if (!req.body.hasOwnProperty(keys[k])) {
                                //If the new object hasn't got the property it has been removed, so also in the final object it have to be removed
                                delete obj[keys[k]];
                            } else {
                                //If the new object contains the property it is the same or it has been modified, so in the final object it have to be overwritten
                                obj[keys[k]] = req.body[keys[k]];
                            }
                        }
                    }

                    Apio.Database.db.collection("Communication").update({name: "integratedCommunication"}, obj, function (err, result) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.sendStatus(200);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        },
        installNgrok: function (req, res) {
            /*var nightmare = Nightmare({show: false});
            nightmare
                .goto("https://dashboard.ngrok.com/user/signup")
                .type("form[action*='/user/signup'] [name=name]", req.session.email)
                .type("form[action*='/user/signup'] [name=email]", req.session.email)
                .type("form[action*='/user/signup'] [name=confirm]", req.session.email)
                .type("form[action*='/user/signup'] [name=password]", req.session.email)
                .click("form[action*='/user/signup'] [type=submit]")
                .wait("#dashboard")
                .evaluate(function () {
                    return document.querySelector(".get-started .well").firstChild.firstChild.nextSibling.innerHTML;
                })
                .end()
                .then(function (token) {
                    console.log("NGROK token: ", token);
                    exec("bash ./ngrok_install.sh " + token);
                    var send = true;
                    var interval = setInterval(function () {
                        console.log("INTERVAL");
                        if (send) {
                            send = false;
                            exec("nmap -p 4040 -Pn localhost | grep 4040 | awk '{print $2}'", function (error, stdout, stderr) {
                                if (error || stderr) {
                                    res.status(500).send(error || stderr);
                                } else if (stdout) {
                                    stdout = stdout.trim();
                                    send = true;
                                    if (stdout === "open") {
                                        send = false;
                                        Apio.Configuration.remoteAccess = true;
                                        var c = JSON.parse(JSON.stringify(Apio.Configuration));
                                        delete c.dongle;
                                        fs.writeFile("./configuration/default.js", "module.exports = " + JSON.stringify(c, undefined, 4).replace(/\"([^(\")"]+)\":/g, "$1:") + ";", function (err) {
                                            if (err) {
                                                console.log("Error while saving configuration: ", err);
                                            } else {
                                                console.log("Configuration successfully saved");
                                            }
                                        });
                                        exec("curl http://localhost:4040/inspect/http | grep window.common", function (error1, stdout1, stderr1) {
                                            clearInterval(interval);
                                            if (error1) {
                                                res.status(500).send(error1);
                                            } else if (stdout1) {
                                                var result = stdout1.split(" ");
                                                var index = -1;
                                                var obj = "";
                                                for (var i = 0; index === -1 && i < result.length; i++) {
                                                    if (result[i] === "window.common") {
                                                        index = i
                                                    }
                                                }
                                                if (index > -1) {
                                                    for (var i = index + 2; i < result.length; i++) {
                                                        if (obj === "") {
                                                            obj = result[i];
                                                        } else {
                                                            obj += " " + result[i];
                                                        }
                                                    }
                                                    obj = eval(obj);
                                                    var url = obj.Session.Tunnels.command_line.URL;
                                                    url = url.split("/");
                                                    url = url[url.length - 1];
                                                    url = url.split(":");
                                                    var port = url[1];
                                                    url = url[0];
                                                    console.log("url: ", url, "port: ", port);
                                                    res.status(200).send("ssh pi@" + url + " -p " + port);
                                                } else {
                                                    res.status(500).send("No address");
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }, 0);
                    //}).catch(function (error) {
                    //    res.status(500).send(error);
                });*/
        },
        toggleEnableCloud: function (req, res) {
            Apio.Configuration.remote.enabled = !Apio.Configuration.remote.enabled;
            var c = JSON.parse(JSON.stringify(Apio.Configuration));
            delete c.dongle;
            fs.writeFile("./configuration/default.js", "module.exports = " + JSON.stringify(c, undefined, 4).replace(/\"([^(\")"]+)\":/g, "$1:") + ";", function (err) {
                if (err) {
                    console.log("Error while saving configuration: ", err);
                    res.status(500).send(err);
                } else {
                    console.log("Configuration successfully saved");
                    if (Apio.Configuration.remote.enabled === true) {
                        Apio.Remote.socket.connect();
                    } else if (Apio.Configuration.remote.enabled === false) {
                        Apio.Remote.socket.disconnect();
                    }
                    res.sendStatus(200);
                }
            });
        },
        rebootBoard: function (req, res) {
            if (Apio.Configuration.type === "cloud") {
                //Apio.io.emit("apio_reboot_board", req.session.apioId);
                var socketId = Apio.connectedSockets[req.session.apioId][0];
                Apio.io.sockets.connected[socketId].emit("apio_reboot_board");
            } else if (Apio.Configuration.type === "gateway") {
                setTimeout(function () {
                    var execReboot = function () {
                        exec("sudo reboot", function (error, stdout, stderr) {
                            if (error || stderr) {
                                console.log("exec error: " + error || stderr);
                            } else if (stdout) {
                                console.log("Board is rebooting in a while, please wait");
                            }
                        });
                    };

                    if (Apio.Configuration.sendSystemMails) {
                        Apio.Database.db.collection("Services").findOne({name: "mail"}, function (e, service) {
                            if (e) {
                                console.log("Unable to find service mail: ", e);
                            } else if (service) {
                                Apio.Database.db.collection("Users").find({role: "superAdmin"}).toArray(function (e_u, users) {
                                    if (e_u) {
                                        console.log("Unable to find superAdmins: ", e_u);
                                    } else if (users) {
                                        var mail = [];
                                        for (var x in users) {
                                            if (validator.isEmail(users[x].email)) {
                                                mail.push(users[x].email);
                                            }
                                        }

                                        var to = mail[0];
                                        var cc = mail.splice(1);

                                        if (to) {
                                            request.post("http://localhost:" + service.port + "/apio/mail/send", {
                                                body: {
                                                    to: to,
                                                    cc: cc.join(),
                                                    subject: "Board riavviata",
                                                    text: "La board " + Apio.Configuration.name + " (apioId: " + Apio.System.getApioIdentifier() + ") è stata riavvata il " + (new Date())
                                                },
                                                json: true
                                            }, function (err, httpResponse) {
                                                if (err) {
                                                    console.log("Error while sending mail: ", err);
                                                } else if (httpResponse.statusCode === 200) {
                                                    execReboot();
                                                }
                                            });
                                        } else {
                                            execReboot();
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        execReboot();
                    }
                }, 5000);
            }
        },
        restartSystem: function (req, res) {
            if (Apio.Configuration.type === "cloud") {
                //Apio.io.emit("apio_restart_system", req.session.apioId);
                var socketId = Apio.connectedSockets[req.session.apioId][0];
                Apio.io.sockets.connected[socketId].emit("apio_restart_system");
            } else if (Apio.Configuration.type === "gateway") {
                exec("ps aux | grep app.js | awk '{print $2}'", function (error, appjsPID, stderr) {
                    if (error) {
                        console.log("exec error: " + error);
                    } else if (appjsPID) {
                        appjsPID = appjsPID.split("\n");
                        appjsPID.pop();
                        exec("cd " + __dirname + "/.. && forever start -s -c 'node --expose_gc' app.js", function (error, stdout, stderr) {
                            if (error || stderr) {
                                console.log("exec error: " + error || stderr);
                            } else {
                                if (appjsPID.length > 2) {
                                    for (var i in appjsPID) {
                                        exec("sudo kill -9 " + appjsPID[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + appjsPID[i] + " killed");
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                });
            }
        },
        shutdownBoard: function (req, res) {
            if (Apio.Configuration.type === "cloud") {
                //Apio.io.emit("apio_shutdown_board", req.session.apioId);
                var socketId = Apio.connectedSockets[req.session.apioId][0];
                Apio.io.sockets.connected[socketId].emit("apio_shutdown_board");
                res.sendStatus(200);
            } else if (Apio.Configuration.type === "gateway") {
                Apio.io.emit("apio_shutdown");
                setTimeout(function () {
                    var execShutdown = function () {
                        exec("sudo shutdown -h now", function (error, stdout, stderr) {
                            if (error || stderr) {
                                console.log("exec error: " + error || stderr);
                                res.sendStatus(500);
                            } else if (stdout) {
                                console.log("Board is shutting down in a while, please wait");
                                res.sendStatus(200);
                            }
                        });
                    };

                    if (Apio.Configuration.sendSystemMails) {
                        Apio.Database.db.collection("Services").findOne({name: "mail"}, function (e, service) {
                            if (e) {
                                console.log("Unable to find service mail: ", e);
                            } else if (service) {
                                Apio.Database.db.collection("Users").find({role: "superAdmin"}).toArray(function (e_u, users) {
                                    if (e_u) {
                                        console.log("Unable to find superAdmins: ", e_u);
                                    } else if (users) {
                                        var mail = [];
                                        for (var x in users) {
                                            if (validator.isEmail(users[x].email)) {
                                                mail.push(users[x].email);
                                            }
                                        }

                                        var to = mail[0];
                                        var cc = mail.splice(1);

                                        if (to) {
                                            request.post("http://localhost:" + service.port + "/apio/mail/send", {
                                                body: {
                                                    to: to,
                                                    cc: cc.join(),
                                                    subject: "Board spenta",
                                                    text: "La board " + Apio.Configuration.name + " (apioId: " + Apio.System.getApioIdentifier() + ") è stata spenta il " + (new Date())
                                                },
                                                json: true
                                            }, function (err, httpResponse) {
                                                if (err) {
                                                    console.log("Error while sending mail: ", err);
                                                } else if (httpResponse.statusCode === 200) {
                                                    execShutdown();
                                                }
                                            });
                                        } else {
                                            execShutdown();
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        execShutdown();
                    }
                }, 2000);
            }
        },
        launchPropertiesAdder: function (req, res) {
            exec("cd ./services && node apio_properties_adder.js --apioId " + req.session.apioId + (req.body.objectId ? " --objectId " + req.body.objectId : ""), function (error, stdout, stderr) {
                if (error || stderr) {
                    res.status(500).send(error || stderr);
                } else {
                    res.status(200).send(stdout);
                }
            });
        },
        getServiceByName: function (req, res) {
            Apio.Database.db.collection("Services").findOne({name: req.params.name}, function (error, result) {
                if (error) {
                    res.status(500).send(error);
                } else if (result) {
                    res.status(200).send(result);
                } else {
                    res.sendStatus(404);
                }
            });
        },
        getAllLogs: function (req, res) {
            var files = fs.readdirSync("public/applications/" + req.params.app);
            var toRead = [], toSend = {};
            for (var i in files) {
                if (files[i].indexOf(".json") > -1 && files[i].indexOf("logs") > -1) {
                    toRead.push("public/applications/" + req.params.app + "/" + files[i]);
                }
            }

            toRead.sort(function (a, b) {
                var aComponents = a.split(" ")[1].split(".")[0].split("-");
                aComponents[0] = Number(aComponents[0]);
                aComponents[1] = Number(aComponents[1]);
                aComponents[2] = Number(aComponents[2]);
                var bComponents = b.split(" ")[1].split(".")[0].split("-");
                bComponents[0] = Number(bComponents[0]);
                bComponents[1] = Number(bComponents[1]);
                bComponents[2] = Number(bComponents[2]);

                return aComponents[0] - bComponents[0] || aComponents[1] - bComponents[1] || aComponents[2] - bComponents[2];
            });

            for (var i in toRead) {
                var read = fs.readFileSync(toRead[i]);
                var f = read === "" ? {} : JSON.parse(read);
                for (var j in f) {
                    if (!toSend.hasOwnProperty(j)) {
                        toSend[j] = {};
                    }

                    for (var k in f[j]) {
                        toSend[j][k] = f[j][k];
                    }
                }
            }

            res.status(200).send(toSend);
        },
        log: function (req, res) {
            var log_entry = {
                timestamp: Date.now(),
                source: req.body.log.source || null, //Una stringa che identifica chi ha prodotto questo log
                event: req.body.log.event || null, //Una stringa che identifica il tipo di evento
                value: req.body.log.value || null //Un valore assegnato all'evento
            }

            Apio.Logger.log(log_entry);
        },
        admin: function (req, res) {
            res.sendfile("public/html/settings.html");
        },
        monitor: function (req, res) {
            if (req.body.check === 0) {
                exec("netstat -anp 2> /dev/null | grep :" + req.body.port + " | awk '{ print $7 }' | cut -d '/' -f1", function (error, stdout, stderr) {
                    if (error || stderr) {
                        res.status(500).send(error || stderr);
                    } else {
                        res.status(200).send(stdout);
                    }

                });
            } else if (req.body.check === 1) {
                exec("netstat -anp 2> /dev/null | grep :" + req.body.port + " | awk '{ print $7 }' | cut -d '/' -f1 | xargs kill", function (error, stdout, stderr) {
                    if (error || stderr) {
                        res.status(500).send(error || stderr);
                    } else {
                        res.status(200).send(stdout);
                    }
                });
            } else if (req.body.check === 2) {
                exec("cd ./services && forever start -s " + req.body.process + ".js", function (error, stdout, stderr) {
                    if (error || stderr) {
                        res.status(500).send(error || stderr);
                    } else {
                        res.status(200).send(stdout);
                    }
                });
            }
        },
        setCloudAccess: function (req, res) {
            if (Apio.Configuration.remote.enabled && Apio.Configuration.type === "gateway") {
                var user = req.body.user;
                Apio.Database.db.collection("Users").findAndModify({
                    "email": user.email
                }, [
                    ["email", 1]
                ], {
                    $set: {
                        "enableCloud": req.body.cloudAccess
                    }
                }, function (err, result) {
                    if (err) {
                        Apio.Util.log("Unable to enable the user " + user.email + " on the cloud due to a local database error.")
                        console.log(err);
                    } else {
                        Apio.Util.log("The user has been locally enabled to access the cloud. Now telling ApioCloud...")
                        Apio.Util.log("Contacting ApioCloud to enable user " + user.email + " ...")
                        request.post(Apio.Configuration.remote.uri + "/apio/user/" + user.email + "/editAccess", {
                            form: {
                                "email": result.email,
                                "password": result.password,
                                "apioId": Apio.System.getApioIdentifier(),
                                "grant": req.body.cloudAccess
                            }
                        }, function (err, httpResponse, body) {
                            Apio.Util.log("ApioCloud responded with (" + body + ").")
                            var response = JSON.parse(body);
                            res.send(response)
                        })
                    }
                })
            }
        },
        adapter: function (req, res) {
            var req_data = {
                json: true,
                uri: req.body.url,
                method: "POST",
                body: req.body.data
            }
            console.log("\n\n /apio/adapter sending the following request")
            console.log(req_data);
            console.log("\n\n")
            var _req = request(req_data, function (error, response, body) {
                if ("undefined" !== typeof response) {
                    if ("200" === response.statusCode || 200 === response.statusCode) {
                        console.log("Apio Adapter method : got the following response from " + req.body.url)
                        console.log(body);
                        res.send(body)
                    }
                    else {
                        console.log("Apio Adapter : Something went wrong ")
                        res.status(response.statusCode).send(body);
                    }
                } else {
                    res.status(500).send();
                }

            });
        },
        restore: function (req, res) {
            var sys = require("sys");
            var exec = require("child_process").exec;
            console.log("Qui");
            var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio", function (error, stdout, stderr) {
                //sys.print("stdout: "+stdout);
                //sys.print("stderr: "+stderr);
                if (error !== null) {
                    console.log("exec error: " + error);
                }
            });
            res.status(200).send({});
        },
        shutdown: function (req, res) {
            /*var child = exec("sudo shutdown -h now", function(error, stdout, stderr) {
             //sys.print("stdout: "+stdout);
             //sys.print("stderr: "+stderr);
             if (error !== null) {
             console.log("exec error: " + error);
             }
             });*/
            if (Apio.Configuration.type === "cloud") {
                Apio.io.emit("apio_shutdown", req.session.apioId);
            } else if (Apio.Configuration.type === "gateway") {
                Apio.io.emit("apio_shutdown");
            }
            res.status(200).send({});
        },
        index: function (req, res) {
            //Apio.Database.db.collection("Users").findOne({
            //    name: "verify"
            //}, function (err, doc) {
            //    if (err) {
            //        var sys = require("sys");
            //        var exec = require("child_process").exec;
            //        var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio");
            //
            //
            //    } else {
            //        if (doc) {
            //            console.log("Il database c'è faccio il dump");
            //            var sys = require("sys");
            //            var exec = require("child_process").exec;
            //            var child = exec("mongodump --out ./backup");
            //
            //
            //        } else {
            //            console.log("Il database non c'è faccio il restore");
            //            var sys = require("sys");
            //            var exec = require("child_process").exec;
            //            if (fs.existsSync("./backup/apio")) {
            //                console.log("C'è il backup fs.exist");
            //                var child = exec("mongorestore ./backup/apio -d apio");
            //
            //            } else {
            //                console.log("Non c'è il backup fs.exist");
            //                var child = exec("mongorestore ./data/apio -d apio");
            //
            //            }
            //
            //
            //        }
            //
            //    }
            //});

            if (Apio.Configuration.type === "cloud") {
                if (req.query.hasOwnProperty("ip") && req.query.hasOwnProperty("objectId")) {
                    res.redirect("http://" + req.query.ip + ":8086/#/home/" + req.query.objectId);
                } else {
                    if (!req.session.hasOwnProperty("email")) {
                        if (Apio.Configuration.hasOwnProperty("index")) {
                            if (Apio.Configuration.index.default === false) {
                                res.sendfile("public/applications/html/index.html");
                            } else {
                                res.sendfile("public/html/index.html");
                            }
                        } else {
                            res.sendfile("public/html/index.html");
                        }
                    } else {
                        res.sendfile("public/html/app.html");
                    }
                }
            } else if (Apio.Configuration.type === "gateway") {
                if (!req.session.hasOwnProperty("email")) {
                    if (Apio.Configuration.hasOwnProperty("index")) {
                        if (Apio.Configuration.index.default === false) {
                            res.sendfile("public/applications/html/index.html");
                        } else {
                            res.sendfile("public/html/index.html");
                        }
                    } else {
                        res.sendfile("public/html/index.html");
                    }
                } else {
                    res.sendfile("public/html/app.html");
                }
            }
        },
        login: function (req, res, n) {
            if (req.session.hasOwnProperty("email")) {
                if (typeof Apio === "undefined") {
                    Apio = {};
                }
                if (typeof Apio.user === "undefined") {
                    Apio.user = {};
                }
                if (typeof Apio.user.email === "undefined") {
                    Apio.user.email = [];
                }

                if (req.session.email && Apio.user.email.indexOf(req.session.email) === -1) {
                    Apio.user.email.push(req.session.email);
                }

                n();
            } else {
                console.log("Unauthorized access redirected to login screen")
                res.redirect("/");
            }
        },
        getPlatform: function (req, res) {
            var o = {};
            if (Apio.Configuration.type === "cloud") {
                o.apioId = req.session.apioId;
                o.type = "cloud";
            } else if (Apio.Configuration.type === "gateway") {
                o.apioId = Apio.System.getApioIdentifier();
                o.type = "gateway";
            }
            res.status(200).send(o);
        },
        getIP: function (req, res) {
            exec("hostname -I", function (error, stdout, stderr) {
                if (error || stderr) {
                    res.status(500).send();
                } else if (stdout) {
                    res.status(200).send(stdout);
                } else {
                    res.status(404).send();
                }
            });
        },
        getIPComplete: function (req, res) {
            exec("ifconfig -a | grep 'Link encap' | awk '{print $1}'", function (error, stdout) {
                if (error) {
                    console.log("exec error (1): ", error);
                } else if (stdout) {
                    var next = true, peripherals = stdout.split("\n"), peripheralsIP = {};
                    peripherals.pop();
                    var interval = setInterval(function () {
                        if (peripherals.length) {
                            if (next) {
                                next = false;
                                var p = peripherals[0];
                                if (p !== "" && p !== "lo") {
                                    exec("ifconfig " + p.trim() + " | grep 'inet addr' | awk -F: '{print $2}' | awk '{print $1}'", function (error, stdout) {
                                        if (error) {
                                            console.log("exec error (2): ", error);
                                        } else if (stdout) {
                                            peripheralsIP[p] = stdout.trim();
                                            peripherals.splice(0, 1);
                                            next = true;
                                        } else {
                                            peripherals.splice(0, 1);
                                            next = true;
                                        }
                                    });
                                } else {
                                    peripherals.splice(0, 1);
                                    next = true;
                                }
                            }
                        } else {
                            clearInterval(interval);
                            exec("wget http://ipinfo.io/ip -qO -", function (error, stdout) {
                                var publicIP = "";
                                if (error) {
                                    console.log("exec error (3): ", error);
                                    //res.status(200).send({local: peripheralsIP, public: publicIP});
                                } else if (stdout) {
                                    publicIP = stdout.trim();
                                    //res.status(200).send({local: peripheralsIP, public: publicIP});
                                }

                                exec("curl http://localhost:4040/inspect/http | grep window.common", function (error1, stdout1, stderr1) {
                                    if (error1) {
                                        console.log("exec error (4): ", error1);
                                        res.status(200).send({local: peripheralsIP, public: publicIP, remote: ""});
                                    } else if (stdout1) {
                                        var result = stdout1.split(" ");
                                        var index = -1;
                                        var obj = "";
                                        for (var i = 0; index === -1 && i < result.length; i++) {
                                            if (result[i] === "window.common") {
                                                index = i
                                            }
                                        }

                                        if (index > -1) {
                                            for (var i = index + 2; i < result.length; i++) {
                                                if (obj === "") {
                                                    obj = result[i];
                                                } else {
                                                    obj += " " + result[i];
                                                }
                                            }

                                            obj = eval(obj);
                                            var url = obj.Session.Tunnels.command_line.URL;
                                            url = url.split("/");
                                            url = url[url.length - 1];
                                            url = url.split(":");
                                            var port = url[1];
                                            url = url[0];
                                            res.status(200).send({
                                                local: peripheralsIP,
                                                public: publicIP,
                                                remote: "ssh pi@" + url + " -p " + port
                                            });
                                        } else {
                                            res.status(200).send({local: peripheralsIP, public: publicIP, remote: ""});
                                        }
                                    }
                                });
                            });
                        }
                    }, 0);
                }
            });
        },
        getServices: function (req, res) {
            var searchQuery = {};
            if (Apio.Configuration.type === "cloud") {
                searchQuery.apioId = req.session.apioId;
            }
            Apio.Database.db.collection("Services").find(searchQuery).toArray(function (error, result) {
                if (error) {
                    res.status(500).send();
                } else if (result) {
                    res.status(200).send(result);
                } else {
                    res.status(404).send();
                }
            });
        },
        redirect: function (req, res) {
            console.log("Richiesta /app");
            res.sendfile("public/html/app.html");
        },
        serialSend: function (req, res) {

            var obj = req.body.data;
            console.log("\n\n%%%%%%%%%%\nAl seria/send arriva questp")
            console.log(obj)
            console.log("\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n\n")
            Apio.Serial.send(obj);
            res.send({status: true});
        },
        getFiles: function (req, res) {
            res.status(200).send(fs.readdirSync("public/" + decodeURIComponent(req.params.folder)));
        },
        fileDelete: function (req, res) {
            if (req.body.path.indexOf("planimetry") > -1) {
                if (Apio.Configuration.type === "cloud") {
                    req.body.path = req.body.path.replace("planimetry", "planimetry/" + req.session.apioId);
                    var filename = req.body.path.split("/");
                    filename = filename[filename.length - 1];
                    //Apio.io.emit("apio.remove.planimetry", {
                    //    apioId: req.session.apioId,
                    //    filename: filename
                    //});

                    var socketId = Apio.connectedSockets[req.session.apioId][0];
                    Apio.io.sockets.connected[socketId].emit("apio.remove.planimetry", {
                        //apioId: req.session.apioId,
                        filename: filename
                    });
                } else if (Apio.Configuration.type === "gateway") {
                    if (Apio.Configuration.remote.enabled) {
                        Apio.Remote.socket.emit("apio.remove.planimetry.fromgateway", {
                            apioId: req.session.apioId,
                            filename: req.body.path
                        });
                    }
                }
            }

            fs.unlink(req.body.path, function (err) {
                if (err) {
                    console.log(err);
                    res.status(400).send(false)
                } else {
                    res.status(200).send(true);
                }
            })
        },
        returnConfig: function (req, res) {
            res.send(Apio.Configuration);
        },
        update : function(req,res){
	        var lastCommit = fs.readFileSync(".git/FETCH_HEAD","utf-8");
	        console.log("Last Commit: ", lastCommit);
	        lastCommit = lastCommit.split("\t")[0];
	        console.log("Last Commit: ", lastCommit);
	        /*request.get("https://raw.githubusercontent.com/ApioLab/updates/master/version.json", {
	            json: true
	        }, function (err, httpResponse) {
	            if (err) {
	                console.log("Error: ", err);
	            } else if (httpResponse.statusCode === 200) {
	                //execReboot();
	                console.log("Risposta ",httpResponse)
	                res.status(200).send(false)
	            }
	        });*/
	        fetch("https://raw.githubusercontent.com/ApioLab/updates/master/version.json")
		    .then(function(res) {
		        return res.text();
		    }).then(function(body) {
		        //console.log("Body", body);
		        var remoteCommit = JSON.parse(body)
		        console.log("1:", remoteCommit.commit);
		        console.log("2:", lastCommit);
		        if(remoteCommit.commit.substring(0,7) != lastCommit.substring(0,7)){
			        res.status(200).send(true);
		        } else {
			        res.status(200).send(false);
		        }
		    });
	        
        }
    }
};