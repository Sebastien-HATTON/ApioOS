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

// var Apio = require("../apio.js")(require("../configuration/default.js"), false);
var Apio = require("../apio.js")(false);
var fs = require("fs");
var com = require("serialport");
var request = require("request");
//dipendenze Z-Wave
var OpenZWave = require("openzwave-shared");
var os = require("os");
var searchDongleFlag = 0;
var searchDongleInterval = undefined;
var zwavePort = undefined;
//Istanza
var zwave = new OpenZWave({
    ConsoleOutput: false
});
Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=zwave&token=" + Apio.Token.getFromText("zwave", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});

var compatibleDongle = {
    zWay: {
        productId: "0x0200",
        vendorId: "0x0658"
    }
};

var express = require("express");
var app = express();
var http = require("http").Server(app);
var usage = require('usage');
var searchDongle = function () {
    var searchDongleInterval = setInterval(function () {
        found = 0;
        com.list(function (err, ports) {
            if (err) {
                console.log("Unable to get serial ports, error: ", err);
            } else {
                ports.forEach(function (port, portsRef, index) {
                    console.log(port);
                    for (var a in compatibleDongle) {
                        if (compatibleDongle[a].productId === port.productId && compatibleDongle[a].vendorId === port.vendorId) {
                            console.log("OK");
                            console.log("There is DONGLE");
                            console.log("#############port.comName###########");
                            console.log("port.comName: ", port.comName);
                            zwavePort = port.comName;
                            zwave.connect(port.comName);
                            searchDongleFlag = 0;
                            if (searchDongleInterval) {
                                clearInterval(searchDongleInterval);
                            }
                            found = 1;
                            break;
                        }
                    }

                    if (index === portsRef.length - 1) {
                        if (found) {

                        } else {
                            console.log("No DONGLE");
                            found = 0;
                        }
                    }
                })
            }
        });

    }, 20000)
}
var pid = process.pid // you can use any valid PID instead
var options = {keepHistory: true};
setInterval(function () {
    usage.lookup(pid, options, function (err, result) {
        console.log("Memory: ", result);
        if (result.cpu > 90) {
            //Controllo le seriali
            found = 0;
            com.list(function (err, ports) {
                if (err) {
                    console.log("Unable to get serial ports, error: ", err);
                } else {
                    ports.forEach(function (port) {
                        console.log(port);
                        for (var a in compatibleDongle) {
                            if (compatibleDongle[a].productId === port.productId && compatibleDongle[a].vendorId === port.vendorId) {
                                console.log("OK")
                                found = 1
                                break;
                            }
                        }
                        if (found) {
                            //console.log("There is DONGLE")
                        } else {

                            console.log("No DONGLE");
                            console.log("disconnecting...");
                            zwave.disconnect(zwavePort);
                            process.exit();
                            //zwave.disconnect();
                            if (!searchDongleFlag) {
                                searchDongle();
                                searchDongleFlag = 1;
                            }

                        }
                    })
                }
            });
        }
    });
}, 30000);

var socketServer = require("socket.io")(http);

var flagInit = false;
var flagLearn = false;
var flagRemove = false;
var inserting = false;
//var objects = [];
var objects = {};
var communication = {};
var bindToProperty = {};

//Carico in RAM i dati relativi alla comunicazione.
var communication = {};
var bindToProperty = {};
Apio.Database.connect(function () {
    Apio.Object.list("admin", function (err, oBjects) {
            if (err) {

            } else {
                // console.log('OBJECTS IS: ', oBjects);
                //objects = JSON.parse(JSON.stringify(oBjects));
                for (var i in oBjects) {
                    objects[oBjects[i].objectId] = oBjects[i];
                }

                // console.log("°°°°°°°°°°°°°°°°objects°°°°°°°°°°°°°°°", objects);
            }
        }
    )
    Apio.Database.db.collection("Communication").findOne({'name': 'integratedCommunication'}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else if (doc) {

            communication = doc;
            // console.log('la collection communication contiene: ', communication)
        }
    })
    Apio.Database.db.collection("Communication").findOne({'name': 'addressBindToProperty'}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else if (doc) {

            bindToProperty = doc;
            // console.log('la collection communication contiene: ', communication)
        }
    })


});

var zwaveSendToDevice = function (data, addInfo) {
    console.log();
    console.log("ZWAVE SEND TO DEVICE: ");
    console.log(data);
    console.log();
    //console.log("nodeId: ",data.protocol.address);

    /*if(){

     }*/
    var nodeId = data.protocol.address;
    //console.log("class: ",req.params.class);
    var classZ = 37;
    //Devo trovare poi come parametrizzarlo
    //console.log("instance: ",req.params.instance)
    var instance = 1;
    //console.log("index: ",req.params.index)
    var index = 0;
    //console.log("value: ",req.params.value)
    var value = Number(data.message.value);

    try {
        zwave.setValue(nodeId, classZ, instance, index, value);
    } catch (ex) {
        console.log("Expection while send info to node: ", ex);
        var o = {};
        o.message = "zwave_reset";
        o.data = "It seems that the object is not present in this Z-Wave Network. Please reset it and install it again!";
        Apio.io.emit("send_to_client", o);
    }

    /*var s = communication["enocean"]
     console.log("******S1********", s);
     //controlli sulla sotto-collection protocol
     if (data.hasOwnProperty("protocol") && data.protocol.hasOwnProperty("type")) {
     s = s[data.protocol.type].send
     } else {
     var type = bindToProperty.enocean[data.address].type
     s = s[type].send
     }
     console.log("******S2********", s);
     if (data.hasOwnProperty("protocol") && data.protocol.hasOwnProperty("fun")) {
     s = s[data.protocol.fun]
     } else {
     s = s["01"]
     }


     data.enoceanBase = enocean.base;
     //console.log("la funzione da eseguire è: ",s);
     //console.log("il dato che gli verrà passato è: ",data);
     var x = eval.call(null, s);
     var send = {}

     console.log("******X********", x);
     console.log("******S3********", s);
     send = x(data, enocean, addInfo);
     var crc8H = enocean.pad(enocean.crc(new Buffer(send.header, "hex")).toString(16), 2);
     //console.log("crc8h ", crc8H);
     send.header = "55" + send.header + crc8H;
     var crc8D = enocean.pad(enocean.crc(new Buffer(send.data, "hex")).toString(16), 2);
     send.data += crc8D;
     //console.log("crc8D ", crc8D);
     console.log("sto inviando questo: ", send.header + send.data);*/
    //enocean.send(send.header + send.data);
}

Apio.io.on("apio_server_update", function (data) {
    // console.log("apio_server_update")
    // console.log(data)
    if (Apio.Database.hasOwnProperty('db')) {
        Apio.Database.db.collection("Objects").findOne({'objectId': data.objectId}, function (err, doc) {
            if (err) {
                console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {

                //bindToProperty = doc;
                // console.log(doc)
                var proprieta = Object.keys(data.properties);
                for (var a in proprieta) {
                    // console.log("Dentro al for")
                    // console.log(proprieta[a])
                    //console.log(doc.properties.hasOwnProperty(proprieta[a]))
                    //console.log(doc.properties[proprieta[a]].hasOwnProperty('additional'))
                    //console.log(doc.properties[proprieta[a]].additional.hasOwnProperty('enea'));
                    if (doc.properties.hasOwnProperty(proprieta[a]) && doc.properties[proprieta[a]].hasOwnProperty('additional') && doc.properties[proprieta[a]].additional[0].hasOwnProperty('enea')) {
                        // console.log("Pre");
                        // console.log(doc.properties[proprieta[a]].additional[0].enea)
                        //delete doc.properties[proprieta[a]].additional[0].enea.Value;
                        //console.log(data.properties[proprieta[a]])
                        //doc.properties[proprieta[a]].additional[0].enea.EnergyBoxID = Apio.System.getApioIdentifier()
                        doc.properties[proprieta[a]].additional[0].enea.Value = data.properties[proprieta[a]];
                        var timeStamp = new Date().getTime();
                        doc.properties[proprieta[a]].additional[0].enea.CurrentDateTimeUnix = timeStamp;
                        // console.log("Post")
                        // console.log(doc.properties[proprieta[a]].additional[0].enea)

                        //Pubblico sull MQTT
                        //client.publish('enea/ricezioneMisure', doc.properties[proprieta[a]].additional[0].enea);
                        socketServer.emit("mqtt_service", doc.properties[proprieta[a]].additional[0].enea)
                        //client.publish('enea/ricezioneMisure', JSON.stringify(doc.properties[proprieta[a]].additional[0].enea));
                    }

                }
            }
        })
    }

})

Apio.io.on('apio_update_bind_to_property', function (data) {
    Apio.Database.db.collection("Communication").findOne({'name': 'addressBindToProperty'}, function (err, doc) {
        if (err) {
            ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
        } else if (doc) {

            bindToProperty = doc;
            console.log('la collection communication contiene: ', communication)
        }
    })

})

Apio.io.on("apio_zwave_send", function (data) {
    console.log(data);
    console.log("il dato è", data);

    console.log("id ", data.address);

    if (objects.hasOwnProperty(data.objectId) && objects[data.objectId].properties.hasOwnProperty(data.message.property)) {
        objects[data.objectId].properties[data.message.property].value = data.message.value;
        console.log('objects[data.objectId].properties[data.message.property] ', objects[data.objectId].properties[data.message.property]);
        //PRIMA ERA FUORI DALL'IF
        if (flagInit) {
            zwaveSendToDevice(data, data.allProperties);
        } else {
            console.log("Initialization not ended at the moment");
        }
    }

    //ORA DENTRO L'IF
    //zwaveSendToDevice(data, data.allProperties);
    console.log("++++++++INVIATO++++++++");
})

/*
 * OpenZWave test program.
 */
//Qui c'è express che ho usato per fare tutte le prove
//var express = require("express");
//var http = require("http");
//var app = express();

//In questa variabile verranno instanzaiti tutti i nodi. Questa cosa serve per inviare e ricevere ai diversi nodi che sono in rete.
var nodes = [];

//Quando parte il services viene stapato questo, dopo questo scatta l'evento driver ready
zwave.on("connected", function (homeid) {
    console.log("=================== CONNECTED! ====================");
});

//Da qui parte lo scan della rete (homeid), fintanto che lo scan non finisce, non si può fare nessuna
//azione, lo scan finisce quando viene scatenato l'evento: scan complete(vedi sotto)
zwave.on("driver ready", function (homeid) {
    console.log("=================== DRIVER READY! ====================");
    console.log("scanning homeid=0x%s...", homeid.toString(16));
});

//Evento che parte se c'è qualche problema con il driver ZWave
zwave.on("driver failed", function () {
    console.log("failed to start driver");
    zwave.disconnect(zwavePort);
    process.exit();
});

//Durante lo scan o quando viene aggiunto un nuovo nodo scatta questo evento e viene creato nel vettore dei nodi un array vuoto
//pronto ad ospitare il nuovo nodo. QUesto viene riempito poi dall'evento: node ready
zwave.on("node added", function (nodeid) {
    console.log("=================== NODE ADDED! ====================");
    console.log(nodeid);
    nodes[nodeid] = {
        manufacturer: "",
        manufacturerid: "",
        product: "",
        producttype: "",
        productid: "",
        type: "",
        name: "",
        loc: "",
        classes: {},
        ready: false
    };
});

//Questo evento viene scatenato ogni qualvolta viene aggiunto un nuovo valore su un node.
zwave.on("value added", function (nodeid, comclass, value) {
    console.log("value added");
    if (!nodes[nodeid]["classes"][comclass]) {
        nodes[nodeid]["classes"][comclass] = {};
    }
    nodes[nodeid]["classes"][comclass][value.index] = value;
    console.log(nodes[nodeid]["classes"][comclass][value.index]);
});

//Questo evento viene scatenato ogni qualvolta viene cambiato un valore su un node ad esempio quando, la spina fibaro
//Switcha da on off.
//Il messaggio che viene stampato è questo:
//node6: changed: 37:Switch:false->true
//Praticamente dice che il node 6 ha cambiato la funzione 37 (chiamata Switch) il valore è cambiato da false(Spento) a
//true(Accesso)
//Un altro messaggio che viene stampato potrebbe essere questo:
//node6: changed: 49:Power:518.7->364.4
//Questo significa che la Potenza è passata da 518,7W a 364,4W
zwave.on("value changed", function (nodeid, comclass, value) {
    console.log("value changed");
    if (nodes[nodeid]["ready"]) {
        console.log("node%d: changed: %d:%s:%s->%s", nodeid, comclass, value["label"], nodes[nodeid]["classes"][comclass][value.index]["value"], value["value"]);
    }
    nodes[nodeid]["classes"][comclass][value.index] = value;
    if (flagInit) {
        if (communication.hasOwnProperty('zwave') && bindToProperty.hasOwnProperty('zwave')) {
            console.log("VERIFICO SE L'OGGETTO é NEL SISTEMA....");
            var s = communication['zwave']
            var type = '';
            if (bindToProperty.hasOwnProperty('zwave') && bindToProperty.zwave.hasOwnProperty(String(nodeid))) {
                type = bindToProperty.zwave[String(nodeid)].type
                console.log('OGGETTO TROVATO NEL SISTEMA ACCETTO IL MESSAGGIO');
                console.log();
                console.log("bindToProperty.zwave[nodeid]: ", bindToProperty.zwave[String(nodeid)], "s: ", s, "type: ", type, "s.hasOwnProperty(type): ", s.hasOwnProperty(type));
                if (s.hasOwnProperty(type) && s[type].hasOwnProperty('recive')) {
                    if (comclass == 37) {
                        var fun = '00';
                        //Aggiorno lo switch
                    } else if (comclass == 49) {
                        var fun = '01';
                        //Aggiorno la power
                    }

                    /*function(dataObject,enocean){   var property = {  temperature : '' };  var temperature = parseInt(dataObject.raw.substring(4, 6)); console.log('temperature hex: ', temperature); temperature = ((temperature-255)*(40/-255)).toFixed(2); console.log('temperature converted int: ', temperature); property.temperature = String(temperature);return property; }*/

                    //var fun = data.rawByte.slice(14, 14+2);
                    /*var fun = '01';*/
                    console.log('fun ', fun);
                    s = s[type].recive[fun]
                    //data.enoceanBase = enocean.base;

                    //console.log('la funzione da eseguire è: ',s);
                    //console.log('il dato che gli verrà passato è: ',data);
                    console.log("Chiamo la receive")
                    var x = eval.call(null, s);
                    //la call back deve restituire

                    console.log();


                    if (x) {

                        console.log("CHIAMO LA RECEIVE")
                        var o = {
                            value: value["value"]
                        }
                        receive = x(o);

                        //Dalla fnzone nel caso in cui era un rocker mi torneranno anche i trigger cmabiati quindi devo
                        //aggiornare i valori delle variabili globali
                        console.log("+++++++++++++++++++ Receive+++", receive)
                        /*if (receive.hasOwnProperty('optionalData')) {

                         if (receive.optionalData.hasOwnProperty('trigger')) {
                         trigger = receive.optionalData.trigger;
                         } else if (receive.optionalData.hasOwnProperty('trigger1')) {
                         trigger1 = receive.optionalData.trigger1;
                         }
                         }
                         //
                         receive.RSSI = getEnoceanRSSI(data)
                         //x(data,enocean);*/
                        var dataForEmit = {
                            objectId: bindToProperty.zwave[nodeid].objectId,
                            properties: {},
                            writeToDatabase: true,
                            writeToSerial: false
                        }
                        dataForEmit.properties = receive;
                        console.log('ricevuto data lancio emit', dataForEmit);
                        console.log();
                        Apio.io.emit("apio_client_update", dataForEmit);
                    }
                }
            }
            //Copiare autoinstallazione node ready
            else {
                if (flagInit) {
                    //Devo verificare se il node è presente nel sistema, ci sono diverse cose da controllare, la prima è la objects
                    //Dove devo controllare se l'address c'è ed il protocol è z
                    //Poi la addressBindToProperty
                    //console.log(nodeinfo.product)
                    var eepZ = nodes[nodeid].product.split(' ')[0]
                    if (objects) {
                        var foundZ = false
                        for (var a in objects) {
                            console.log(objects[a])
                            if (objects[a].protocol === 'z' && Number(objects[a].address) === nodeid) {
                                console.log("Found in Objects")
                                foundZ = true;

                            } else {

                            }
                        }
                        if (!foundZ) {
                            console.log("Installing new Object...")
                            if (inserting != nodeid) {
                                Apio.io.emit('send_to_service', {
                                    service: 'autoInstall',
                                    message: 'apio_install_new_object',
                                    data: {
                                        protocol: 'z',
                                        eep: eepZ,
                                        address: String(nodeid)
                                    }
                                });
                                inserting = nodeid
                                setInterval(function () {
                                    inserting = false
                                }, 10000)
                            }

                        }
                    }
                }
            }

        }
    }
});

//Questo evento viene scatenato ogni qualvolta viene rimosso un valore da un node, non mi è mai capitato di vederlo scatenato
//con le prese fibaro.
zwave.on("value removed", function (nodeid, comclass, index) {
    console.log("value removed");
    if (nodes[nodeid]["classes"][comclass] && nodes[nodeid]["classes"][comclass][index]) {
        delete nodes[nodeid]["classes"][comclass][index];
    }
    if (objects) {
        for (var o in objects) {
            if (objects[o].protocol == 'z' && Number(objects[o].address) == nodeid) {
                request({
                    json: true,
                    uri: "http://localhost:" + Apio.Configuration.http.port + "/apio/app/delete",
                    method: "POST",
                    body: {
                        id: objects[o].objectId
                    }
                }, function (error, response, body) {
                    if (error || !response || Number(response.statusCode) !== 200) {
                        console.log("Elimino l'oggetto!!!!")
                    }
                });
                delete objects[o];
            }
        }

    }


});

//Questo evento viene scatenato quando un nodo viene scannerizzato e riconosciuto, in questa fase viene riempita tutta la struttura
//del nodo
zwave.on("node ready", function (nodeid, nodeinfo) {
    console.log("node ready");
    nodes[nodeid]["manufacturer"] = nodeinfo.manufacturer;
    nodes[nodeid]["manufacturerid"] = nodeinfo.manufacturerid;
    nodes[nodeid]["product"] = nodeinfo.product;
    nodes[nodeid]["producttype"] = nodeinfo.producttype;
    nodes[nodeid]["productid"] = nodeinfo.productid;
    nodes[nodeid]["type"] = nodeinfo.type;
    nodes[nodeid]["name"] = nodeinfo.name;
    nodes[nodeid]["loc"] = nodeinfo.loc;
    nodes[nodeid]["ready"] = true;
    console.log("node%d: %s, %s", nodeid, nodeinfo.manufacturer ? nodeinfo.manufacturer : "id=" + nodeinfo.manufacturerid, nodeinfo.product ? nodeinfo.product : "product=" + nodeinfo.productid + ", type=" + nodeinfo.producttype);
    console.log('node%d: name="%s", type="%s", location="%s"', nodeid, nodeinfo.name, nodeinfo.type, nodeinfo.loc);
    for (var comclass in nodes[nodeid]["classes"]) {
        switch (comclass) {
            case 0x25: // COMMAND_CLASS_SWITCH_BINARY
            case 0x26: // COMMAND_CLASS_SWITCH_MULTILEVEL
                zwave.enablePoll(nodeid, comclass);
                break;
        }
        var values = nodes[nodeid]["classes"][comclass];
        console.log("node%d: class %d", nodeid, comclass);
        for (var idx in values) {
            console.log("node%d:   %s=%s", nodeid, values[idx]["label"], values[idx]["value"]);
        }
    }
    if (flagInit) {
        //Devo verificare se il node è presente nel sistema, ci sono diverse cose da controllare, la prima è la objects
        //Dove devo controllare se l'address c'è ed il protocol è z
        //Poi la addressBindToProperty
        //console.log(nodeinfo.product)
        var eepZ = nodeinfo.product.split(' ')[0]
        if (objects) {
            var foundZ = false
            for (var a in objects) {
                console.log(objects[a])
                if (objects[a].protocol === 'z' && Number(objects[a].address) === nodeid) {
                    console.log("Found in Objects")
                    foundZ = true;

                } else {

                }
            }
            if (!foundZ) {
                console.log("Installing new Object...")
                if (inserting != nodeid) {
                    Apio.io.emit('send_to_service', {
                        service: 'autoInstall',
                        message: 'apio_install_new_object',
                        data: {
                            protocol: 'z',
                            eep: eepZ,
                            address: String(nodeid)
                        }
                    });
                    inserting = nodeid
                    setInterval(function () {
                        inserting = false
                    }, 10000)
                }

            }
        }
    }
});

zwave.on("node available", function (nodeid, nodeinfo) {
    console.log("node available ", nodeid);
    console.log("node info ", nodeinfo);
});

zwave.on("node naming", function (nodeid, nodeinfo) {
    console.log("node naming ", nodeid);
    console.log("node info ", nodeinfo);
});

zwave.on("node event", function (nodeid, data) {
    console.log("node event ", nodeid);
    console.log("node data ", data);
});

zwave.on("notification", function (nodeid, notif, help) {
    console.log("node%d: notification(%d): %s", nodeid, notif, help);
});


//Questo evento viene scatenato quando è finito lo scan, solo dopo questo evento è possibile lanciare comandi.
zwave.on("scan complete", function () {
    console.log("==================== FINITO LO SCAN ==================");
    console.log("======== E' ORA POSSIBILE LANCIARE COMANDI ===========")
    flagInit = true;
});

//
zwave.on("controller command", function (nodeId, ctrlState, ctrlError, helpmsg) {
    console.log("controller command");
    console.log("nodeId ", nodeId);
    console.log("ctrlState ", ctrlState);
    console.log("ctrlError ", ctrlError);
    console.log("helpmsg ", helpmsg);
    if (flagInit && flagLearn) {
        if (helpmsg === "ControllerCommand - Completed") {
            if (objects) {
                for (var a in objects) {
                    if (objects[a].name == "Z-Wave" && objects[a].properties.hasOwnProperty('addNode')) {
                        var dataForEmit = {
                            objectId: objects[a].objectId,
                            properties: {
                                addNode: '0'
                            },
                            writeToDatabase: true,
                            writeToSerial: false
                        }


                        Apio.io.emit('apio_client_update', dataForEmit)

                    }
                }
            }
        }
    } else if (flagInit && flagLearn) {
        if (helpmsg === "ControllerCommand - Completed") {
            if (objects) {
                for (var a in objects) {
                    if (objects[a].name == "Z-Wave" && objects[a].properties.hasOwnProperty('removeNode')) {
                        var dataForEmit = {
                            objectId: objects[a].objectId,
                            properties: {
                                removeNode: '0'
                            },
                            writeToDatabase: true,
                            writeToSerial: false
                        }


                        Apio.io.emit('apio_client_update', dataForEmit)

                    }
                }
            }
        }
    }

});

var zwavedriverpaths = {
    darwin: "/dev/cu.usbmodem411",
    linux: "/dev/ttyUSB0",
    windows: "\\\\.\\COM3"
};


//Faccio la ricerca del dongle ZWave, all'inizio di questo service ci sono tutti i dongle compatibili,
//La ricerca poi viene fatta tramite ProductId e VendorId
var found = 0;
com.list(function (err, ports) {
    if (err) {
        console.log("Unable to get serial ports, error: ", err);
    } else {
        ports.forEach(function (port, portsRef, index) {
            console.log(port);
            for (var a in compatibleDongle) {
                //console.log(compatibleDongle[a].productId+ " === "+port.productId +" && "+ port.vendorId+" ==="  +compatibleDongle[a].vendorId, compatibleDongle[a].productId.trim() === port.productId.trim(), compatibleDongle[a].vendorId.trim() === port.vendorId.trim());
                //if (compatibleDongle[a].productId && port.productId && compatibleDongle[a].vendorId && port.vendorId) {
                //console.log(compatibleDongle[a].productId+ " === "+port.productId +" && "+ port.vendorId+" ==="  +compatibleDongle[a].vendorId, compatibleDongle[a].productId.trim() === port.productId.trim(), compatibleDongle[a].vendorId.trim() === port.vendorId.trim())
                //}
                if (compatibleDongle[a].productId === port.productId && compatibleDongle[a].vendorId === port.vendorId) {
                    console.log("OK");
                    console.log("Starting ZWAVE network");
                    console.log("#############port.comName###########");
                    console.log("port.comName: ", port.comName);
                    zwavePort = port.comName;
                    zwave.connect(port.comName);
                    searchDongleFlag = 0;
                    if (searchDongleInterval) {
                        clearInterval(searchDongleInterval);
                    }
                    found = 1;
                    break;
                }
            }

            if (index === portsRef.length - 1) {
                if (found) {
                    //zwave.connect(port.comName);
                } else {
                    console.log("No DONGLE");
                    setTimeout(function () {
                        console.log("-------------------NO DONGLE-------------------");
                        process.exit()
                    }, 10000);

                    //searchDongle();
                    //searchDongleFlag = 1;
                }
            }
            /*if (String(port.manufacturer) === "Apio Dongle" || String(port.manufacturer) === "Apio_Dongle") {
             //console.log('Chiamo Apio.Serial.init()');
             //console.log("con porta ",String(port.comName))
             Apio.Configuration.serial.port = String(port.comName);
             serialInstance = {};

             serialInstance = Apio.Serial.init();
             return;
             }*/
        })
    }
});

//zwave.connect("/dev/ttyACM1");

//QUesta rotta permette al sistema di aggiungere un nodo
//In ZWave, il controller si mette in modalità di learning da questo momento in poi può essere aggiunto un nodo
//seguendo la procedura di accoppiamento di quel nodo.
//{Le fibaro smart plug si accoppiano quando vengono alimentate se il dongle è in learning mode}
app.get("/addNode", function (req, res) {
    console.log("/addNode");
    if (zwave.hasOwnProperty("beginControllerCommand")) {
        zwave.beginControllerCommand("AddDevice", true);
        flagLearn = true
    } else {
        zwave.addNode(false);
    }
    res.send(200)
});

//QUesta rotta permette al sistema di rimuovere un nodo
//In ZWave, il controller si mette in modalità di remove da questo momento in poi può essere rimosso un nodo
//seguendo la procedura di disaccoppiamento di quel nodo.
//{Le fibaro smart plug si disaccoppiano premendo tre volte velocemente il bottone se il dongle è in remove mode}
app.get("/removeNode", function (req, res) {
    if (zwave.hasOwnProperty("beginControllerCommand")) {
        zwave.beginControllerCommand("RemoveDevice", true);
        flagRemove = true;
    } else {
        zwave.removeNode();
    }
    res.send(200)
});

//QUesta rotta permette al sistema di cancellare un comando per il dongle
//In ZWave, se metti in remove o add il dongle ma non rimuovi ne aggiungi un nodo quello rimane in quella modalità finchè
// non mandi questo comando.
app.get("/cancelControllerCommand", function (req, res) {
    zwave.cancelControllerCommand();
    flagLearn = false
    flagRemove = false;
    res.send(200)
});

app.get("/hardReset", function (req, res) {
    zwave.hardReset();
    res.send(200)
});

//Questa rotta permette di settare un valore di una classe del dispositivo.
//Prendiamo ad esempio questo value:
/*-------------------------
 { value_id: "6-37-1-0",
 node_id: 6,
 class_id: 37,
 type: "bool",
 genre: "user",
 instance: 1,
 index: 0,
 label: "Switch",
 units: "",
 help: "",
 read_only: false,
 write_only: false,
 is_polled: false,
 min: 0,
 max: 0,
 value: false }
 ________________________________ */
// questa va cambiata in una socket sicuramente
//Se vogliamo switchare la presa dovremo mandare una cosa del genere:
//zwave.setValue(NODEID , CLASS, INSTANCE, INDEX, VALORE);
//Nel caso di questo nodo per accende e spegnere manderemo sta roba:
//zwave.setValue(6 , 37, 1, 0, true/false);
//
app.get("/setValue/:nodeId/:class/:instance/:index/:value", function (req, res) {
    console.log("nodeId: ", req.params.nodeId);
    console.log("class: ", req.params.class);
    console.log("instance: ", req.params.instance);
    console.log("index: ", req.params.index);
    console.log("value: ", req.params.value);
    zwave.setValue(req.params.nodeId, req.params.class, req.params.instance, req.params.index, Number(req.params.value));
    res.send(200);
});

//La presa FIBARO non ha bisogno di questo perchè aggiorna ogni volta che cambia il valore della potenza e di energia,
//ma sul alcuni dispositivi è necessario metterlo
app.get("/enablePoll/:nodeId/:class/:intensity", function (req, res) {
    console.log("nodeId: ", req.params.nodeId);
    console.log("class: ", req.params.class);
    console.log("intensity: ", req.params.intensity);
    zwave.enablePoll(req.params.nodeId, req.params.class, req.params.intensity);
    res.send(200);
});

process.on("SIGINT", function () {
    console.log("disconnecting...");
    zwave.disconnect(zwavePort);
    process.exit();
});

var port = 5000;
//var server = http.createServer(app);

socketServer.on("connection", function (Socket) {
    Socket.on("update_collections", function () {
        console.log("Sono dentro update collections");
        Apio.Object.list("admin", function (err, oBjects) {
            if (err) {

            } else {
                // console.log('OBJECTS IS: ', oBjects);
                //objects = JSON.parse(JSON.stringify(oBjects));
                objects = {};
                for (var i in oBjects) {
                    objects[oBjects[i].objectId] = oBjects[i];
                }
            }
        });

        Apio.Database.db.collection("Communication").findOne({'name': 'integratedCommunication'}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {

                communication = doc;
                // console.log('la collection communication contiene: ', communication)
            }
        });

        Apio.Database.db.collection("Communication").findOne({'name': 'addressBindToProperty'}, function (err, doc) {
            if (err) {
                ////console.log("Error while trying to retrieve the serial address. Aborting Serial.send");
            } else if (doc) {

                bindToProperty = doc;
                // console.log('la collection communication contiene: ', communication)
            }
        });
    });
});

http.listen(port, "localhost", function () {
// http.listen(port, function () {
    console.log("Server start at port " + port);
    Apio.Database.connect(function () {
        Apio.Database.db.collection("Services").findOne({name: "zwave"}, function (err, service) {
            if (err) {
                console.log("Error while getting service Z-Wave: ", err);
                console.log("Service Z-Wave DOESN'T Exists, creating....");
                database.collection("Services").insert({
                    name: "zwave",
                    show: "Z-Wave",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Z-Wave on DB: ", err);
                    } else {
                        console.log("Service Z-Wave successfully created");
                    }
                });
            } else if (service) {
                console.log("Service Z-Wave exists");
            } else {
                console.log("Unable to find service Z-Wave");
                console.log("Service Z-Wave DOESN'T Exists, creating....");
                Apio.Database.db.collection("Services").insert({
                    name: "zwave",
                    show: "Z-Wave",
                    url: "https://github.com/ApioLab/Apio-Services",
                    username: "",
                    password: "",
                    port: String(port)
                }, function (err) {
                    if (err) {
                        console.log("Error while creating service Z-Wave on DB: ", err);
                    } else {
                        console.log("Service Z-Wave successfully created");
                    }
                });
            }
        });
    });

    var gc = require("./garbage_collector.js");
    gc();
});