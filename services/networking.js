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
module.exports = function (libraries) {
    var bodyParser = libraries["body-parser"];
    var express = libraries.express;
    var fs = libraries.fs;
    var app = express();
    var http = libraries.http.Server(app);
    // var configuration = require("../configuration/default.js");
    var exec = libraries.child_process.exec;
    // var Apio = require("../apio.js")(configuration, false);
    // var Apio = require("../apio.js")(false);
    var Apio = require("../apio.js")();
    var socketClient = libraries["socket.io-client"]("http://localhost:" + Apio.Configuration.http.port, {query: "associate=networking&token=" + Apio.Token.getFromText("networking", fs.readFileSync("./" + Apio.Configuration.type + "_key.apio", "utf8"))});
    var socketServer = libraries["socket.io"](http);
    var spawn = libraries.child_process.spawn;
    var port = 8111;

    // app.use(function (req, res, next) {
    //     res.header("Access-Control-Allow-Origin", "*");
    //     res.header("Access-Control-Allow-Methods", "GET, POST");
    //     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    //     next();
    // });

    app.use(bodyParser.json({
        limit: "50mb"
    }));

    app.use(bodyParser.urlencoded({
        limit: "50mb",
        extended: true
    }));

    app.get("/apio/wifi/ssids", function (req, res) {
        exec("iwlist wlan0 scan | grep ESSID | cut -d ':' -f2", function (error, stdout) {
            if (error) {
                res.status(500).send(error);
            } else {
                stdout = stdout.replace(/"/g, "");
                var arr = stdout.split("\n");
                if (arr[arr.length - 1] === "") {
                    arr.pop();
                }
                res.status(200).send(arr);
            }
        });
    });

    app.get("/apio/wifi/currentSsid", function (req, res) {
        exec("iwgetid -r", function (error, stdout) {
            if (error) {
                res.status(500).send(error);
            } else if (stdout) {
                res.status(200).send(stdout);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/wifi/status", function (req, res) {
        exec("service hostapd status | grep Active | awk '{print $2}'", function (error, stdout) {
            if (error) {
                res.status(500).send(error);
            } else if (stdout.trim() === "active") {
                res.status(200).send("hotspot");
            } else {
                res.status(200).send("client");
            }
        });
    });

    app.get("/apio/3g/status", function (req, res) {
        fs.readFile("/etc/rc.local", "utf8", function (error, content) {
            if (error) {
                res.status(500).send(error);
            } else if (content) {
                content = content.split("\n");
                for (var i = 0, found = false; !found && i < content.length; i++) {
                    if (content[i].indexOf("wvdial") > -1) {
                        found = true;
                        if (content[i][0] === "#") {
                            res.status(200).send("disabled");
                        } else {
                            res.status(200).send("enabled");
                        }
                    }
                }
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/3g/run", function (req, res) {
        exec("ps aux | grep wvdial | awk '{print $2}'", function (error, stdout) {
            if (error) {
                res.status(500).send(error);
            } else if (stdout) {
                stdout = stdout.split("\n");
                stdout.pop();
                if (stdout.length > 2) {
                    res.status(200).send("active");
                } else {
                    res.status(200).send("dead");
                }
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/3g/data", function (req, res) {
        fs.readFile("/etc/wvdial.conf", "utf8", function (error, content) {
            if (error) {
                res.status(500).send(error);
            } else if (content) {
                content = content.split("\n");
                var obj = {};
                for (var i = 0; i < content.length; i++) {
                    if (content[i].indexOf("Init3") > -1) {
                        var arr = content[i].split(",");
                        obj.apn = arr[arr.length - 1].replace(/"/g, "");
                    } else if (content[i].indexOf("Phone") > -1) {
                        var arr = content[i].split("=");
                        obj.number = arr[arr.length - 1].trim();
                    } else if (content[i].indexOf("Username") > -1) {
                        var arr = content[i].split("=");
                        obj.username = arr[arr.length - 1].trim() === "{ }" ? "" : arr[arr.length - 1].trim();
                    } else if (content[i].indexOf("Password") > -1) {
                        var arr = content[i].split("=");
                        obj.password = arr[arr.length - 1].trim() === "{ }" ? "" : arr[arr.length - 1].trim();
                    }
                }

                res.status(200).send(obj);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get("/apio/hotspot/name", function (req, res) {
        exec("cat /etc/hostapd/hostapd.conf | grep ssid | cut -d '=' -f2", function (error, stdout, stderr) {
            if (error || stderr) {
                res.status(500).send(error || stderr);
            } else if (stdout) {
                res.status(200).send(stdout);
            }
        });
    });

    app.post("/apio/wifi/switchStatus", function (req, res) {
        if (req.body.status === "client") {
            fs.readFile("/etc/wpa_supplicant/wpa_supplicant.conf", "utf8", function (err, content) {
                if (err) {
                    res.status(500).send(err);
                } else if (content) {
                    content = content.split("\n");
                    var index = -1;
                    for (var i = 0; index === -1 && i < content.length; i++) {
                        if (content[i].indexOf("network") > -1) {
                            index = i;
                        }
                    }

                    if (index === -1) {
                        content.push("network={");
                        content.push("\tssid=\"" + req.body.ssid + "\"");
                        if (req.body.password) {
                            content.push("\tpsk=\"" + req.body.password + "\"");
                        } else {
                            content.push("\tkey_mgmt=NONE");
                        }
                        content.push("}");
                    } else {
                        content[index + 1] = "\tssid=\"" + req.body.ssid + "\"";
                        if (req.body.password) {
                            content[index + 2] = "\tpsk=\"" + req.body.password + "\"";
                        } else {
                            content[index + 2] = "\tkey_mgmt=NONE";
                        }
                    }

                    fs.writeFile("/etc/wpa_supplicant/wpa_supplicant.conf", content.join("\n"), function (error) {
                        if (error) {
                            res.status(500).send(error);
                        } else {
                            fs.readFile("/etc/network/interfaces", "utf8", function (err, content) {
                                if (err) {
                                    res.status(500).send(err);
                                } else if (content) {
                                    content = content.split("\n");
                                    for (var i = 0; i < content.length; i++) {
                                        if (content[i][0] === "#" && content[i].indexOf("allow-hotplug wlan0") > -1) {
                                            // content[i] = content[i].substr(1);
                                            // content[i + 1] = content[i + 1].substr(1);
                                            // content[i + 2] = content[i + 2].substr(1);
                                            content[i] = content[i].substr(content[i].lastIndexOf("#") + 1);
                                            content[i + 1] = content[i + 1].substr(content[i + 1].lastIndexOf("#") + 1);
                                            content[i + 2] = content[i + 2].substr(content[i + 2].lastIndexOf("#") + 1);
                                        } else if (content[i].indexOf("iface wlan0 inet static") > -1) {
                                            content[i] = "#" + content[i];
                                            content[i + 1] = "#" + content[i + 1];
                                            content[i + 2] = "#" + content[i + 2];
                                            content[i + 4] = "#" + content[i + 4];
                                        }
                                    }

                                    fs.writeFile("/etc/network/interfaces", content.join("\n"), function (error) {
                                        if (error) {
                                            res.status(500).send(error);
                                        } else {
                                            exec("update-rc.d hostapd remove", function (error_) {
                                                if (error_) {
                                                    res.status(500).send(error_);
                                                } else {
                                                    res.sendStatus(200);
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
        } else if (req.body.status === "hotspot") {
            fs.readFile("/etc/network/interfaces", "utf8", function (err, content) {
                if (err) {
                    res.status(500).send(err);
                } else if (content) {
                    content = content.split("\n");
                    for (var i = 0; i < content.length; i++) {
                        if (content[i].indexOf("allow-hotplug wlan0") > -1) {
                            content[i] = "#" + content[i];
                            content[i + 1] = "#" + content[i + 1];
                            content[i + 2] = "#" + content[i + 2];
                        } else if (content[i][0] === "#" && content[i].indexOf("iface wlan0 inet static") > -1) {
                            // content[i] = content[i].substr(1);
                            // content[i + 1] = content[i + 1].substr(1);
                            // content[i + 2] = content[i + 2].substr(1);
                            // content[i + 4] = content[i + 4].substr(1);
                            content[i] = content[i].substr(content[i].lastIndexOf("#") + 1);
                            content[i + 1] = content[i + 1].substr(content[i + 1].lastIndexOf("#") + 1);
                            content[i + 2] = content[i + 2].substr(content[i + 2].lastIndexOf("#") + 1);
                            content[i + 4] = content[i + 4].substr(content[i + 4].lastIndexOf("#") + 1);
                        }
                    }

                    fs.writeFile("/etc/network/interfaces", content.join("\n"), function (error) {
                        if (error) {
                            res.status(500).send(error);
                        } else {
                            exec("update-rc.d hostapd defaults && update-rc.d hostapd enable", function (error_) {
                                if (error_) {
                                    res.status(500).send(error_);
                                } else {
                                    res.sendStatus(200);
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    app.post("/apio/3g/data", function (req, res) {
        fs.readFile("/etc/wvdial.conf", "utf8", function (error, content) {
            if (error) {
                res.status(500).send(error);
            } else if (content) {
                content = content.split("\n");
                for (var i = 0; i < content.length; i++) {
                    if (content[i].indexOf("Init3") > -1) {
                        var arr = content[i].split(",");
                        arr[arr.length - 1] = "\"" + req.body.apn + "\"";
                        content[i] = arr.join(",");
                    } else if (content[i].indexOf("Phone") > -1) {
                        var arr = content[i].split("=");
                        arr[arr.length - 1] = " " + req.body.number;
                        content[i] = arr.join("=");
                    } else if (content[i].indexOf("Username") > -1) {
                        var arr = content[i].split("=");
                        arr[arr.length - 1] = req.body.username === "" ? " { }" : " " + req.body.username;
                        content[i] = arr.join("=");
                    } else if (content[i].indexOf("Password") > -1) {
                        var arr = content[i].split("=");
                        arr[arr.length - 1] = req.body.password === "" ? " { }" : " " + req.body.password;
                        content[i] = arr.join("=");
                    }
                }

                fs.writeFile("/etc/wvdial.conf", content.join("\n"), function (error1) {
                    if (error1) {
                        res.status(500).send(error1);
                    } else {
                        res.sendStatus(200);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/3g/run", function (req, res) {
        if (req.body.start === true) {
            var wvdial = spawn("wvdial", [], {
                detached: true
            });

            var flag = true;
            wvdial.stderr.on("data", function (error) {
                if (flag) {
                    flag = false;
                    res.status(200).send(error);
                }
            });

            wvdial.on("error", function (error) {
                res.status(500).send(error);
            });
        } else {
            exec("pkill wvdial", function (error) {
                if (error && error.killed !== false) {
                    res.status(500).send(error);
                } else {
                    res.sendStatus(200);
                }
            });
        }
    });

    app.post("/apio/3g/restart", function (req, res) {
        exec("pkill wvdial", function (error) {
            if (error && error.killed !== false) {
                res.status(500).send(error);
            } else {
                var wvdial = spawn("wvdial", [], {
                    detached: true
                });

                var flag = true;
                wvdial.stderr.on("data", function (error) {
                    if (flag) {
                        flag = false;
                        res.status(200).send(error);
                    }
                });

                wvdial.on("error", function (error) {
                    res.status(500).send(error);
                });
            }
        });
    });

    app.post("/apio/3g/status", function (req, res) {
        fs.readFile("/etc/rc.local", "utf8", function (error, content) {
            if (error) {
                res.status(500).send(error);
            } else if (content) {
                content = content.split("\n");
                for (var i = 0, found = false; !found && i < content.length; i++) {
                    if (content[i].indexOf("wvdial") > -1) {
                        found = true;
                        if (content[i][0] === "#") {
                            content[i] = content[i].substr(1);
                        } else {
                            content[i] = "#" + content[i];
                        }
                    }
                }

                fs.writeFile("/etc/rc.local", content.join("\n"), function (error1) {
                    if (error1) {
                        res.status(500).send(error1);
                    } else {
                        res.sendStatus(200);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.post("/apio/hotspot/name", function (req, res) {
        fs.readFile("/etc/hostapd/hostapd.conf", "utf8", function (err, content) {
            if (err) {
                res.status(500).send(err);
            } else if (content) {
                content = content.split("\n");
                for (var i = 0, found = false; !found && i < content.length; i++) {
                    if (content[i].indexOf("ssid=") > -1) {
                        found = true;
                        content[i] = "ssid=" + req.body.hotspot;
                    }
                }

                fs.writeFile("/etc/hostapd/hostapd.conf", content.join("\n"), function (error) {
                    if (error) {
                        res.status(500).send(error);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        });
    });

    socketServer.on("connection", function (Socket) {
        Socket.on("apio_wifi_switchStatus", function (data) {
            if (data.status === "client") {
                fs.readFile("/etc/wpa_supplicant/wpa_supplicant.conf", "utf8", function (err, content) {
                    if (err) {
                        // socketServer.emit("send_to_client", {
                        //     data: err,
                        //     message: "apio_wifi_switchStatus_error"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: err
                            },
                            message: "apio_wifi_switchStatus_error"
                        });
                    } else if (content) {
                        content = content.split("\n");
                        var index = -1;
                        for (var i = 0; index === -1 && i < content.length; i++) {
                            if (content[i].indexOf("network") > -1) {
                                index = i;
                            }
                        }

                        if (index === -1) {
                            content.push("network={");
                            content.push("\tssid=\"" + data.ssid + "\"");
                            if (data.password) {
                                content.push("\tpsk=\"" + data.password + "\"");
                            } else {
                                content.push("\tkey_mgmt=NONE");
                            }
                            content.push("}");
                        } else {
                            content[index + 1] = "\tssid=\"" + data.ssid + "\"";
                            if (data.password) {
                                content[index + 2] = "\tpsk=\"" + data.password + "\"";
                            } else {
                                content[index + 2] = "\tkey_mgmt=NONE";
                            }
                        }

                        fs.writeFile("/etc/wpa_supplicant/wpa_supplicant.conf", content.join("\n"), function (error) {
                            if (error) {
                                // socketServer.emit("send_to_client", {
                                //     data: error,
                                //     message: "apio_wifi_switchStatus_error"
                                // });

                                Apio.Remote.socket.emit("send_to_client", {
                                    who: "networking",
                                    data: {
                                        apioId: Apio.System.getApioIdentifier(),
                                        data: error
                                    },
                                    message: "apio_wifi_switchStatus_error"
                                });
                            } else {
                                fs.readFile("/etc/network/interfaces", "utf8", function (err, content) {
                                    if (err) {
                                        // socketServer.emit("send_to_client", {
                                        //     data: err,
                                        //     message: "apio_wifi_switchStatus_error"
                                        // });

                                        Apio.Remote.socket.emit("send_to_client", {
                                            who: "networking",
                                            data: {
                                                apioId: Apio.System.getApioIdentifier(),
                                                data: err
                                            },
                                            message: "apio_wifi_switchStatus_error"
                                        });
                                    } else if (content) {
                                        content = content.split("\n");
                                        for (var i = 0; i < content.length; i++) {
                                            if (content[i][0] === "#" && content[i].indexOf("allow-hotplug wlan0") > -1) {
                                                content[i] = content[i].substr(content[i].lastIndexOf("#") + 1);
                                                content[i + 1] = content[i + 1].substr(content[i + 1].lastIndexOf("#") + 1);
                                                content[i + 2] = content[i + 2].substr(content[i + 2].lastIndexOf("#") + 1);
                                            } else if (content[i].indexOf("iface wlan0 inet static") > -1) {
                                                content[i] = "#" + content[i];
                                                content[i + 1] = "#" + content[i + 1];
                                                content[i + 2] = "#" + content[i + 2];
                                                content[i + 4] = "#" + content[i + 4];
                                            }
                                        }

                                        fs.writeFile("/etc/network/interfaces", content.join("\n"), function (error) {
                                            if (error) {
                                                // socketServer.emit("send_to_client", {
                                                //     data: error,
                                                //     message: "apio_wifi_switchStatus_error"
                                                // });

                                                Apio.Remote.socket.emit("send_to_client", {
                                                    who: "networking",
                                                    data: {
                                                        apioId: Apio.System.getApioIdentifier(),
                                                        data: error
                                                    },
                                                    message: "apio_wifi_switchStatus_error"
                                                });
                                            } else {
                                                exec("update-rc.d hostapd remove", function (error_) {
                                                    if (error_) {
                                                        // socketServer.emit("send_to_client", {
                                                        //     data: error_,
                                                        //     message: "apio_wifi_switchStatus_error"
                                                        // });

                                                        Apio.Remote.socket.emit("send_to_client", {
                                                            who: "networking",
                                                            data: {
                                                                apioId: Apio.System.getApioIdentifier(),
                                                                data: error_
                                                            },
                                                            message: "apio_wifi_switchStatus_error"
                                                        });
                                                    } else {
                                                        // socketServer.emit("send_to_client", {
                                                        //     message: "apio_wifi_switchStatus_ok"
                                                        // });

                                                        Apio.Remote.socket.emit("send_to_client", {
                                                            who: "networking",
                                                            data: {
                                                                apioId: Apio.System.getApioIdentifier()
                                                            },
                                                            message: "apio_wifi_switchStatus_ok"
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
            } else if (data.status === "hotspot") {
                fs.readFile("/etc/network/interfaces", "utf8", function (err, content) {
                    if (err) {
                        // socketServer.emit("send_to_client", {
                        //     data: err,
                        //     message: "apio_wifi_switchStatus_error"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: err
                            },
                            message: "apio_wifi_switchStatus_error"
                        });
                    } else if (content) {
                        content = content.split("\n");
                        for (var i = 0; i < content.length; i++) {
                            if (content[i].indexOf("allow-hotplug wlan0") > -1) {
                                content[i] = "#" + content[i];
                                content[i + 1] = "#" + content[i + 1];
                                content[i + 2] = "#" + content[i + 2];
                            } else if (content[i][0] === "#" && content[i].indexOf("iface wlan0 inet static") > -1) {
                                content[i] = content[i].substr(content[i].lastIndexOf("#") + 1);
                                content[i + 1] = content[i + 1].substr(content[i + 1].lastIndexOf("#") + 1);
                                content[i + 2] = content[i + 2].substr(content[i + 2].lastIndexOf("#") + 1);
                                content[i + 4] = content[i + 4].substr(content[i + 4].lastIndexOf("#") + 1);
                            }
                        }

                        fs.writeFile("/etc/network/interfaces", content.join("\n"), function (error) {
                            if (error) {
                                // socketServer.emit("send_to_client", {
                                //     data: error,
                                //     message: "apio_wifi_switchStatus_error"
                                // });

                                Apio.Remote.socket.emit("send_to_client", {
                                    who: "networking",
                                    data: {
                                        apioId: Apio.System.getApioIdentifier(),
                                        data: error
                                    },
                                    message: "apio_wifi_switchStatus_error"
                                });
                            } else {
                                exec("update-rc.d hostapd defaults && update-rc.d hostapd enable", function (error_) {
                                    if (error_) {
                                        // socketServer.emit("send_to_client", {
                                        //     data: error_,
                                        //     message: "apio_wifi_switchStatus_error"
                                        // });

                                        Apio.Remote.socket.emit("send_to_client", {
                                            who: "networking",
                                            data: {
                                                apioId: Apio.System.getApioIdentifier(),
                                                data: error_
                                            },
                                            message: "apio_wifi_switchStatus_error"
                                        });
                                    } else {
                                        // socketServer.emit("send_to_client", {
                                        //     data: err,
                                        //     message: "apio_wifi_switchStatus_ok"
                                        // });

                                        Apio.Remote.socket.emit("send_to_client", {
                                            who: "networking",
                                            data: {
                                                apioId: Apio.System.getApioIdentifier()
                                            },
                                            message: "apio_wifi_switchStatus_ok"
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        Socket.on("apio_3g_data", function (data) {
            fs.readFile("/etc/wvdial.conf", "utf8", function (error, content) {
                if (error) {
                    // socketServer.emit("send_to_client", {
                    //     data: error,
                    //     message: "apio_3g_data_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: error
                        },
                        message: "apio_3g_data_error"
                    });
                } else if (content) {
                    content = content.split("\n");
                    for (var i = 0; i < content.length; i++) {
                        if (content[i].indexOf("Init3") > -1) {
                            var arr = content[i].split(",");
                            arr[arr.length - 1] = "\"" + data.apn + "\"";
                            content[i] = arr.join(",");
                        } else if (content[i].indexOf("Phone") > -1) {
                            var arr = content[i].split("=");
                            arr[arr.length - 1] = " " + data.number;
                            content[i] = arr.join("=");
                        } else if (content[i].indexOf("Username") > -1) {
                            var arr = content[i].split("=");
                            arr[arr.length - 1] = data.username === "" ? " { }" : " " + data.username;
                            content[i] = arr.join("=");
                        } else if (content[i].indexOf("Password") > -1) {
                            var arr = content[i].split("=");
                            arr[arr.length - 1] = data.password === "" ? " { }" : " " + data.password;
                            content[i] = arr.join("=");
                        }
                    }

                    fs.writeFile("/etc/wvdial.conf", content.join("\n"), function (error1) {
                        if (error1) {
                            // socketServer.emit("send_to_client", {
                            //     data: error1,
                            //     message: "apio_3g_data_error"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier(),
                                    data: error1
                                },
                                message: "apio_3g_data_error"
                            });
                        } else {
                            // socketServer.emit("send_to_client", {
                            //     message: "apio_3g_data_ok"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier()
                                },
                                message: "apio_3g_data_ok"
                            });
                        }
                    });
                } else {
                    // socketServer.emit("send_to_client", {
                    //     message: "apio_3g_data_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier()
                        },
                        message: "apio_3g_data_error"
                    });
                }
            });
        });

        Socket.on("apio_3g_restart", function () {
            exec("pkill wvdial", function (error) {
                if (error && error.killed !== false) {
                    // socketServer.emit("send_to_client", {
                    //     data: error,
                    //     message: "apio_3g_restart_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: error
                        },
                        message: "apio_3g_data_error"
                    });
                } else {
                    var wvdial = spawn("wvdial", [], {
                        detached: true
                    });

                    var flag = true;
                    wvdial.stderr.on("data", function (error) {
                        if (flag) {
                            flag = false;
                            // socketServer.emit("send_to_client", {
                            //     data: error,
                            //     message: "apio_3g_restart_ok"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier(),
                                    data: error
                                },
                                message: "apio_3g_restart_ok"
                            });
                        }
                    });

                    // socketServer.emit("send_to_client", {
                    //     message: "apio_3g_restart_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier()
                        },
                        message: "apio_3g_data_error"
                    });
                }
            });
        });

        Socket.on("apio_3g_get_run", function (data) {
            exec("ps aux | grep wvdial | awk '{print $2}'", function (error, stdout) {
                if (error) {
                    // socketServer.emit("send_to_client", {
                    //     data: error,
                    //     message: "apio_3g_get_run_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: error
                        },
                        message: "apio_3g_get_run_error"
                    });
                } else if (stdout) {
                    stdout = stdout.split("\n");
                    stdout.pop();
                    if (stdout.length > 2) {
                        // socketServer.emit("send_to_client", {
                        //     data: "active",
                        //     message: "apio_3g_get_run_ok"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: "active"
                            },
                            message: "apio_3g_get_run_ok"
                        });
                    } else {
                        // socketServer.emit("send_to_client", {
                        //     data: "dead",
                        //     message: "apio_3g_get_run_ok"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: "dead"
                            },
                            message: "apio_3g_get_run_ok"
                        });
                    }
                } else {
                    // socketServer.emit("send_to_client", {
                    //     message: "apio_3g_get_run_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier()
                        },
                        message: "apio_3g_get_run_error"
                    });
                }
            });
        });

        Socket.on("apio_3g_set_run", function (data) {
            if (data.start === true) {
                var wvdial = spawn("wvdial", [], {
                    detached: true
                });

                var flag = true;
                wvdial.stderr.on("data", function (error) {
                    if (flag) {
                        flag = false;
                        // socketServer.emit("send_to_client", {
                        //     data: error,
                        //     message: "apio_3g_set_run_ok"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: error
                            },
                            message: "apio_3g_set_run_ok"
                        });
                    }
                });

                wvdial.on("error", function (error) {
                    // socketServer.emit("send_to_client", {
                    //     data: error,
                    //     message: "apio_3g_set_run_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: error
                        },
                        message: "apio_3g_set_run_error"
                    });
                });
            } else {
                exec("pkill wvdial", function (error) {
                    if (error && error.killed !== false) {
                        // socketServer.emit("send_to_client", {
                        //     data: error,
                        //     message: "apio_3g_set_run_error"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier(),
                                data: error
                            },
                            message: "apio_3g_set_run_error"
                        });
                    } else {
                        // socketServer.emit("send_to_client", {
                        //     message: "apio_3g_set_run_ok"
                        // });

                        Apio.Remote.socket.emit("send_to_client", {
                            who: "networking",
                            data: {
                                apioId: Apio.System.getApioIdentifier()
                            },
                            message: "apio_3g_set_run_ok"
                        });
                    }
                });
            }
        });

        Socket.on("apio_3g_status", function () {
            fs.readFile("/etc/rc.local", "utf8", function (error, content) {
                if (error) {
                    // socketServer.emit("send_to_client", {
                    //     data: error,
                    //     message: "apio_3g_status_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: error
                        },
                        message: "apio_3g_status_error"
                    });
                } else if (content) {
                    content = content.split("\n");
                    for (var i = 0, found = false; !found && i < content.length; i++) {
                        if (content[i].indexOf("wvdial") > -1) {
                            found = true;
                            if (content[i][0] === "#") {
                                content[i] = content[i].substr(1);
                            } else {
                                content[i] = "#" + content[i];
                            }
                        }
                    }

                    fs.writeFile("/etc/rc.local", content.join("\n"), function (error1) {
                        if (error1) {
                            // socketServer.emit("send_to_client", {
                            //     data: error1,
                            //     message: "apio_3g_status_error"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier(),
                                    data: error1
                                },
                                message: "apio_3g_status_error"
                            });
                        } else {
                            // socketServer.emit("send_to_client", {
                            //     message: "apio_3g_status_ok"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier()
                                },
                                message: "apio_3g_status_ok"
                            });
                        }
                    });
                } else {
                    // socketServer.emit("send_to_client", {
                    //     message: "apio_3g_status_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier()
                        },
                        message: "apio_3g_status_error"
                    });
                }
            });
        });

        Socket.on("apio_hotspot_name", function (data) {
            fs.readFile("/etc/hostapd/hostapd.conf", "utf8", function (err, content) {
                if (err) {
                    // socketServer.emit("send_to_client", {
                    //     data: err,
                    //     message: "apio_hotspot_name_error"
                    // });

                    Apio.Remote.socket.emit("send_to_client", {
                        who: "networking",
                        data: {
                            apioId: Apio.System.getApioIdentifier(),
                            data: err
                        },
                        message: "apio_hotspot_name_error"
                    });
                } else if (content) {
                    content = content.split("\n");
                    for (var i = 0, found = false; !found && i < content.length; i++) {
                        if (content[i].indexOf("ssid=") > -1) {
                            found = true;
                            content[i] = "ssid=" + data.hotspot;
                        }
                    }

                    fs.writeFile("/etc/hostapd/hostapd.conf", content.join("\n"), function (error) {
                        if (error) {
                            // socketServer.emit("send_to_client", {
                            //     data: error,
                            //     message: "apio_hotspot_name_error"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier(),
                                    data: error
                                },
                                message: "apio_hotspot_name_error"
                            });
                        } else {
                            // socketServer.emit("send_to_client", {
                            //     message: "apio_hotspot_name_ok"
                            // });

                            Apio.Remote.socket.emit("send_to_client", {
                                who: "networking",
                                data: {
                                    apioId: Apio.System.getApioIdentifier()
                                },
                                message: "apio_hotspot_name_ok"
                            });
                        }
                    });
                }
            });
        });
    });

    http.listen(port, "localhost", function () {
    // http.listen(port, function () {
        console.log("Service networking correctly started on port " + port);

        var gc = require("./garbage_collector.js");
        gc();

        Apio.Database.connect(function () {
            console.log("Successfully connected to the DB");
            Apio.Database.db.collection("Services").findOne({name: "networking"}, function (error, service) {
                if (error) {
                    console.log("Error while getting service Networking: ", error);
                } else if (service) {
                    console.log("Service Networking exists");
                } else {
                    console.log("Unable to find service Networking");
                    Apio.Database.db.collection("Services").insert({
                        name: "networking",
                        show: "Networking",
                        url: "https://github.com/ApioLab/Apio-Services",
                        username: "",
                        password: "",
                        port: String(port)
                    }, function (err) {
                        if (err) {
                            console.log("Error while creating service Networking on DB: ", err);
                        } else {
                            console.log("Service Networking successfully created");
                        }
                    });
                }
            });
        }, false);
    });
};