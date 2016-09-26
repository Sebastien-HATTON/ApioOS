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
var bodyParser = require("body-parser");
var express = require("express");
var fs = require("fs");
var app = express();
var http = require("http").Server(app);
// var configuration = require("../configuration/default.js");
// var Apio = require("../apio.js")(configuration, false);
var Apio = require("../apio.js")(false);
var request = require("request");
var socketClient = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=networking&token=" + Apio.Token.getFromText("networking", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});
var socketServer = require("socket.io")(http);
var port = 8111;

app.use(function (req, res, next) {
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

app.get("/apio/wifi/ssids", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_wifi_ssids", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_wifi_ssids", function (data) {
    //     req.resume();
    //     res.status(data instanceof Array ? 200 : 500).send(data);
    //     socketClient.off("get_wifi_ssids");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(data.data instanceof Array ? 200 : 500).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_wifi_ssids", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_wifi_ssids", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_wifi_ssids", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_wifi_ssids", fn);
    });

    socketClient.on("get_wifi_ssids", fn);
});

app.get("/apio/wifi/currentSsid", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_wifi_currentSsid", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_wifi_currentSsid", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(typeof data === "string" ? 200 : 500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("get_wifi_currentSsid");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(typeof data.data === "string" ? 200 : 500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_wifi_currentSsid", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_wifi_currentSsid", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_wifi_currentSsid", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_wifi_currentSsid", fn);
    });

    socketClient.on("get_wifi_currentSsid", fn);
});

app.get("/apio/wifi/status", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_wifi_status", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_wifi_status", function (data) {
    //     req.resume();
    //     res.status(typeof data === "string" ? 200 : 500).send(data);
    //     socketClient.off("get_wifi_status");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(typeof data.data === "string" ? 200 : 500).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_wifi_status", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_wifi_status", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_wifi_status", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_wifi_status", fn);
    });

    socketClient.on("get_wifi_status", fn);
});

app.get("/apio/3g/status", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_3g_status", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_3g_status", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(typeof data === "string" ? 200 : 500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("get_3g_status");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(typeof data.data === "string" ? 200 : 500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_3g_status", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_3g_status", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_3g_status", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_3g_status", fn);
    });

    socketClient.on("get_3g_status", fn);
});

app.get("/apio/3g/data", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_3g_data", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_3g_data", function (data) {
    //     req.resume();
    //     if (data) {
    //         if (data.hasOwnProperty("apn") && data.hasOwnProperty("number") && data.hasOwnProperty("username") && data.hasOwnProperty("password")) {
    //             res.status(200).send(data);
    //         } else {
    //             res.status(500).send(data);
    //         }
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("get_3g_data");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                if (data.data.hasOwnProperty("apn") && data.data.hasOwnProperty("number") && data.data.hasOwnProperty("username") && data.data.hasOwnProperty("password")) {
                    res.status(200).send(data.data);
                } else {
                    res.status(500).send(data.data);
                }
            } else {
                res.sendStatus(404);
            }
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_3g_data", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_3g_data", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_3g_data", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_3g_data", fn);
    });

    socketClient.on("get_3g_data", fn);
});

app.get("/apio/3g/run", function (req, res) {
    socketServer.emit("send_to_client_service", {
        // apioId: req.body.apioId,
        apioId: req.query.apioId,
        message: "apio_3g_get_run",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_3g_get_run_ok", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socketClient.off("apio_3g_get_run_ok");
    //     socketClient.off("apio_3g_get_run_error");
    // });
    //
    // socketClient.on("apio_3g_get_run_error", function (data) {
    //     req.resume();
    //     res.status(500).send(data);
    //     socketClient.off("apio_3g_get_run_ok");
    //     socketClient.off("apio_3g_get_run_error");
    // });

    var fn_error = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(500).send(data.data);
        }
    };

    var fn_ok = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_3g_get_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_get_run_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_3g_get_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_get_run_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_3g_get_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_get_run_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_3g_get_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_get_run_error", fn_error);
    });

    socketClient.on("apio_3g_get_run_ok", fn_ok);
    socketClient.on("apio_3g_get_run_error", fn_error);
});

app.get("/apio/hotspot/name", function (req, res) {
    socketServer.emit("send_to_client", {message: "ask_hotspot_name", who: req.query.apioId});
    req.pause();
    // socketClient.on("get_hotspot_name", function (data) {
    //     req.resume();
    //     res.status(typeof data === "string" ? 200 : 500).send(data);
    //     socketClient.off("get_hotspot_name");
    // });

    var fn = function (data) {
        if (req.query.apioId === data.apioId) {
            req.resume();
            res.status(typeof data.data === "string" ? 200 : 500).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("get_hotspot_name", fn);
    });

    req.on("end", function() {
        socketClient.removeListener("get_hotspot_name", fn);
    });

    req.on("timeout", function() {
        socketClient.removeListener("get_hotspot_name", fn);
    });

    req.on("error", function() {
        socketClient.removeListener("get_hotspot_name", fn);
    });

    socketClient.on("get_hotspot_name", fn);
});

app.post("/apio/wifi/switchStatus", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: req.body,
        message: "apio_wifi_switchStatus",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_wifi_switchStatus_ok", function () {
    //     req.resume();
    //     res.sendStatus(200);
    //     socketClient.off("apio_wifi_switchStatus_ok");
    //     socketClient.off("apio_wifi_switchStatus_error");
    // });
    //
    // socketClient.on("apio_wifi_switchStatus_error", function (data) {
    //     req.resume();
    //     res.status(500).send(data);
    //     socketClient.off("apio_wifi_switchStatus_ok");
    //     socketClient.off("apio_wifi_switchStatus_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.status(500).send(data.data);
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.sendStatus(200);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_wifi_switchStatus_ok", fn_ok);
        socketClient.removeListener("apio_wifi_switchStatus_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_wifi_switchStatus_ok", fn_ok);
        socketClient.removeListener("apio_wifi_switchStatus_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_wifi_switchStatus_ok", fn_ok);
        socketClient.removeListener("apio_wifi_switchStatus_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_wifi_switchStatus_ok", fn_ok);
        socketClient.removeListener("apio_wifi_switchStatus_error", fn_error);
    });

    socketClient.on("apio_wifi_switchStatus_ok", fn_ok);
    socketClient.on("apio_wifi_switchStatus_error", fn_error);
});

app.post("/apio/3g/data", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: req.body,
        message: "apio_3g_data",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_3g_data_ok", function () {
    //     req.resume();
    //     res.sendStatus(200);
    //     socketClient.off("apio_3g_data_ok");
    //     socketClient.off("apio_3g_data_error");
    // });
    //
    // socketClient.on("apio_3g_data_error", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("apio_3g_data_ok");
    //     socketClient.off("apio_3g_data_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.sendStatus(200);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_3g_data_ok", fn_ok);
        socketClient.removeListener("apio_3g_data_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_3g_data_ok", fn_ok);
        socketClient.removeListener("apio_3g_data_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_3g_data_ok", fn_ok);
        socketClient.removeListener("apio_3g_data_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_3g_data_ok", fn_ok);
        socketClient.removeListener("apio_3g_data_error", fn_error);
    });

    socketClient.on("apio_3g_data_ok", fn_ok);
    socketClient.on("apio_3g_data_error", fn_error);
});

app.post("/apio/3g/restart", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        message: "apio_3g_restart",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_3g_restart_ok", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socketClient.off("apio_3g_restart_ok");
    //     socketClient.off("apio_3g_restart_error");
    // });
    //
    // socketClient.on("apio_3g_restart_error", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("apio_3g_restart_ok");
    //     socketClient.off("apio_3g_restart_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_3g_restart_ok", fn_ok);
        socketClient.removeListener("apio_3g_restart_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_3g_restart_ok", fn_ok);
        socketClient.removeListener("apio_3g_restart_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_3g_restart_ok", fn_ok);
        socketClient.removeListener("apio_3g_restart_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_3g_restart_ok", fn_ok);
        socketClient.removeListener("apio_3g_restart_error", fn_error);
    });

    socketClient.on("apio_3g_restart_ok", fn_ok);
    socketClient.on("apio_3g_restart_error", fn_error);
});

app.post("/apio/3g/run", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: req.body,
        message: "apio_3g_set_run",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_3g_set_run_ok", function (data) {
    //     req.resume();
    //     res.status(200).send(data);
    //     socketClient.off("apio_3g_set_run_ok");
    //     socketClient.off("apio_3g_set_run_error");
    // });
    //
    // socketClient.on("apio_3g_set_run_error", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("apio_3g_set_run_ok");
    //     socketClient.off("apio_3g_set_runt_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.status(200).send(data.data);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_3g_set_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_set_runt_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_3g_set_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_set_runt_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_3g_set_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_set_runt_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_3g_set_run_ok", fn_ok);
        socketClient.removeListener("apio_3g_set_runt_error", fn_error);
    });

    socketClient.on("apio_3g_set_run_ok", fn_ok);
    socketClient.on("apio_3g_set_runt_error", fn_error);
});

app.post("/apio/3g/status", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: req.body,
        message: "apio_3g_status",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_3g_status_ok", function () {
    //     req.resume();
    //     res.sendStatus(200);
    //     socketClient.off("apio_3g_status_ok");
    //     socketClient.off("apio_3g_status_error");
    // });
    //
    // socketClient.on("apio_3g_status_error", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("apio_3g_status_ok");
    //     socketClient.off("apio_3g_status_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.sendStatus(200);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_3g_status_ok", fn_ok);
        socketClient.removeListener("apio_3g_status_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_3g_status_ok", fn_ok);
        socketClient.removeListener("apio_3g_status_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_3g_status_ok", fn_ok);
        socketClient.removeListener("apio_3g_status_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_3g_status_ok", fn_ok);
        socketClient.removeListener("apio_3g_status_error", fn_error);
    });

    socketClient.on("apio_3g_status_ok", fn_ok);
    socketClient.on("apio_3g_status_error", fn_error);
});

app.post("/apio/hotspot/name", function (req, res) {
    socketServer.emit("send_to_client_service", {
        apioId: req.body.apioId,
        data: req.body,
        message: "apio_hotspot_name",
        service: "networking"
    });
    req.pause();

    // socketClient.on("apio_hotspot_name_ok", function () {
    //     req.resume();
    //     res.sendStatus(200);
    //     socketClient.off("apio_hotspot_name_ok");
    //     socketClient.off("apio_hotspot_name_error");
    // });
    //
    // socketClient.on("apio_hotspot_name_error", function (data) {
    //     req.resume();
    //     if (data) {
    //         res.status(500).send(data);
    //     } else {
    //         res.sendStatus(404);
    //     }
    //     socketClient.off("apio_hotspot_name_ok");
    //     socketClient.off("apio_hotspot_name_error");
    // });

    var fn_error = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            if (data.data) {
                res.status(500).send(data.data);
            } else {
                res.sendStatus(404);
            }
        }
    };

    var fn_ok = function (data) {
        if (req.body.apioId === data.apioId) {
            req.resume();
            res.sendStatus(200);
        }
    };

    req.on("close", function() {
        socketClient.removeListener("apio_hotspot_name_ok", fn_ok);
        socketClient.removeListener("apio_hotspot_name_error", fn_error);
    });

    req.on("end", function() {
        socketClient.removeListener("apio_hotspot_name_ok", fn_ok);
        socketClient.removeListener("apio_hotspot_name_error", fn_error);
    });

    req.on("timeout", function() {
        socketClient.removeListener("apio_hotspot_name_ok", fn_ok);
        socketClient.removeListener("apio_hotspot_name_error", fn_error);
    });

    req.on("error", function() {
        socketClient.removeListener("apio_hotspot_name_ok", fn_ok);
        socketClient.removeListener("apio_hotspot_name_error", fn_error);
    });

    socketClient.on("apio_hotspot_name_ok", fn_ok);
    socketClient.on("apio_hotspot_name_error", fn_error);
});

http.listen(port, "localhost", function () {
// http.listen(port, function () {
    console.log("Service networking correctly started on port " + port);
    Apio.Database.connect(function () {
        console.log("Successfully connected to the DB");
    }, false);
});