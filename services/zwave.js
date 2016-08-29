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

var Apio = require("../apio.js")(require("../configuration/default.js"), false);
var fs = require("fs");
Apio.io = require("socket.io-client")("http://localhost:" + Apio.Configuration.http.port, {query: "associate=zwave&token=" + Apio.Token.getFromText("zwave", fs.readFileSync("../" + Apio.Configuration.type + "_key.apio", "utf8"))});

var express = require("express");
var http = require("http");
var app = express();

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
    zwave.setValue(nodeId, classZ, instance, index, value);

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

Apio.io.on("apio_zwave_send", function (data) {
    console.log(data);
    console.log("il dato è", data);

    console.log("id ", data.address);
    //console.log("base ", enocean.base);
    //il comando di seguito serve per richiedere al dongle il suo indirizzo
    //enoceanSend("00" ,"05", "03","");

    //il comando di seguito invia un telegramma di tipo vld con il comando 01 con playload 011e64 all'oggetto con Id 019275d1
    //enoceanSend("d2", "01", "011e64", "019275d1");

    //prove calcolo CRC8 L e H
    /*var provaCRC8H = enocean.pad( enocean.crc( new Buffer("00070701","hex") ).toString( 16 ) , 2 )
     console.log("provaCRC8L ",provaCRC8H);

     var provaCRC8L = enocean.pad( enocean.crc( new Buffer("f60000298b822001ffffffff3600","hex") ).toString( 16 ) , 2 )
     console.log("provaCRC8L ",provaCRC8L);*/
    zwaveSendToDevice(data, data.allProperties);
    console.log("++++++++INVIATO++++++++");
})
Apio.io.on("apio_server_update", function(data){
	console.log("apio_server_update")
	console.log(data)
})

/*
 * OpenZWave test program.
 */
//Qui c'è express che ho usato per fare tutte le prove
//var express = require("express");
//var http = require("http");
//var app = express();
//dipendenze Z-Wave
var OpenZWave = require("openzwave-shared");
var os = require("os");

//Istanza
var zwave = new OpenZWave({
    ConsoleOutput: false
});

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
    zwave.disconnect();
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
});

//Questo evento viene scatenato ogni qualvolta viene rimosso un valore da un node, non mi è mai capitato di vederlo scatenato
//con le prese fibaro.
zwave.on("value removed", function (nodeid, comclass, index) {
    console.log("value removed");
    if (nodes[nodeid]["classes"][comclass] && nodes[nodeid]["classes"][comclass][index]) {
        delete nodes[nodeid]["classes"][comclass][index];
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
});

//
zwave.on("controller command", function (nodeId, ctrlState, ctrlError, helpmsg) {
    console.log("controller command");
    console.log("nodeId ", nodeId);
    console.log("ctrlState ", ctrlState);
    console.log("ctrlError ", ctrlError);
    console.log("helpmsg ", helpmsg);
});

var zwavedriverpaths = {
    darwin: "/dev/cu.usbmodem411",
    linux: "/dev/ttyUSB0",
    windows: "\\\\.\\COM3"
};

console.log("connecting to " + zwavedriverpaths[os.platform()]);
zwave.connect("/dev/ttyACM1");

//QUesta rotta permette al sistema di aggiungere un nodo
//In ZWave, il controller si mette in modalità di learning da questo momento in poi può essere aggiunto un nodo
//seguendo la procedura di accoppiamento di quel nodo.
//{Le fibaro smart plug si accoppiano quando vengono alimentate se il dongle è in learning mode}
app.get("/addNode", function (req, res) {
    if (zwave.hasOwnProperty("beginControllerCommand")) {
        zwave.beginControllerCommand("AddDevice", true);
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
    zwave.disconnect();
    process.exit();
});

var port = 5000;
var server = http.createServer(app);
server.listen(port, function () {
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
});