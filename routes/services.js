var request = require("request");
module.exports = function (Apio) {
    return {
        getAll: function (req, res) {
            Apio.Database.db.collection("Services").find().toArray(function (error, services) {
                if (error) {
                    res.status(500).send(err);
                } else if (services) {
                    res.status(200).send(services);
                } else {
                    res.status(404);
                }
            });
        },
        getRequest: function (req, res) {
            Apio.Database.db.collection("Services").findOne({name: req.params.service}, function (err, service) {
                if (err) {
                    res.status(500).send(err);
                } else if (service) {
                    var route = "http://localhost:" + service.port;
                    var serviceRoute = decodeURIComponent(req.params.route);
                    if (serviceRoute[0] !== "/") {
                        route += "/";
                    }

                    if (req.hasOwnProperty("session") && req.session.hasOwnProperty("apioId")) {
                        if (serviceRoute.indexOf("?") > -1) {
                            serviceRoute += "&apioId=" + req.session.apioId;
                        } else {
                            serviceRoute += "?apioId=" + req.session.apioId;
                        }
                    }

                    route += serviceRoute;
                    request({
                        json: true,
                        method: "GET",
                        uri: route
                    }, function (error, response, body) {
                        if (response) {
                            if (Number(response.statusCode) === 200) {
                                if (body !== undefined) {
                                    res.status(200).send(body);
                                } else {
                                    res.sendStatus(200);
                                }
                            } else if (Number(response.statusCode) === 404) {
                                res.sendStatus(404);
                            } else if (Number(response.statusCode) === 500) {
                                res.status(500).send(error || body);
                            }
                        } else {
                            res.sendStatus(404);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        },
        postRequest: function (req, res) {
            console.log("----------------SENDING REQUEST WITH PARAMETERS: -------------", req.params);
            Apio.Database.db.collection("Services").findOne({name: req.params.service}, function (err, service) {
                if (err) {
                    res.status(500).send(err);
                } else if (service) {
                    var route = "http://localhost:" + service.port;
                    var serviceRoute = decodeURIComponent(req.params.route);
                    if (serviceRoute[0] !== "/") {
                        route += "/";
                    }

                    var body = JSON.parse(decodeURIComponent(req.params.data));
                    if (req.hasOwnProperty("session") && req.session.hasOwnProperty("apioId")) {
                        body.apioId = req.session.apioId;
                    }
                    route += serviceRoute;
                    console.log("route: ", route);
                    request({
                        //body: JSON.parse(decodeURIComponent(req.params.data)),
                        body: body,
                        json: true,
                        method: "POST",
                        uri: route
                    }, function (error, response, body) {
                        console.log("-------------- ROUTE OF SERVICE HAS BEEN CALLED, REPONSES: --------------");
                        console.log("error: ", error);
                        console.log("response: ", response);
                        console.log("body: ", body);
                        if (response) {
                            if (Number(response.statusCode) === 200) {
                                if (body !== undefined) {
                                    res.status(200).send(body);
                                } else {
                                    res.sendStatus(200);
                                }
                            } else if (Number(response.statusCode) === 404) {
                                res.sendStatus(404);
                            } else if (Number(response.statusCode) === 500) {
                                res.status(500).send(error || body);
                            }
                        } else {
                            res.sendStatus(404);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            });
        }
    };
};