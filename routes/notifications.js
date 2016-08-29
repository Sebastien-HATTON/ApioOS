module.exports = function (Apio) {
    return {
        create: function (req, res) {
        },
        list: function (req, res) {
            var currentUser = req.params.user;

            Apio.Database.db.collection("Users").findOne({email: currentUser}, function (err, doc) {
                if (err) {
                    console.log("Error: ", err);
                    res.sendStatus(500);
                } else {
                    Apio.Database.db.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                        if (error) {
                            res.sendStatus(500);
                        } else if (services) {
                            for (var i in doc.unread_notifications) {
                                if (doc.unread_notifications[i].properties instanceof Object) {
                                    var key = Object.keys(doc.unread_notifications[i].properties);
                                    var dateIndex = key.indexOf("date");
                                    if (dateIndex > -1) {
                                        key.splice(dateIndex, 1);
                                    }

                                    if (key.length) {
                                        key = key[0];

                                        for (var j in services) {

                                            var toSet = false;

                                            if (services[j].data.hasOwnProperty(doc.unread_notifications[i].objectId)) {
                                                for (var k in services[j].data[doc.unread_notifications[i].objectId].properties[key]) {
                                                    if (doc.unread_notifications[i].properties[key] === services[j].data[doc.unread_notifications[i].objectId].properties[key][k].value) {
                                                        for (var l in services[j].data[doc.unread_notifications[i].objectId].properties[key][k].users) {
                                                            if (doc.unread_notifications[i].objectName + ": " + services[j].data[doc.unread_notifications[i].objectId].properties[key][k].users[l].message === doc.unread_notifications[i].message && currentUser === services[j].data[doc.unread_notifications[i].objectId].properties[key][k].users[l].email) {
                                                                for (var x in services[j].data[doc.unread_notifications[i].objectId].properties[key][k].users[l].sendTo) {
                                                                    if (services[j].data[doc.unread_notifications[i].objectId].properties[key][k].users[l].sendTo[x].enabled === true) {
                                                                        toSet = true;
                                                                        break;
                                                                    }
                                                                }
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }

                                                doc.unread_notifications[i]["send" + (services[j].show ? services[j].show : services[j].name)] = toSet;
                                            }
                                        }
                                    } else {
                                        for (var j in services) {

                                            var toSet = false;

                                            if (services[j].data.hasOwnProperty(doc.unread_notifications[i].objectId)) {
                                                for (var k in services[j].data[doc.unread_notifications[i].objectId].properties.hi) {
                                                    for (var l in services[j].data[doc.unread_notifications[i].objectId].properties.hi[k].users) {
                                                        if (doc.unread_notifications[i].objectName + ": " + services[j].data[doc.unread_notifications[i].objectId].properties.hi[k].users[l].message === doc.unread_notifications[i].message && currentUser === services[j].data[doc.unread_notifications[i].objectId].properties.hi[k].users[l].email) {
                                                            for (var x in services[j].data[doc.unread_notifications[i].objectId].properties.hi[k].users[l].sendTo) {
                                                                if (services[j].data[doc.unread_notifications[i].objectId].properties.hi[k].users[l].sendTo[x].enabled === true) {
                                                                    toSet = true;
                                                                    break;
                                                                }
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                                doc.unread_notifications[i]["send" + (services[j].show ? services[j].show : services[j].name)] = toSet;
                                            }
                                        }
                                    }
                                }
                            }
                            res.status(200).send(doc.unread_notifications ? doc.unread_notifications : []);
                        }
                    });
                }
            });
        },
        notify: function (req, res) {
            var object = typeof req.body.object === "string" ? JSON.parse(req.body.object) : req.body.object;

            Apio.Database.db.collection('Objects').findOne({objectId: object.objectId}, function (error, data) {
                if (error) {
                    console.log("Unable to find object with id " + object.objectId + ", error: ", error);
                } else {
                    var key = Object.keys(object.properties)[0];
                    var notifica = {
                        objectId: object.objectId,
                        timestamp: new Date().getTime(),
                        message: object.message,
                        objectName: data.name,
                        properties: object.properties
                    };

                    if (typeof object.message === "undefined" || object.message === "") {
                        for (var i in data.notifications[key]) {
                            if (data.notifications[key][i].value === object.properties[key]) {
                                notifica.message = data.notifications[key][i].message;
                            }
                        }
                    }

                    console.log("notifica vale: ", notifica);
                    Apio.System.notify(notifica);
                    Apio.Database.db.collection("States").findOne({
                        objectId: notifica.objectId,
                        properties: notifica.properties
                    }, function (err, foundState) {
                        if (err) {
                            console.log("Unable to find States for objectId " + notifica.objectId);
                        } else if (foundState) {
                            Apio.State.apply(foundState.name);
                        }
                    });
                }
            });

            res.status(200).send();
        },
        listdisabled: function (req, res) {
            var currentUser = req.params.user;

            Apio.Database.db.collection("Users").findOne({
                email: currentUser
            }, function (err, doc) {
                if (err) {
                    console.log("Error: ", err);
                    res.sendStatus(500);
                } else {
                    Apio.Database.db.collection("Services").find({isTransmitter: true}).toArray(function (error, services) {
                        if (error) {
                            res.sendStatus(500);
                        } else if (services) {
                            for (var i = 0; i < doc.disabled_notification.length - 1; i++) {
                                for (var j = i + 1; j < doc.disabled_notification.length; j++) {
                                    if (doc.disabled_notification[i].message === doc.disabled_notification[j].message) {
                                        doc.disabled_notification.splice(j--, 1);
                                    }
                                }
                            }

                            for (var i in doc.disabled_notification) {
                                var key = Object.keys(doc.disabled_notification[i].properties);
                                var dateIndex = key.indexOf("date");
                                if (dateIndex > -1) {
                                    key.splice(dateIndex, 1);
                                }

                                if (key.length) {
                                    key = key[0];

                                    for (var j in services) {

                                        var toSet = false;

                                        if (services[j].data[doc.disabled_notification[i].objectId]) {
                                            for (var k in services[j].data[doc.disabled_notification[i].objectId].properties[key]) {
                                                if (doc.disabled_notification[i].properties[key] === services[j].data[doc.disabled_notification[i].objectId].properties[key][k].value) {
                                                    for (var l in services[j].data[doc.disabled_notification[i].objectId].properties[key][k].users) {
                                                        if (currentUser === services[j].data[doc.disabled_notification[i].objectId].properties[key][k].users[l].email) {
                                                            for (var x in services[j].data[doc.disabled_notification[i].objectId].properties[key][k].users[l].sendTo) {
                                                                if (services[j].data[doc.disabled_notification[i].objectId].properties[key][k].users[l].sendTo[x].enabled === true) {
                                                                    toSet = true;
                                                                    break;
                                                                }
                                                            }
                                                            break;
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                            doc.disabled_notification[i]["send" + (services[j].show ? services[j].show : services[j].name)] = toSet;
                                        }
                                    }
                                } else {
                                    for (var j in services) {

                                        var toSet = false;

                                        if (services[j].data[doc.disabled_notification[i].objectId]) {
                                            for (var k in services[j].data[doc.disabled_notification[i].objectId].properties.hi) {
                                                for (var l in services[j].data[doc.disabled_notification[i].objectId].properties.hi[k].users) {
                                                    if (currentUser === services[j].data[doc.disabled_notification[i].objectId].properties.hi[k].users[l].email) {
                                                        for (var x in services[j].data[doc.disabled_notification[i].objectId].properties.hi[k].users[l].sendTo) {
                                                            if (services[j].data[doc.disabled_notification[i].objectId].properties.hi[k].users[l].sendTo[x].enabled === true) {
                                                                toSet = true;
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                            }

                                            doc.disabled_notification[i]["send" + (services[j].show ? services[j].show : services[j].name)] = toSet;
                                        }
                                    }
                                }
                            }
                            res.status(200).send(doc.disabled_notification ? doc.disabled_notification : []);
                        }
                    });
                }
            })
        },
        delete: function (req, res) {
            var notif = req.body.notification;
            var user = req.body.username;
            Apio.Database.db.collection('Users').update({email: user}, {$pull: {unread_notifications: notif}}, function (err) {
                if (err) {
                    console.log('apio/notification/markAsRead Error while updating notifications');
                    res.status(500).send({});
                } else {
                    //Apio.io.emit("apio_notification_read", {notif: notif, user: user});
                    //if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                    //    if (Apio.Configuration.type === "cloud") {
                    //        Apio.io.emit("apio_notification_read.fromcloud", {
                    //            apioId: req.session.apioId,
                    //            notif: notif,
                    //            user: user
                    //        });
                    //    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                    //        Apio.Remote.socket.emit("apio_notification_read", {
                    //            apioId: req.session.apioId,
                    //            notif: notif,
                    //            user: user
                    //        });
                    //    }
                    //}



                    var socketIds = Apio.connectedSockets[user];
                    for (var i in socketIds) {
                        Apio.io.sockets.connected[socketIds[i]].emit("apio_notification_read", {notif: notif, user: user});
                    }
                    if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                        if (Apio.Configuration.type === "cloud") {
                            var socketId = Apio.connectedSockets[req.session.apioId][0];
                            Apio.io.sockets.connected[socketId].emit("apio_notification_read.fromcloud", {
                                //apioId: req.session.apioId,
                                notif: notif,
                                user: user
                            });
                        } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                            Apio.Remote.socket.emit("apio_notification_read", {
                                apioId: req.session.apioId,
                                notif: notif,
                                user: user
                            });
                        }
                    }
                    res.status(200).send({});
                }
            })
        },
        deleteAll: function (req, res) {
            console.log("---------------------Notifications Routes---------------, req.body: ", req.body);
            Apio.Database.db.collection('Users').update({email: req.body.username}, {$set: {unread_notifications: []}}, function (err) {
                if (err) {
                    console.log("Error while reading all notifications of user " + req.body.username);
                    res.status(500).send();
                } else {
                    //Apio.io.emit("apio_notification_read_all", req.body.username);
                    //if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                    //    if (Apio.Configuration.type === "cloud") {
                    //        Apio.io.emit("apio_notification_read_all.fromcloud", {
                    //            apioId: req.session.apioId,
                    //            user: req.body.username
                    //        });
                    //    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                    //        Apio.Remote.socket.emit("apio_notification_read_all", {
                    //            apioId: req.session.apioId,
                    //            user: req.body.username
                    //        });
                    //    }
                    //}




                    var socketIds = Apio.connectedSockets[req.body.username];
                    for (var i in socketIds) {
                        console.log("Faccio l'emit verso: ", socketIds[i])
                        Apio.io.sockets.connected[socketIds[i]].emit("apio_notification_read_all", req.body.username);
                    }
                    if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                        if (Apio.Configuration.type === "cloud") {
                            var socketId = Apio.connectedSockets[req.session.apioId][0];
                            Apio.io.sockets.connected[socketId].emit("apio_notification_read_all.fromcloud", {
                                //apioId: req.session.apioId,
                                user: req.body.username
                            });
                        } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                            Apio.Remote.socket.emit("apio_notification_read_all", {
                                apioId: req.session.apioId,
                                user: req.body.username
                            });
                        }
                    }
                    res.status(200).send({});
                }
            });
        },
        disable: function (req, res) {
            var notif = req.body.notification;
            var user = req.body.username;

            Apio.Database.db.collection("Users").findOne({email: user}, function (error, user_) {
                if (error) {
                    console.log("Error while searching for user with e-mail: ", user);
                    res.status(500).send({});
                } else if (user_) {
                    var disabled_notification = user_.disabled_notification ? user_.disabled_notification : [];
                    var unread_notifications = [];

                    for (var i in user_.unread_notifications) {
                        if (user_.unread_notifications[i].objectId === notif.objectId && user_.unread_notifications[i].message === notif.message) {
                            disabled_notification.push(user_.unread_notifications[i]);
                        } else {
                            unread_notifications.push(user_.unread_notifications[i]);
                        }
                    }

                    var updt = {
                        disabled_notification: disabled_notification,
                        unread_notifications: unread_notifications
                    };

                    console.log("updt: ", updt);

                    Apio.Database.db.collection("Users").update({email: user}, {$set: updt}, function (err, result) {
                        if (err) {
                            console.log('apio/notification/disable Error while updating notifications');
                            res.status(500).send();
                        } else if (result) {
                            //Apio.io.emit("apio_notification_disabled", {notif: notif, user: user});
                            //if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                            //    if (Apio.Configuration.type === "cloud") {
                            //        Apio.io.emit("apio_notification_disabled.fromcloud", {
                            //            apioId: req.session.apioId,
                            //            notif: notif,
                            //            user: user
                            //        });
                            //    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                            //        Apio.Remote.socket.emit("apio_notification_disabled", {
                            //            apioId: req.session.apioId,
                            //            notif: notif,
                            //            user: user
                            //        });
                            //    }
                            //}


                            var socketIds = Apio.connectedSockets[user];
                            for (var i in socketIds) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_notification_disabled", {notif: notif, user: user});
                            }
                            if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                                if (Apio.Configuration.type === "cloud") {
                                    var socketId = Apio.connectedSockets[req.session.apioId][0];
                                    Apio.io.sockets.connected[socketId].emit("apio_notification_disabled.fromcloud", {
                                        //apioId: req.session.apioId,
                                        notif: notif,
                                        user: user
                                    });
                                } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                                    Apio.Remote.socket.emit("apio_notification_disabled", {
                                        apioId: req.session.apioId,
                                        notif: notif,
                                        user: user
                                    });
                                }
                            }
                            res.status(200).send();
                        }
                    });
                }
            });
        },
        enable: function (req, res) {
            var notif = req.body.notification;
            var user = req.body.username;

            Apio.Database.db.collection("Users").findOne({email: user}, function (error, user_) {
                if (error) {
                    console.log("Error while searching for user with e-mail: ", user);
                    res.status(500).send({});
                } else if (user_) {
                    var disabled_notification = [];

                    for (var i in user_.disabled_notification) {
                        if (user_.disabled_notification[i].objectId !== notif.objectId || user_.disabled_notification[i].message !== notif.message) {
                            disabled_notification.push(user_.disabled_notification[i]);
                        }
                    }

                    Apio.Database.db.collection("Users").update({email: user}, {$set: {disabled_notification: disabled_notification}}, function (err, result) {
                        if (err) {
                            console.log('apio/notification/disable Error while updating notifications');
                            res.status(500).send();
                        } else if (result) {
                            //Apio.io.emit("apio_notification_enabled", {notif: notif, user: user});
                            //if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                            //    if (Apio.Configuration.type === "cloud") {
                            //        Apio.io.emit("apio_notification_enabled.fromcloud", {
                            //            apioId: req.session.apioId,
                            //            notif: notif,
                            //            user: user
                            //        });
                            //    } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                            //        Apio.Remote.socket.emit("apio_notification_enabled", {
                            //            apioId: req.session.apioId,
                            //            notif: notif,
                            //            user: user
                            //        });
                            //    }
                            //}


                            var socketIds = Apio.connectedSockets[user];
                            for (var i in socketIds) {
                                Apio.io.sockets.connected[socketIds[i]].emit("apio_notification_enabled", {notif: notif, user: user});
                            }
                            if (req.body.send_sockets === undefined || req.body.send_sockets === true) {
                                if (Apio.Configuration.type === "cloud") {
                                    var socketId = Apio.connectedSockets[req.session.apioId][0];
                                    Apio.io.sockets.connected[socketId].emit("apio_notification_enabled.fromcloud", {
                                        //apioId: req.session.apioId,
                                        notif: notif,
                                        user: user
                                    });
                                } else if (Apio.Configuration.type === "gateway" && Apio.Configuration.remote.enabled) {
                                    Apio.Remote.socket.emit("apio_notification_enabled", {
                                        apioId: req.session.apioId,
                                        notif: notif,
                                        user: user
                                    });
                                }
                            }
                            res.status(200).send();
                        }
                    });
                }
            });
        },
        sendMail: function (req, res) {
            Apio.Database.db.collection("Users").findOne({email: req.params.user}, function (err, user) {
                if (err) {
                    console.log("Unable to find notifications of user with e-mail " + req.params.user);
                } else if (user) {
                    var disabled_notification = user.disabled_notification;
                    var unread_notifications = user.unread_notifications;
                    for (var i = 0; i < disabled_notification.length; i++) {
                        if (disabled_notification[i].objectId === req.body.notification.objectId && disabled_notification[i].message === req.body.notification.message) {
                            disabled_notification[i].sendMail = req.body.sendMail;
                        }
                    }

                    for (var i = 0; i < unread_notifications.length; i++) {
                        if (unread_notifications[i].objectId === req.body.notification.objectId && unread_notifications[i].message === req.body.notification.message) {
                            unread_notifications[i].sendMail = req.body.sendMail;
                        }
                    }

                    var updt = {
                        disabled_notification: disabled_notification,
                        unread_notifications: unread_notifications
                    };

                    Apio.Database.db.collection("Users").update({email: req.params.user}, {$set: updt}, function (error, result) {
                        if (error) {
                            res.status(500).send();
                        } else if (result) {
                            res.status(200).send();
                        }
                    });
                }
            });
        },
        sendSMS: function (req, res) {
            Apio.Database.db.collection("Users").findOne({email: req.params.user}, function (err, user) {
                if (err) {
                    console.log("Unable to find notifications of user with e-mail " + req.params.user);
                } else if (user) {
                    var disabled_notification = user.disabled_notification;
                    var unread_notifications = user.unread_notifications;
                    for (var i = 0; i < disabled_notification.length; i++) {
                        if (disabled_notification[i].objectId === req.body.notification.objectId && disabled_notification[i].message === req.body.notification.message) {
                            disabled_notification[i].sendSMS = req.body.sendSMS;
                        }
                    }

                    for (var i = 0; i < unread_notifications.length; i++) {
                        if (unread_notifications[i].objectId === req.body.notification.objectId && unread_notifications[i].message === req.body.notification.message) {
                            unread_notifications[i].sendSMS = req.body.sendSMS;
                        }
                    }

                    var updt = {
                        disabled_notification: disabled_notification,
                        unread_notifications: unread_notifications
                    };

                    Apio.Database.db.collection("Users").update({email: req.params.user}, {$set: updt}, function (error, result) {
                        if (error) {
                            res.status(500).send();
                        } else if (result) {
                            res.status(200).send();
                        }
                    });
                }
            });
        }
    }
};