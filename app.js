//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************** LICENSE *********************************
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

"use strict";
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var domain = require("domain");
var exec = require("child_process").exec;
var express = require("express");
var fs = require("fs");
var path = require("path");
var request = require("request");
var session = require("express-session");
var util = require("util");

var Slack = require('node-slack');
var webhook_url = "https://hooks.slack.com/services/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";
var slack = new Slack(webhook_url);

var app = express();
var http = require("http").Server(app);
var integratedCommunication = require("./configuration/integratedCommunication.js");

var Apio = require("./apio.js")();

var sessionMiddleware = session({
    cookie: {
        expires: false,
        maxAge: 0,
        name: "apioCookie"
    },
    resave: true,
    saveUninitialized: true,
    secret: "e8cb0757-f5de-4c109-9774-7Bf45e79f285"
});

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({
    limit: "50mb"
}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
}));
app.use(cookieParser());

app.use(sessionMiddleware);

app.use(function (req, res, next) {
    if (req.headers.host.indexOf("localhost") > -1 || req.headers.host.indexOf("127.0.0.1") > -1) {
        next();
    } else {
        if (req.path === "/" || (req.path.indexOf("template") > -1 && (req.path.indexOf("logo.png") > -1 || req.path.indexOf("background.jpg") > -1)) || req.path === "/apio/user/authenticate" || req.path.indexOf("/apio/sync") > -1 || req.path.indexOf("/apio/enableSync") > -1 || req.path === "/apio/user" || req.path === "/apio/assignToken" || req.headers.hasOwnProperty("cookie")) {
            next();
        } else {
            res.redirect("/");
        }
    }
});

if (typeof Apio === "undefined") {
    Apio = {};
}
if (typeof Apio.user === "undefined") {
    Apio.user = {};
}
if (typeof Apio.user.email === "undefined") {
    Apio.user.email = [];
}

app.use(function (req, res, next) {
    if (req.session.email && Apio.user.email.indexOf(req.session.email) === -1) {
        Apio.user.email.push(req.session.email);
    }
    next();
});

if (Apio.Configuration.type === "cloud") {
    app.use(function (req, res, next) {
        var p = req.path.toString();
        if (p.indexOf("applications") > -1) {
            p = p.replace("applications", "boards%2F" + req.session.apioId);
            res.redirect(p);
        } else if (p.indexOf("planimetry") > -1 && p.indexOf(req.session.apioId) === -1) {
            p = p.replace("planimetry", "planimetry%2F" + req.session.apioId);
            res.redirect(p);
        } else {
            next();
        }
    });
}

var routes = {
    boards: require("./routes/boards.js")(Apio),
    cloud: require("./routes/cloud.js")(Apio),
    core: require("./routes/core.route.js")(Apio),
    dashboard: require("./routes/dashboard.route.js")(Apio),
    dongleApio: require("./routes/dongleapio.js")(Apio),
    events: require("./routes/events.js")(Apio),
    mail: require("./routes/mail.js")(Apio),
    marketplace: require("./routes/marketplace.js")(Apio),
    notifications: require("./routes/notifications.js")(Apio),
    objects: require("./routes/objects.js")(Apio),
    planimetry: require("./routes/planimetry.js")(Apio),
    services: require("./routes/services.js")(Apio),
    states: require("./routes/states.js")(Apio),
    users: require("./routes/users.js")(Apio)
};

process.on("SIGINT", function () {
    console.log("About to exit");
    Apio.Database.db.close();
    process.exit();
});

var d = domain.create();
d.on("error", function (err) {
    Apio.Util.printError(err);
});

d.run(function () {
    if (!fs.existsSync("./uploads")) {
        fs.mkdirSync("./uploads");
    }
    Apio.Socket.init(http, sessionMiddleware);
    Apio.Database.connect(function () {
        Apio.Database.db.collectionNames("Events", function (err, names) {
            if (err) {
                console.log("Error while check existence of Events: ", err);
            } else if (names.length) {
                console.log("Collection Events Exists");
            } else {
                console.log("Collection Events DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("Events", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection Events");
                    } else if (collection) {
                        console.log("Collection Events successfully created");
                    }
                });
            }
        });
        Apio.Database.db.collectionNames("Objects", function (err, names) {
            if (err) {
                console.log("Error while check existence of Objects: ", err);
            } else if (names.length) {
                console.log("Collection Objects Exists");
            } else {
                console.log("Collection Objects DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("Objects", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection Objects");
                    } else if (collection) {
                        console.log("Collection Objects successfully created");
                        if (Apio.Configuration.type === "gateway") {
                            var date = new Date();
                            var d = date.getFullYear() + "-" + (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate());
                            Apio.Database.db.collection("Objects").insert({
                                address: "10",
                                connected: true,
                                created: d,
                                db: {},
                                log: {},
                                marker: {},
                                name: "Analytics",
                                notifications: {},
                                objectId: "10",
                                properties: {},
                                protocol: "l",
                                status: "1",
                                tag: " ",
                                type: "service",
                                user: []
                            }, function (error, result1) {
                                if (error) {
                                    console.log("Error while inserting App Analytics: ", error);
                                } else if (result1) {
                                    console.log("App Analytics successfully installed");
                                }
                            });
                        }
                    }
                });
            }
        });

        Apio.Database.db.collectionNames("Planimetry", function (err, names) {
            if (err) {
                console.log("Error while check existence of Planimetry: ", err);
            } else if (names.length) {
                console.log("Collection Planimetry Exists");
            } else {
                console.log("Collection Planimetry DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("Planimetry", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection Planimetry");
                    } else if (collection) {
                        console.log("Collection Planimetry successfully created");
                    }
                });
            }
        });

        Apio.Database.db.collectionNames("Communication", function (err, names) {
            if (err) {
                console.log("Error while check existence of Communication: ", err);
            } else if (names.length) {
                console.log("Collection Communication Exists");
                Apio.Database.db.collection("Communication").findAndModify({name: "integratedCommunication"}, [["name", 1]], {$set: integratedCommunication}, function (err, result) {
                    if (err) {
                        console.log(err);
                    } else if (null === result) {
                        Apio.Database.db.collection("Communication").insert(integratedCommunication, function (error, result1) {
                            if (error) {
                                console.log("Error while inserting Communication integratedCommunication: ", error);
                            } else if (result1) {
                                console.log("Communication integratedCommunication successfully installed");
                            }
                        });

                    } else {
                        console.log("Ok")
                    }
                });
            } else {
                console.log("Collection Communication DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("Communication", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection Communication");
                    } else if (collection) {
                        console.log("Collection Communication successfully created");

                        if (Apio.Configuration.type === "gateway") {
                            Apio.Database.db.collection("Communication").insert({
                                name: "addressBindToProperty",
                                apio: {},
                                enocean: {},
                                zwave: {}
                            }, function (error, result1) {
                                if (error) {
                                    console.log("Error while inserting Communication addressBindToProperty: ", error);
                                } else if (result1) {
                                    console.log("Communication addressBindToProperty successfully installed");
                                }
                            });

                            Apio.Database.db.collection("Communication").insert(integratedCommunication, function (error, result1) {
                                if (error) {
                                    console.log("Error while inserting Communication integratedCommunication: ", error);
                                } else if (result1) {
                                    console.log("Communication integratedCommunication successfully installed");
                                }
                            });
                        }
                    }
                });
            }
        });

        if (Apio.Configuration.type === "gateway") {
            var startGatewayService = function (service) {
                if (Apio.Configuration.dependencies.gateway[service].hasOwnProperty("startAs") && Apio.Configuration.dependencies.gateway[service].hasOwnProperty("version")) {
                    if (service === "dongle") {
                        exec("ps aux | grep dongle_apio | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                if (fs.existsSync("./dongle_flag.txt")) {
                                    var hiFlag = Number(String(fs.readFileSync("./dongle_flag.txt")).trim());
                                    if (hiFlag === 0) {
                                        fs.writeFileSync("./dongle_flag.txt", "1");
                                    }
                                } else {
                                    fs.writeFileSync("./dongle_flag.txt", "1");
                                }
                                exec("cd ./services && sudo forever start -s -c 'node --expose_gc' dongle_apio.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (service === "zwave") {
                        exec("ps aux | grep zwave | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./services && sudo forever start -s -c 'node --expose_gc' dongle_zwave.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (service === "enocean") {
                        exec("ps aux | grep enocean | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./services && sudo forever start -s -c 'node --expose_gc' dongle_enocean.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (service === "notification") {
                        exec("ps aux | grep notification | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./services && sudo forever start -s -c 'node --expose_gc' notification_mail_sms.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (Apio.Configuration.dependencies.gateway[service].startAs === "process") {
                        exec("ps aux | grep " + service + " | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./services && sudo forever start -s -c 'node --expose_gc' " + service + ".js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (Apio.Configuration.dependencies.gateway[service].startAs === "require") {
                        require("./services/" + service + ".js")(require("./apioLibraries.js"));
                    }
                }
            };

            Apio.Database.db.collectionNames("Services", function (err, names) {
                if (err) {
                    console.log("Error while check existence of Services: ", err);
                } else if (names.length) {
                    console.log("Collection Services Exists");
                    for (var i in Apio.Configuration.dependencies.gateway) {
                        startGatewayService(i);
                    }
                } else {
                    console.log("Collection Services DOESN'T Exists, creating....");
                    Apio.Database.db.createCollection("Services", function (error, collection) {
                        if (error) {
                            console.log("Error while creating collection Services");
                        } else if (collection) {
                            console.log("Collection Services successfully created");
                            for (var i in Apio.Configuration.dependencies.gateway) {
                                startGatewayService(i);
                            }
                        }
                    });
                }
            });
        } else if (Apio.Configuration.type === "cloud") {
            var startCloudService = function (service) {
                if (Apio.Configuration.dependencies.cloud[service].hasOwnProperty("startAs") && Apio.Configuration.dependencies.cloud[service].hasOwnProperty("version")) {
                    if (service === "dongle") {
                        exec("ps aux | grep dongle | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./servicesCloud && sudo forever start -s -c 'node --expose_gc' dongle_logic.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (service === "notification") {
                        exec("ps aux | grep notification | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./servicesCloud && sudo forever start -s -c 'node --expose_gc' notification_mail_sms.js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (Apio.Configuration.dependencies.cloud[service].startAs === "process") {
                        exec("ps aux | grep " + service + " | awk '{print $2}'", function (error, stdout, stderr) {
                            if (error) {
                                console.log("exec error: " + error);
                            } else if (stdout) {
                                stdout = stdout.split("\n");
                                stdout.pop();
                                if (stdout.length > 2) {
                                    for (var i in stdout) {
                                        exec("sudo kill -9 " + stdout[i], function (error, stdout, stderr) {
                                            if (error) {
                                                console.log("exec error: " + error);
                                            } else {
                                                console.log("Process with PID " + stdout[i] + " killed");
                                            }
                                        });
                                    }
                                }

                                exec("cd ./servicesCloud && sudo forever start -s -c 'node --expose_gc' " + service + ".js", function (error, stdout, stderr) {
                                    if (error) {
                                        console.log("exec error: " + error);
                                    } else {
                                        console.log(i + " server corretly start");
                                    }
                                });
                            }
                        });
                    } else if (Apio.Configuration.dependencies.cloud[service].startAs === "require") {
                        require("./servicesCloud/" + service + ".js")(require("./apioLibraries.js"));
                    }
                }
            };

            Apio.Database.db.collectionNames("Services", function (err, names) {
                if (err) {
                    console.log("Error while check existence of Services: ", err);
                } else if (names.length) {
                    console.log("Collection Services Exists");
                    for (var i in Apio.Configuration.dependencies.cloud) {
                        startCloudService(i);
                    }
                } else {
                    console.log("Collection Services DOESN'T Exists, creating....");
                    Apio.Database.db.createCollection("Services", function (error, collection) {
                        if (error) {
                            console.log("Error while creating collection Services");
                        } else if (collection) {
                            console.log("Collection Services successfully created");
                            for (var i in Apio.Configuration.dependencies.cloud) {
                                startCloudService(i);
                            }
                        }
                    });
                }
            });
        }

        Apio.Database.db.collectionNames("States", function (err, names) {
            if (err) {
                console.log("Error while check existence of States: ", err);
            } else if (names.length) {
                console.log("Collection States Exists");
            } else {
                console.log("Collection States DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("States", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection States");
                    } else if (collection) {
                        console.log("Collection States successfully created");
                    }
                });
            }
        });
        Apio.Database.db.collectionNames("Users", function (err, names) {
            if (err) {
                console.log("Error while check existence of Users: ", err);
            } else if (names.length) {
                console.log("Collection Users Exists");
                Apio.Database.db.collection("Users").find({token: {$exists: false}}).toArray(function (error, users) {
                    if (error) {
                        console.log("Error while getting Users: ", error);
                    } else if (users) {
                        for (var i = 0; i < users.length; i++) {
                            if (!users[i].hasOwnProperty("email") || !users[i].hasOwnProperty("password")) {
                                users.splice(i--, 1);
                            }
                        }

                        users.forEach(function (user) {
                            var hash = user.password;
                            while (hash.length < 32) {
                                hash += "0";
                            }

                            var key = hash.substring(0, 32);

                            Apio.Database.db.collection("Users").update({email: user.email}, {$set: {token: Apio.Token.getFromText(user.email, key)}}, function (err_) {
                                if (err_) {
                                    console.log("Error while updating user with email " + user.email + ": ", err_);
                                } else {
                                    console.log("Token on user with email " + user.email + " successfully added");
                                }
                            });
                        });
                    }
                });
            } else {
                console.log("Collection Users DOESN'T Exists, creating....");
                Apio.Database.db.createCollection("Users", function (error, collection) {
                    if (error) {
                        console.log("Error while creating collection Users");
                    } else if (collection) {
                        console.log("Collection Users successfully created");
                    }
                });
            }
        });
        Apio.io.emit("started");

        if (Apio.Configuration.type === "gateway") {
            Apio.Database.db.collection("Users").find().toArray(function (err, users) {
                if (err) {
                    console.log("Error while getting Users: ", err);
                } else if (users) {
                    var u = [];
                    for (var x in users) {
                        if (users[x].email) {
                            u.push(users[x].email + " (" + users[x].role + ")");
                        }
                    }
                    var name = "";
                    if (Apio.Configuration.hasOwnProperty('name')) {
                        name = Apio.Configuration.name;

                    } else {
                        name = Apio.System.getApioIdentifier();
                    }

                    exec("ifconfig -a | grep 'Link encap' | awk '{print $1}'", function (error, stdout) {
                        if (error) {
                            console.log("exec error (1): " + error);
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
                                                    console.log("exec error (2): " + error);
                                                } else if (stdout) {
                                                    peripheralsIP[p] = stdout.trim();
                                                }

                                                peripherals.splice(0, 1);
                                                next = true;
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
                                            console.log("exec error (3): " + error);
                                        } else if (stdout) {
                                            publicIP = stdout.trim();
                                        }

                                        exec("curl http://localhost:4040/inspect/http | grep window.common", function (error1, stdout1, stderr1) {
                                            clearInterval(interval);
                                            var remoteAccess = "";
                                            if (error1) {
                                                console.log("Error while getting remote access: ", error1)
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
                                                    remoteAccess = "ssh pi@" + url + " -p " + port;
                                                }
                                            }

                                            var IPtext = "Local IP: ";
                                            for (var p in peripheralsIP) {
                                                if (IPtext === "Local IP: ") {
                                                    IPtext += peripheralsIP[p] + " (" + p + ")"
                                                } else {
                                                    IPtext += ", " + peripheralsIP[p] + " (" + p + ")"
                                                }
                                            }

                                            IPtext += ", Public IP: " + publicIP;

                                            if (remoteAccess) {
                                                IPtext += ", Remote IP: " + remoteAccess;
                                            }

                                            slack.send({
                                                text: "Il sistema " + Apio.Configuration.name + " è connesso.Gli utenti abilitati sono:\n\r " + u.join("\n\r") + "\n\r" + IPtext,
                                                username: Apio.Configuration.name
                                            });
                                        });
                                    });
                                }
                            }, 0);
                        }
                    });
                }
            });
        }
    });

    //Core Routes
    app.post("/apio/manage/file", routes.core.manageDriveFile);
    app.post("/apio/file/delete", routes.core.fileDelete);
    app.post("/apio/log", routes.core.log); //Rotta non più usata
    app.get("/", routes.core.index);
    app.get("/apio/update", routes.core.update);
    app.get("/admin", routes.core.admin);
    app.get("/app", routes.core.login, routes.core.redirect);
    app.post("/apio/user/setCloudAccess", routes.core.setCloudAccess);
    app.post("/apio/adapter", routes.core.adapter);
    app.get("/apio/restore", routes.core.restore);
    app.post("/apio/serial/send", routes.core.serialSend);
    app.get("/apio/getFiles/:folder", routes.core.getFiles);
    app.get("/apio/getAllLogs/:app", routes.core.getAllLogs);
    app.get("/apio/shutdown", routes.core.shutdownBoard);
    app.get("/apio/getPlatform", routes.core.getPlatform);
    app.get("/apio/getServices", routes.core.getServices);
    app.get("/apio/getService/:name", routes.core.getServiceByName);
    app.get("/apio/configuration/return", routes.core.returnConfig);
    app.post("/apio/configuration/toggleEnableCloud", routes.core.toggleEnableCloud);
    app.get("/apio/getIP", routes.core.getIP);
    app.get("/apio/getIPComplete", routes.core.getIPComplete);
    app.post("/apio/process/monitor", routes.core.monitor);
    app.post("/apio/launchPropertiesAdder", routes.core.launchPropertiesAdder);
    app.post("/apio/rebootBoard", routes.core.rebootBoard);
    app.post("/apio/restartSystem", routes.core.restartSystem);
    app.post("/apio/shutdownBoard", routes.core.shutdownBoard);
    app.post("/apio/ngrok/install", routes.core.installNgrok);
    app.get("/apio/communication/bindToProperty", routes.core.getBindToProperty);
    app.post("/apio/communication/bindToProperty", routes.core.modifyBindToProperty);
    app.get("/apio/communication/integrated", routes.core.getIntegrated);
    app.post("/apio/communication/integrated", routes.core.modifyIntegrated);
    //Cloud Routes
    app.post("/apio/user/allowCloud", routes.cloud.allowCloud);
    app.post("/apio/sync/:uuid", routes.cloud.sync);
    app.post("/apio/syncLogics", routes.cloud.syncLogics);
    app.get("/apio/enableSync/:apioId/:timestamp", routes.cloud.enableSync);
    app.post("/apio/assignToken", routes.cloud.assignToken);
    //Marketplace Routes
    app.get("/marketplace/applications/download/:name", routes.marketplace.download);
    app.post("/marketplace/applications/autoinstall", routes.marketplace.autoInstall);
    app.post("/marketplace/hex/installHex", routes.marketplace.installHex);
    //Notifications Routes
    app.get("/apio/notifications/:user", routes.notifications.list);
    app.get("/apio/notifications/listDisabled/:user", routes.notifications.listdisabled);
    app.post("/apio/notifications/markAsRead", routes.notifications.delete);
    app.post("/apio/notifications/disable", routes.notifications.disable);
    app.post("/apio/notifications/enable", routes.notifications.enable);
    app.post("/apio/notifications/readAll", routes.notifications.deleteAll);
    app.post("/apio/notify", routes.notifications.notify);
    app.put("/apio/notifications/sendMail/:user", routes.notifications.sendMail);
    app.put("/apio/notifications/sendSMS/:user", routes.notifications.sendSMS);
    //Routes Users
    app.post("/apio/user", routes.users.create);
    app.post("/apio/user/uploadImage", routes.users.uploadImage);
    app.post("/apio/user/saveLastUploadImage", routes.users.saveLastUploadImage);
    app.get("/apio/user", routes.users.list);
    app.get("/apio/user/getSession", routes.users.getSession);
    app.get("/apio/user/getSessionComplete", routes.users.getSessionComplete);
    app.get("/apio/user/getSessionToken", routes.users.getSessionToken);
    app.post("/apio/user/authenticate", routes.users.authenticate);
    app.get("/apio/user/logout", routes.users.logout);
    app.post("/apio/database/updateUserOnApplication", routes.users.updateUserOnApplication);
    app.post("/apio/user/delete", routes.users.delete);
    app.post("/apio/user/changePassword", routes.users.changePassword);
    app.post("/apio/user/setAdminPermission", routes.users.setAdminPermission);
    app.post("/apio/user/assignUser", routes.users.assignUser);
    app.post("/apio/user/getUser", routes.users.getUser);
    app.post("/apio/user/modifyAdditionalInfo", routes.users.modifyAdditionalInfo);
    app.post("/apio/user/:email/editAccess", routes.users.editAccess);
    //Routes Dongle apio
    app.get("/apio/dongle/getSettings", routes.dongleApio.getSettings);
    app.post("/apio/dongle/changeSettings", routes.dongleApio.changeSettings);
    app.post("/apio/dongle/onoff", routes.dongleApio.onoff);
    //States Routes
    app.post("/apio/state/apply", routes.states.apply);
    app.delete("/apio/state/:name", routes.states.deleteState);
    app.put("/apio/state/:name", routes.states.modify);
    app.post("/apio/state", routes.states.create);
    app.get("/apio/state", routes.states.list);
    app.get("/apio/state/:name", routes.states.getByName);
    //Dashboard Routes
    app.get("/dashboard", routes.dashboard.index);
    app.get("/apio/app/export", routes.dashboard.exportApioApp);
    app.get("/apio/app/exportIno", routes.dashboard.exportInoApioApp);
    app.post("/apio/app/upload", routes.dashboard.uploadApioApp);
    app.post("/apio/app/maximumId", routes.dashboard.maximumIdApioApp);
    app.post("/apio/app/gitCloneApp", routes.dashboard.gitCloneApp);
    app.post("/apio/app/delete", routes.dashboard.deleteApioApp);
    app.post("/apio/app/folder", routes.dashboard.folderApioApp);
    app.post("/apio/app/modify", routes.dashboard.modifyApioApp);
    app.post("/apio/database/updateApioApp", routes.dashboard.updateApioApp);
    app.post("/apio/database/createNewApioAppFromEditor", routes.dashboard.createNewApioAppFromEditor);
    app.post("/apio/database/createNewApioApp", routes.dashboard.createNewApioApp);
    app.post("/apio/app/changeSettings", routes.dashboard.changeSettingsObject);
    //Events Routes
    app.get("/apio/event", routes.events.list);
    app.get("/apio/event/launch", routes.events.launch);
    app.get("/apio/event/:name", routes.events.getByName);
    app.delete("/apio/event/:name", routes.events.delete);
    app.put("/apio/event/:name", routes.events.update);
    app.post("/apio/event", routes.events.create);
    //Planimetry Routes
    app.get("/apio/database/getPlanimetry", routes.planimetry.list);
    app.post("/apio/database/insertInDbPlanimetry/", routes.planimetry.insertInDb);
    app.post("/apio/database/modifyInDbPlanimetry/", routes.planimetry.modifyInDb);
    app.post("/apio/database/removeById/", routes.planimetry.removeById);
    app.post("/apio/file/uploadPlanimetry", routes.planimetry.uploadPlanimetry);
    //Objects Routes
    app.get("/apio/database/getObjects", routes.objects.list);
    app.get("/apio/database/getAllObjects", routes.objects.listCloud);
    app.get("/apio/database/getObject/:id", routes.objects.getById);
    app.patch("/apio/object/:id", routes.objects.update);
    app.put("/apio/object/:id", routes.objects.update);
    app.put("/apio/modifyObject/:id", routes.objects.modify);
    app.post("/apio/object/addNotification", routes.objects.addNotification);
    app.get("/apio/object/:obj", routes.objects.requireOne);
    app.get("/apio/objects", routes.objects.listAll);
    app.post("/apio/updateListElements", routes.objects.updateListElements);
    app.post("/apio/object/updateLog", routes.objects.updateLog);
    app.post("/apio/object/updateAll", routes.objects.updateAll);
    app.put("/apio/object/updateProperties/:id", routes.objects.updateProperties);
    //Mail Routes
    app.get("/apio/mail/registration/:mail", routes.mail.sendMailRegistration);
    app.post("/apio/service/mail/send", routes.mail.sendSimpleMail);

    //Boards Routes
    app.get("/apio/boards", routes.boards.show);
    app.get("/apio/boards/getDetailsFor/:boardsArr", routes.boards.getDetails);
    app.post("/apio/boards/change", routes.boards.change);
    app.post("/apio/boards/setName", routes.boards.setName);
    app.post("/apio/boards/getSocketConnection", routes.boards.getSocketConnection);
    //Services Routes
    app.get("/apio/services", routes.services.getAll);
    app.post("/apio/service/:service/route/:route/data/:data", routes.services.postRequest);
    app.get("/apio/service/:service/route/:route", routes.services.getRequest);

    http.listen(Apio.Configuration.http.port, function () {
        Apio.Util.log("APIO server started on port " + Apio.Configuration.http.port + " using the configuration:");
        console.log(util.inspect(Apio.Configuration, {colors: true}));
        var gc = require("./services/garbage_collector.js");
        gc();

        //Check if wvdial is installed
        exec("which wvdial", function (error_w, stdout_w) {
            if (error_w) {
                console.log("Error while checking for wvdial: ", error_w);
            } else if (stdout_w) {
                var wdComponents = __dirname.split("/");
                var user = undefined;
                for (var x = 0; !user && x < wdComponents.length; x++) {
                    if (wdComponents[x] === "home") {
                        user = wdComponents[x + 1];
                    }
                }

                if (user) {
                    var changeOwnerAndPermissionsAndRestart = function () {
                        exec("chown pi:crontab /var/spool/cron/crontabs/" + user + " && chmod 600 /var/spool/cron/crontabs/" + user + " && service cron restart", function (error_op) {
                            if (error_op) {
                                console.log("Error while changing owner and/or permissions: ", error_op);
                            } else {
                                console.log("Owner and permissions successfully changed");
                            }
                        });
                    };

                    fs.stat(__dirname + "/3GConnect.js", function (error_3g, stats_3g) {
                        if (error_3g) {
                            console.log("Error while getting starts of " + __dirname + "/3GConnect.js: ", error_3g);
                        } else if (stats_3g) {
                            fs.stat("/var/spool/cron/crontabs/" + user, function (error_s, stats_s) {
                                if (error_s) {
                                    console.log("No crontab existing, creating file");
                                    fs.writeFile("/var/spool/cron/crontabs/" + user, "*/2 * * * * sudo node " + __dirname + "/3GConnect.js\n0 4 * * * sudo reboot", function (error) {
                                        if (error) {
                                            console.log("Error while creating new crontab: ", error);
                                        } else {
                                            console.log("New crontab successfully created");
                                            changeOwnerAndPermissionsAndRestart();
                                        }
                                    });
                                } else if (stats_s) {
                                    console.log("crontab exists, appending data to file");
                                    fs.readFile("/var/spool/cron/crontabs/" + user, "utf8", function (error_r, content) {
                                        if (error_r) {
                                            console.log("Error while reading /var/spool/cron/crontabs/" + user + ": ", error_r);
                                        } else if (content) {
                                            if (content.indexOf("sudo node " + __dirname + "/3GConnect.js") === -1) {
                                                fs.appendFile("/var/spool/cron/crontabs/" + user, "*/2 * * * * sudo node " + __dirname + "/3GConnect.js\n", function (error_a1) {
                                                    if (error_a1) {
                                                        console.log("Error while appending on /var/spool/cron/crontabs/" + user + ": ", error_a1);
                                                    } else if (content.indexOf("sudo reboot") === -1) {
                                                        fs.appendFile("/var/spool/cron/crontabs/" + user, "0 4 * * * sudo reboot\n", function (error_a2) {
                                                            if (error_a2) {
                                                                console.log("Error while appending on /var/spool/cron/crontabs/" + user + ": ", error_a2);
                                                            } else {
                                                                console.log("crontab successfully installed");
                                                                changeOwnerAndPermissionsAndRestart();
                                                            }
                                                        });
                                                    } else {
                                                        changeOwnerAndPermissionsAndRestart();
                                                    }
                                                });
                                            } else if (content.indexOf("sudo reboot") === -1) {
                                                fs.appendFile("/var/spool/cron/crontabs/" + user, "0 4 * * * sudo reboot\n", function (error_a1) {
                                                    if (error_a1) {
                                                        console.log("Error while appending on /var/spool/cron/crontabs/" + user + ": ", error_a1);
                                                    } else {
                                                        console.log("crontab successfully installed");
                                                        changeOwnerAndPermissionsAndRestart();
                                                    }
                                                });
                                            }
                                        } else {
                                            console.log("crontab already installed");
                                        }
                                    });
                                } else {
                                    console.log("Unable to get stats: either the file doesn't exist or insufficient permissions, try to rewrite");
                                    fs.writeFile("/var/spool/cron/crontabs/" + user, "*/2 * * * * sudo node " + __dirname + "/3GConnect.js\n0 4 * * * sudo reboot", function (error) {
                                        if (error) {
                                            console.log("Error while creating new crontab: ", error);
                                        } else {
                                            console.log("New crontab successfully created");
                                            changeOwnerAndPermissionsAndRestart();
                                        }
                                    });
                                }
                            });
                        } else {
                            console.log("Unable to get starts of " + __dirname + "/3GConnect.js, probably file is corrupted");
                        }
                    });
                } else {
                    console.log("Unable to find any user, cron will be not installed");
                }
            } else {
                console.log("wvdial not installed");
            }
        });
    });
});