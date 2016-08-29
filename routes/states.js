module.exports = function(Apio){

	return {
        update: function(req, res) {
            Apio.State.update(req.params.name,req.body.state,function(response){
                if (Apio.Configuration.type == "gateway" && Apio.Configuration.remote.enabled){
                    Apio.Remote.socket.emit("apio.server.state.update", {stateName:req.params.name,update:req.body.state});
                } else {
                    Apio.io.emit('apio.remote.state.update',{stateName : req.params.name,state : req.body.state});
                }
                res.send(response);
            });

        },
        modify: function (req, res) {
            console.log("Mi arriva da modificare questo stato: " + req.params.name);
            console.log("Il set di modifiche è: ", req.body.state);

            var packagedUpdate = {properties: {}};
            for (var k in req.body.state) {
                packagedUpdate.properties[k] = req.body.state[k];
            }

            Apio.Database.db.collection("States").findAndModify({name: req.params.name}, {}, {$set: packagedUpdate}, function (err, result) {
                if (err) {
                    res.send({error: "DATABASE_ERROR"});
                } else if (result) {
                    Apio.Database.db.collection("Objects").findOne({objectId: result.objectId}, function (err, result_) {
                        if (err) {
                            console.log("Error while getting object with objectId " + result.objectId);
                        } else if (result_) {
                            for (var i in result.properties) {
                                if (result_.notifications.hasOwnProperty(i)) {
                                    for (var j in result_.notifications[i]) {
                                        if (result_.notifications[i][j].value === result.properties[i]) {
                                            var newMessage = result_.notifications[i][j].message;
                                            if (newMessage.indexOf(result.properties[i]) > -1) {
                                                newMessage = newMessage.split(result.properties[i])[0];
                                                newMessage += req.body.state[i];
                                            }

                                            result_.notifications[i][j].value = req.body.state[i];
                                            result_.notifications[i][j].message = newMessage;
                                        }
                                    }
                                }
                            }

                            console.log("result_.notifications: ", result_.notifications);

                            Apio.Database.db.collection("Objects").findAndModify({objectId: result.objectId}, {}, {$set: {notifications: result_.notifications}}, function (err_, res_) {
                                if (err_) {
                                    console.log("Error while updating notifications");
                                } else if (res_) {
                                    console.log("Notifications successfully updated");
                                    Apio.io.emit("apio_state_update", {name: req.params.name, properties: req.body.state});
                                    if (Apio.Configuration.type == "gateway" && Apio.Configuration.remote.enabled) {
                                        Apio.Remote.socket.emit("apio.server.state.update", {stateName:req.params.name,update:req.body.state});
                                    } else {
                                        Apio.io.emit('apio.remote.state.update',{stateName : req.params.name,state : req.body.state});
                                    }
                                    res.send({error: false});
                                }
                            })
                        }
                    });
                }
            });
        },

        create: function(req, res) {

            Apio.State.create(req.body.state, req.body.event, function(response) {
                var state = req.body.state;
                state.apioId = Apio.System.getApioIdentifier();
                if (Apio.Configuration.type == "gateway" && Apio.Configuration.remote.enabled==true) {
                    Apio.Remote.socket.emit("apio.server.state.create", state);
                } else {
                    Apio.io.emit('apio.remote.state.create',{stateName : req.params.name,state : req.body.state});
                }
                res.send(response);
            })
        },
        delete: function(req, res) {
            Apio.State.delete(req.params.name, function(response) {
                if (Apio.Configuration.type == "gateway" && Apio.Configuration.remote.enabled) {
                    Apio.Remote.socket.emit("apio.server.state.delete", {name: req.params.name});
                } else {
                    Apio.io.emit('apio.remote.state.delete',{stateName : req.params.name});
                }
                res.send(response);
            })

        },
        deleteState: function (req, res) {
            console.log("Mi arriva da eliminare questo: " + req.params.name);
            Apio.Database.db.collection("States").findAndRemove({name: req.params.name}, function (err, removedState) {
                if (!err) {
                    Apio.io.emit("apio_state_delete", {name: req.params.name});
                    Apio.Database.db.collection("Events").remove({triggerState: req.params.name}, function (err) {
                        if (err) {
                            res.send({error: 'DATABASE_ERROR'});
                        }
                        else {
                            Apio.io.emit("apio_event_delete", {name: req.params.name});
                        }
                    });

                    Apio.Database.db.collection("Objects").findOne({objectId : removedState.objectId}, function(error, result){
                        if(error){
                            console.log("Unable to find object with objectId "+removedState.objectId);
                        } else if(result){
                            var notifications = result.notifications;

                            for (var i in removedState.properties) {
                                if (notifications.hasOwnProperty(i)) {
                                    for (var j in notifications[i]) {
                                        if (notifications[i][j].value === removedState.properties[i]) {
                                            delete notifications[i][j];
                                        }
                                    }

                                    if (Object.keys(notifications[i]).length === 0) {
                                        delete notifications[i]
                                    }
                                }
                            }

                            Apio.Database.db.collection("Objects").update({objectId : removedState.objectId}, {$set:{notifications : notifications}}, function(err, res){
                                if(err){
                                    console.log("Unable to update object with objectId "+removedState.objectId);
                                } else if(res){
                                    console.log("Notification successfully deleted");
                                }
                            });
                        }
                    });

                    if (removedState.hasOwnProperty('sensors')) {
                        removedState.sensors.forEach(function (e, i, a) {
                            var props = {};
                            props[e] = removedState.properties[e];
                            Apio.Serial.send({
                                'objectId': removedState.objectId,
                                'properties': props
                            });
                        });
                    }
                    res.send({error: false});
                }
                else{
                    res.send({error: 'DATABASE_ERROR'});
                }
            });
        },
        apply: function(req, res) {
            req.body.state = typeof req.body.state === "string" ? JSON.parse(req.body.state) : req.body.state;
            console.log("req.body: ", req.body);
            Apio.State.apply(req.body.state.name,function(){
				Apio.Util.log("HTTP requested to apply state "+req.body.state.name)
                if (Apio.Configuration.type=="gateway" && Apio.Configuration.remote.enabled) {
                    Apio.Remote.socket.emit("apio.server.state.apply", {stateName: req.body.state.name});
                } else {
                    Apio.io.emit('apio.remote.event.delete',{stateName : req.body.state.name});
                }
				res.send();
		    });
        },
        getByName: function(req, res) {
            Apio.State.getByName(req.params.name,function(err,data){
                if (err) {
                    res.status(500).send({error:true})
                } else {
                    res.send(data);
                }
            })

        },
        list: function(req, res) {
            Apio.State.list(function(err,data){
                if (err) {
                    res.status(500).send({error:true})
                } else {
                    res.send(data);
                }
            })
        }
    }
   }
