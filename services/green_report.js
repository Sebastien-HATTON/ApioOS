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

"use strict";
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
var configuration = require("../configuration/default.js");
var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var htmlparser = require("htmlparser");
var http = require("http");
var nodemailer = require("nodemailer");
var port = 0;
var querystring = require("querystring");
var request = require("request");
var smtpTransport = require("nodemailer-smtp-transport");
var socket = require("socket.io-client")("http://localhost:" + configuration.http.port);
var xlsx = require("node-xlsx");

var app = express();
var d = domain.create();
var transporter = nodemailer.createTransport(smtpTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "apioassistance@gmail.com",
        pass: "benfa22232425"
    }
}));

var arrayData = [];
var cookieMap = {};

if (process.argv.indexOf("--http-port") > -1) {
    port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
}

app.use(function (req, res, next) {
    res.header("Accept", "*");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    next();
});

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}));

process.on("SIGINT", function() {
    console.log("About to exit");
    database.close();
    process.exit();
});

d.on("error", function (err) {
    console.log("Domain error: ", err);
});

d.run(function () {
    socket.on("apio_server_delete", function (data) {
        database.collection("Services").findOne({name: "report"}, function (err, result) {
            if (err) {
                console.log("Error while getting Service report: ", err);
            } else if (result) {
                delete result.data[data];

                database.collection("Services").update({name: "report"}, {$set: {data: result.data}}, function (error, ret) {
                    if (error) {
                        console.log("Error while updating service report: ", error);
                    } else if (ret) {
                        console.log("Deleted object from service report");
                    }
                });
            }
        });
    });

    socket.on("apio_server_new", function (data) {
        database.collection("Objects").findOne({objectId: "1"}, function (err, obj) {
            if (err) {
                console.log("Error while getting object with objectId 1: ", err);
            } else if (obj) {
                for (var i in obj.properties) {
                    if (obj.properties[i].objectId === data && obj.properties[i].type === "1") {
                        database.collection("Services").findOne({name: "report"}, function (err_, result) {
                            if (err_) {
                                console.log("Error while getting Service report: ", err_);
                            } else if (result) {
                                result.data[data] = [];
                                database.collection("Objects").findOne({objectId: data}, function (err1, object) {
                                    if (err1) {
                                        console.log("Error while getting object with objectId " + data + ": ", err1);
                                    } else if (object) {
                                        database.collection("Users").find().toArray(function (error, users) {
                                            if (error) {
                                                console.log("Error while getting users: ", error);
                                            } else if (users) {
                                                for (var j in users) {
                                                    if (users[j].role === "superAdmin") {
                                                        result.data[data].push({
                                                            email: users[j].email,
                                                            send: false
                                                        });
                                                    } else if (users[j].role === "administrator") {
                                                        for (var k in object.user) {
                                                            if (object.user[k].email === users[j].email) {
                                                                var isIn1 = false;
                                                                for (var x in result.data[object.objectId]) {
                                                                    if (result.data[object.objectId][x].email === users[j].email) {
                                                                        isIn1 = true;
                                                                    }
                                                                }

                                                                if (!isIn1) {
                                                                    result.data[object.objectId].push({
                                                                        email: users[j].email,
                                                                        send: false
                                                                    });
                                                                }
                                                            }

                                                            for (var l in users[j].user) {
                                                                if (object.user[k].email === users[j].user[l].email) {
                                                                    var isIn1 = false;
                                                                    for (var x in result.data[object.objectId]) {
                                                                        if (result.data[object.objectId][x].email === users[j].user[l].email) {
                                                                            isIn1 = true;
                                                                        }
                                                                    }

                                                                    if (!isIn1) {
                                                                        result.data[object.objectId].push({
                                                                            email: users[j].user[l].email,
                                                                            send: false
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                database.collection("Services").update({name: "report"}, {$set: {data: result.data}}, function (error, ret) {
                                                    if (error) {
                                                        console.log("Error while updating service report: ", error);
                                                    } else if (ret) {
                                                        console.log("Added new object to service report");
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                        break;
                    }
                }
            }
        });
    });

    MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
        if (error) {
            console.log("Unable to get database");
        } else if (db) {
            database = db;
            console.log("Database correctly initialized");
            database.collection("Services").findOne({name: "report"}, function (err, result) {
                if (err) {
                    console.log("Error while getting Service report: ", err);
                } else if (result) {
                    database.collection("Objects").findOne({objectId: "1"}, function (err_, obj) {
                        if (err_) {
                            console.log("Error while getting Object with objectId 1: ", err_);
                        } else if (obj) {
                            var ids = [];
                            for (var i in obj.properties) {
                                if (obj.properties[i].type === "1") {
                                    ids.push({objectId: obj.properties[i].objectId});
                                }
                            }

                            database.collection("Objects").find({$or: ids}).toArray(function (err1, objects) {
                                if (err1) {
                                    console.log("Error while getting objects: ", err1);
                                } else if (objects) {
                                    database.collection("Users").find().toArray(function (err1, users) {
                                        if (err1) {
                                            console.log("Error while getting users: ", err1);
                                        } else if (users) {
                                            var data = result.data;
                                            for (var i in objects) {
                                                if (objects[i].type === "object") {
                                                    var isIn = false;
                                                    for (var j in data) {
                                                        if (j === objects[i].objectId) {
                                                            isIn = true;
                                                            break;
                                                        }
                                                    }

                                                    if (!isIn) {
                                                        data[objects[i].objectId] = [];
                                                        for (var j in users) {
                                                            if (users[j].role === "superAdmin") {
                                                                var isIn1 = false;
                                                                for (var x in data[objects[i].objectId]) {
                                                                    if (data[objects[i].objectId][x].email === users[j].email) {
                                                                        isIn1 = true;
                                                                    }
                                                                }

                                                                if (!isIn1) {
                                                                    data[objects[i].objectId].push({
                                                                        email: users[j].email,
                                                                        send: false
                                                                    });
                                                                }
                                                            } else if (users[j].role === "administrator") {
                                                                for (var k in objects[i].user) {
                                                                    if (objects[i].user[k].email === users[j].email && data[objects[i].objectId].indexOf(users[j].email) === -1) {
                                                                        var isIn1 = false;
                                                                        for (var x in data[objects[i].objectId]) {
                                                                            if (data[objects[i].objectId][x].email === users[j].email) {
                                                                                isIn1 = true;
                                                                            }
                                                                        }

                                                                        if (!isIn1) {
                                                                            data[objects[i].objectId].push({
                                                                                email: users[j].email,
                                                                                send: false
                                                                            });
                                                                        }
                                                                    }

                                                                    for (var l in users[j].user) {
                                                                        if (objects[i].user[k].email === users[j].user[l].email && data[objects[i].objectId].indexOf(users[j].user[l].email) === -1) {
                                                                            var isIn1 = false;
                                                                            for (var x in data[objects[i].objectId]) {
                                                                                if (data[objects[i].objectId][x].email === users[j].user[l].email) {
                                                                                    isIn1 = true;
                                                                                }
                                                                            }

                                                                            if (!isIn1) {
                                                                                data[objects[i].objectId].push({
                                                                                    email: users[j].user[l].email,
                                                                                    send: false
                                                                                });
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            database.collection("Services").update({name: "report"}, {$set: {data: data}}, function (err, result) {
                                                if (err) {
                                                    console.log("Error while updating Service report: ", err);
                                                } else if (result) {
                                                    console.log("Service report successfully updated");
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    app.get("/apio/report/getService", function (req, res) {
        database.collection("Services").findOne({name: "report"}, function (err, service) {
            if (err) {
                res.status(500).send(err);
            } else if (service) {
                res.status(200).send(service);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/report/sendReport", function (req, res) {
        database.collection("Services").findOne({name: "report"}, function (error, result) {
            if (error) {
                console.log("Error while getting service report");
            } else if (result) {
                var data = result.data;
                for (var i in data[req.body.objectId]) {
                    for (var j in req.body.send) {
                        if (data[req.body.objectId][i].email === j) {
                            data[req.body.objectId][i].send = req.body.send[j];
                        }
                    }
                }

                database.collection("Services").update({name: "report"}, {$set: {data: data}}, function (err, result_) {
                    if (err) {
                        res.sendStatus(500);
                    } else if (result_) {
                        res.sendStatus(200);
                    } else {
                        res.sendStatus(404);
                    }
                });
            }
        });
    });

    http.createServer(app).listen(port, function () {
        console.log("APIO Report Service correctly started on port " + port);

        var next = true;
        var sendReport = true;

        setInterval(function () {
            if (database) {
                var date = new Date();
                if (date.getDate() === 1) {
                    if (sendReport) {
                        database.collection("Objects").findOne({objectId: "1"}, function (error, list) {
                            if (error) {
                                console.log("Error while getting object with objectId 1: ", error);
                            } else if (list) {
                                for (var i in list.properties) {
                                    if (list.properties[i].type === "1") {
                                        arrayData.push(list.properties[i]);
                                    }
                                }
                            }
                        });
                        sendReport = false;
                    }
                } else {
                    sendReport = true;
                }
            }
        }, 36000000);

        setInterval(function () {
            if (next && arrayData[0]) {
                var date = new Date();
                var lastMonth = date.getMonth();
                var lastYear = date.getFullYear();

                if (lastMonth === 0) {
                    lastMonth = 12;
                    lastYear--;
                    var monthName = "Dicembre";
                } else if (lastMonth === 1) {
                    var monthName = "Gennaio";
                } else if (lastMonth === 2) {
                    var monthName = "Febbraio";
                } else if (lastMonth === 3) {
                    var monthName = "Marzo";
                } else if (lastMonth === 4) {
                    var monthName = "Aprile";
                } else if (lastMonth === 5) {
                    var monthName = "Maggio";
                } else if (lastMonth === 6) {
                    var monthName = "Giugno";
                } else if (lastMonth === 7) {
                    var monthName = "Luglio";
                } else if (lastMonth === 8) {
                    var monthName = "Agosto";
                } else if (lastMonth === 9) {
                    var monthName = "Settembre";
                } else if (lastMonth === 10) {
                    var monthName = "Ottobre";
                } else if (lastMonth === 11) {
                    var monthName = "Novembre";
                }

                var obj = arrayData.shift();
                var objectId = obj.objectId;
                var objectName = obj.name;
                var requestURL = obj.url;
                request({
                    body: querystring.stringify({
                        username: obj.user,
                        password: obj.pwd,
                        Entra: "Entra"
                    }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    method: "POST",
                    uri: requestURL + "/login.php"
                }, function (error, response, body) {
                    if (error || !response || Number(response.statusCode) !== 200) {
                        console.log("Error: ", error);
                    } else if (body) {
                        cookieMap[requestURL + "/login.php"] = response.headers["set-cookie"][0].split(";")[0];
                        request({
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                Cookie: cookieMap[requestURL + "/login.php"]
                            },
                            method: "GET",
                            uri: requestURL + "/sensori_grafici.php?iddev=0&data=" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "&Radiodata=Monthly&mese=" + lastMonth + "&annoselect=" + lastYear + "&anno=" + lastYear + "&Radiodata_minavgmax=AVG&r=715.9529083456076"
                        }, function (error1, response1, body1) {
                            if (error1 || !response1 || Number(response1.statusCode) !== 200) {
                                console.log("Error: ", error1);
                            } else if (body1) {
                                request({
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded",
                                        Cookie: cookieMap[requestURL + "/login.php"]
                                    },
                                    method: "GET",
                                    uri: requestURL + "/sensori_grafici.php?iddev=1&data=" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "&Radiodata=Monthly&mese=" + lastMonth + "&annoselect=" + lastYear + "&anno=" + lastYear + "&Radiodata_minavgmax=AVG&r=87.78513712864834"
                                }, function (error2, response2, body2) {
                                    if (error2 || !response2 || Number(response2.statusCode) !== 200) {
                                        console.log("Error: ", error2);
                                    } else if (body2) {
                                        request({
                                            method: "GET",
                                            uri: "http://localhost:8092/apio/graphicsData/getCounterReads?objectId=" + objectId + "&month=" + lastMonth
                                        }, function (error3, response3, body3) {
                                            if (error3 || !response3 || Number(response3.statusCode) !== 200) {
                                                console.log("Error: ", error3);
                                            } else if (body3) {
                                                body3 = JSON.parse(body3);

                                                var handler = new htmlparser.DefaultHandler(function (error, dom) {
                                                    if (error) {
                                                        console.log("error while instancing handler: ", error);
                                                    }
                                                });

                                                var parser = new htmlparser.Parser(handler);
                                                parser.parseComplete(body1);
                                                var parsed = handler.dom;

                                                parser.parseComplete(parsed[5].children[0].data);
                                                var parsed_ = handler.dom;

                                                var data = [];
                                                for (var i in parsed_[1].children[2].children) {
                                                    data.push({
                                                        date: Number(i) + 1,
                                                        irradiance: Number(Number(parsed_[1].children[2].children[i].attribs.value).toFixed(3)),
                                                        temperature: 0,
                                                        counter: 0
                                                    });
                                                }

                                                parser.parseComplete(body2);
                                                parsed = handler.dom;

                                                parser.parseComplete(parsed[5].children[0].data);
                                                parsed_ = handler.dom;

                                                for (var i in parsed_[1].children[2].children) {
                                                    data[i].temperature = Number(Number(parsed_[1].children[2].children[i].attribs.value).toFixed(3));
                                                }

                                                for (var i in data) {
                                                    for (var j in body3) {
                                                        if (Number(data[i].date) === Number(body3[j].date)) {
                                                            data[i].counter = Number(Number(body3[j].counter).toFixed(3))
                                                        }
                                                    }
                                                }

                                                var workbookData = [["Giorno", "Irraggiamento [kWh/mq]", "Temperatura [°C]", "Contatore [kWh]"]];
                                                for (var i in data) {
                                                    workbookData.push([data[i].date, data[i].irradiance, data[i].temperature, data[i].counter]);
                                                }
                                                var buffer = xlsx.build([{name: "Foglio 1", data: workbookData}]);
                                                fs.writeFileSync(objectName + ", Report " + monthName + " " + lastYear + ".xlsx", buffer);
                                                console.log("Scritto workbook", objectName + ", Report " + monthName + " " + lastYear + ".xlsx");
                                                database.collection("Services").findOne({name: "report"}, function (err, service) {
                                                    if (err) {
                                                        console.log("Unable to get service report: ", err);
                                                    } else if (service) {
                                                        var emailArray = [];
                                                        for (var i in service.data[objectId]) {
                                                            if (service.data[objectId][i].send === true) {
                                                                emailArray.push(service.data[objectId][i].email);
                                                            }
                                                        }

                                                        if (!emailArray.length && fs.existsSync(objectName + ", Report " + monthName + " " + lastYear + ".xlsx")) {
                                                            fs.unlinkSync(objectName + ", Report " + monthName + " " + lastYear + ".xlsx");
                                                            console.log("Eliminato file (1)");
                                                        }

                                                        while (emailArray.length) {
                                                            transporter.sendMail({
                                                                attachments: [
                                                                    {
                                                                        path: objectName + ", Report " + monthName + " " + lastYear + ".xlsx"
                                                                    }
                                                                ],
                                                                from: "Apio <apioassistance@gmail.com>",
                                                                subject: "Report mensile impianto fotovoltaico " + objectName,
                                                                text: "Buonasera, in allegato trova il riepilogo mensile della produzione del suo impianto.\nCordialità.\nApio s.r.l.",
                                                                to: emailArray.shift()
                                                            }, function (err, info) {
                                                                if (err) {
                                                                    console.log("Errore invio mail: ", err);
                                                                } else if (info) {
                                                                    console.log("Email inviata");
                                                                    if (!emailArray.length && fs.existsSync(objectName + ", Report " + monthName + " " + lastYear + ".xlsx")) {
                                                                        fs.unlinkSync(objectName + ", Report " + monthName + " " + lastYear + ".xlsx");
                                                                        console.log("Eliminato file (2)");
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }
                                                    next = true;
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                next = false;
            }
        }, 0);
    });
});