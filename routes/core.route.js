var Apio = require("../apio.js");

module.exports = {
	serial : {
		send : function(req,res) {

		}
	},
	states : {
		create : function(req,res){

    Apio.Database.db.collection('States').findOne({name : req.body.state.name},function(err,data){
	        if (data) {
	            console.log("Esiste già uno stato con questo nome ("+req.body.state.name+")")
	            res.send({error : "STATE_NAME_EXISTS"});
	        }
	        else {
	            Apio.Database.db.collection('States').aggregate({$match : {objectId : req.body.state.objectId, properties: req.body.state.properties}},function(err,result){
	                if (result.length > 0) {
	                    console.log("Esiste già uno stato con queste proprietà");
	                    res.send({error : 'STATE_PROPERTIES_EXIST', state : result[0]["name"]});
	                }
	                else {
	                    if (req.body.hasOwnProperty('event')) {
	                        //se sono qui devo anchr creare un evento che ha come stato scatenante lo stato inviato
	                        var evt = {
	                            name : req.body.event.name,
	                            triggerState : req.body.state.name,
	                            type : 'stateTriggered'
	                        };
	                        Apio.Database.db.collection('Events').findOne({name : evt.name},function(err,data){
	                            if (err) {
	                                res.status(500).send();
	                                console.log('/apio/state error while checking event name availability');
	                            }
	                            if (data) {
	                                //Significa che ho già un evento con questo nome
	                                res.send({error:'EVENT_NAME_EXISTS'});
	                            } else {
	                                //Se sono qui significa che non c'è un evento con quel nome.
	                                Apio.Database.db.collection('States').insert(req.body.state,function(err,data){
	                                        if (!err) {
	                                            console.log("Stato ("+req.body.state.name+") salvato con successo")
	                                            Apio.io.emit("apio_state_new",req.body.state);
	                                            Apio.Database.db.collection('Events').insert(evt,function(error){
	                                                if (!error) {
	                                                    Apio.io.emit("apio_event_new",evt);
	                                                    console.log("Evento ("+evt.name+") relativo allo stato ("+req.body.state.name+"), salvato con successo")
	                                                    res.send({error : false});
	                                                }

	                                            });
	                                        } else {
	                                            console.log("Apio.Database.Error unable to save the new state");
	                                            res.send({error : 'DATABASE_ERROR'});
	                                        }
	                                })
	                            }
	                        })
	                    } else {
	                        //Se non devo salvare eventi
	                                Apio.Database.db.collection('States').insert(req.body.state,function(err,data){
	                                        if (!err) {
	                                            console.log("Stato ("+req.body.state.name+") salvato con successo")
	                                            Apio.io.emit("apio_state_new",req.body.state);
	                                            res.send({error : false})
	                                        } else {
	                                            console.log("Apio.Database.Error unable to save the new state");
	                                            res.send({error : 'DATABASE_ERROR'});
	                                        }
	                                })
	                    }


	                }
	        })//states aggregate
	    }

	})
},
		delete : function(req,res) {

		},
		getByName : function(req,res){
		    Apio.Database.db.collection("States").findOne({name : req.params.name},function(err,data){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.send(data);
		    });
		},
		get : function(req,res){
		    Apio.Database.db.collection("States").find().toArray(function(err,data){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.send(data);
		    });
		}
	},
	notifications : {
		create : function(req,res) {

		},
		list : function(req,res) {
			    var currentUser = 'matteo.di.sabatino.1989@gmail.com';

			    Apio.Database.db.collection('Users').findOne({email : currentUser},function(err,doc){
				        if(err) {
				            console.log("Un errore ");
				            console.log(err);
				            res.status(500).send({});
				        } else {
				            res.send(doc.unread_notifications);
				        }
				    })
		},
		delete : function(req,res){
		    var notif = req.body.notification;
		    var user = req.body.username;
		    Apio.Database.db.collection('Users').update({"username" : user},{$pull : {"unread_notifications" : notif}},function(err){
		        if (err){
		            console.log('apio/notification/markAsRead Error while updating notifications');
		            res.status(500).send({});
		        }
		        else {
		            res.status(200).send({});
		        }
		    })
		}
	},
	events : {
		create : function(req,res){
		    var evt = req.body.event;
		    console.log("Salvo l'evento ");
		    console.log(evt);
		    Apio.Database.db.collection('Events').insert(evt,function(err,result){
		        if (err) {
		            console.log("Error while creating a new event");
		            res.status(500).send({error : "DB"});
		        } else {
		            if (evt.hasOwnProperty('triggerTimer')){
		                Apio.System.registerCronEvent(evt);
		            }
		            Apio.io.emit("apio_event_new",evt);
		            res.status(200).send(result[0].objectId);
		        }
		    })
		},
		update : function(req,res){
		    delete req.body.eventUpdate["_id"];
		    Apio.Database.db.collection("Events").update({name : req.params.name},req.body.eventUpdate,function(err){
		        if (!err) {
		            Apio.io.emit("apio_event_update",{event : req.body.eventUpdate});
		            res.send({error : false});
		        }
		        else
		            res.send({error : 'DATABASE_ERROR'});
		    })
		},
		delete : function(req,res){
    
		    Apio.Database.db.collection("Events").remove({name : req.params.name},function(err){
		        if (!err) {
		            Apio.io.emit("apio_event_delete",{name : req.params.name});
		            res.send({error : false});
		        }
		        else
		            res.send({error : 'DATABASE_ERROR'});
		    })
		},
		getByName : function(req,res){
		    Apio.Database.db.collection('Events').findOne({name : req.params.name},function(err,data){
		        if (err) {
		            console.log("Error while fetching event named "+req.params.name);
		            res.status(500).send({error : "DB"});
		        } else {
		            res.send(data);
		        }
		    })
		},
		list : function(req,res){
		    Apio.Database.db.collection("Events").find({}).toArray(function(err,result){
		        if (err)
		            res.status(500).send({error:true});
		        else
		            res.status(200).send(result);
		    });
		},
		launch : function(req,res){
		    //  Vado a vedere se l'evento esiste
		    //  Vado a prendere gli stati da scatenare
		    //  Applico gli stati
		    //  Profit
		    Apio.System.launchEvent(req.query.eventName,function(err){
		        if (err)
		            res.status(500).send({error :  true});
		        else
		            res.send({error : false});
		    })
		}

	},
	objects : {
		create : function(req,res) {

		},
		delete : function(req,res) {

		},
		update : function(req,res){

		    var object = req.body.object;

		            if (object.writeToDatabase === true)
		            Apio.Database.updateProperty(object,function(){
		                //Connected clients are notified of the change in the database
		                Apio.io.emit("apio_server_update",object);
		            });
		        else
		            Apio.Util.debug("Skipping write to Database");


		        //Invio i dati alla seriale se richiesto
		        if (object.writeToSerial === true && ENVIRONMENT == 'production') {
		            Apio.Serial.send(object);
		        }
		        else
		            Apio.Util.debug("Skipping Apio.Serial.send");




		},
		getById : function(req,res) {
			Apio.Database.getObjectById(req.params.id,function(result){
		            res.send(result);
		    })
		},
		get : function(req,res) {
			Apio.Database.getObjects(function(result){
		            res.send(result);
		    })
		}
	}
}




