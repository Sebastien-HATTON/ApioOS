module.exports = function (Apio) {
    return {
        getSocketConnection: function (req, res) {
            if (req.session.apioId === "Continue to Cloud") {
                res.status(200).send(true);
            } else {
                var index = Apio.syncedBoards.indexOf(req.session.apioId);
                if (index > -1) {
                    var socketIds = Apio.connectedSockets[req.session.apioId];
                    if (socketIds) {
                        res.status(200).send(Apio.io.sockets.connected[socketIds[socketIds.length - 1]].connected === true && Apio.io.sockets.connected[socketIds[socketIds.length - 1]].disconnected === false);
                    } else {
                        res.status(200).send(false);
                    }
                } else {
                    res.status(200).send(false);
                }
            }
        },
        change: function (req, res) {
            console.log(req.body.id);
            req.session.apioId = req.body.id;
            Apio.Database.db.collection("Users").findOne({email: req.session.email}, function (err, user) {
                if (err) {
                    res.status(500).send(err);
                } else if (user) {
                    if (req.session.email === "info@apio.cc") {
                        req.session.priviligies = "superAdmin";
                    } else {
                        for (var i = 0, found = false; !found && i < user.apioId.length; i++) {
                            if (user.apioId[i].code === req.session.apioId) {
                                req.session.priviligies = user.apioId[i].role;
                                found = true;
                            }
                        }
                    }

                    res.status(200).send();
                } else {
                    res.sendStatus(404);
                }
            });
        },
        getDetails: function (req, res) {
            var arr = req.params.boardsArr.split(",");
            var queryArr = [];
            for (var i in arr) {
                queryArr.push({apioId: arr[i]});
            }
            Apio.Database.db.collection("systems").find({$or: queryArr}).toArray(function (err, data) {
                if (err) {
                    res.status(500).send(err);
                } else if (data) {
                    res.status(200).send(data);
                } else {
                    res.sendStatus(404);
                }
            });
        },
        setName: function (req, res) {
            console.log(req.body);
            Apio.Database.db.collection("systems").findAndModify({apioId: req.body.apioId}, {}, {$set: {name: req.body.name}}, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else if (result) {
                    res.sendStatus(200);
                } else {
                    res.sendStatus(404);
                }
            });
        },
        show: function (req, res) {
            Apio.Database.db.collection("systems").find().toArray(function (err, result) {
                if (err) {
                    res.status(500).send();
                } else if (result) {
                    res.status(200).send(result);
                } else {
                    res.status(404).send();
                }
            });
        }
    }
};