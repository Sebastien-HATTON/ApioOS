// var Apio = require("../apio.js")(require("../configuration/default.js"), false);
var Apio = require("../apio.js")(false);
var fs = require("fs");
//MongoClient
var MongoClient = require("mongodb").MongoClient;
//gateway_key.apio

Apio.io = require("socket.io-client")("http://192.168.0.101:5000");


//OBJ e PREVOBJ
var objects = {};
//Apio.Configuration.database.hostname = "192.168.0.101"
MongoClient.connect("mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to connect to mongodb://" + Apio.Configuration.database.hostname + ":" + Apio.Configuration.database.port + "/" + Apio.Configuration.database.database + ": ", error);
    } else if (db) {
        database = db;
        db.collection("Objects").find().toArray(function (err, doc) {
            if (err) {
                console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {
                //addressBindToProperty = doc;
                //console.log("La collection con name addressBindToProperty contiene: ", addressBindToProperty)
                console.log(doc)
                for (var i in doc) {
                    objects[doc[i].objectId] = doc[i];
                }
            }
        });
    }
});

///192.168.116.26:1883
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://192.168.116.26:1883');

client.on('connect', function () {
    console.log("MQTT CONNECTED")
    //client.subscribe('presence');
    //client.publish('presence', 'Hello mqtt');
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString());
    client.end();
});

//Mettere qui l'evento sulla socket.
Apio.io.on("mqtt_service", function (data) {
    console.log("mqtt_service")
    console.log(data)
    client.publish('enea/ricezioneMisure', JSON.stringify(data));

})


console.log("Partito")

var gc = require("./garbage_collector.js");
gc();