"use strict";
var express = require("express");
var path = require("path");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var http = require("http");
var app = express();
var Apio = require("./apio.js");
var fs = require('fs');
var domain = require('domain');
var async = require('async');
var request = require('request');
var net = require('net');
var ENVIRONMENT = "productio";
var targz = require('tar.gz');
var formidable = require('formidable');


var HOST = '192.168.1.109';
var PORT = 6969;

var routes = {};
routes.dashboard = require('./routes/dashboard.route.js');
routes.core = require('./routes/core.route.js');



var d = domain.create();
// Because req and res were created before this domain existed,
    // we need to explicitly add them.
    // See the explanation of implicit vs explicit binding below.


    //Il domain è un "ambiente chiuso" in cui far finire gli errori per non crashare il server
    //L'alternativa è fail fast e restart ma non mi piace
d.on('error',function(err){
    //Apio.Util.debug("Apio.Server error : "+err);
    //Apio.Util.debug(err.stack);
    Apio.Util.printError(err);
});

d.run(function(){


function puts(error, stdout, stderr) {
    sys.puts(stdout);
}


if (ENVIRONMENT == 'production')
    Apio.Serial.init();

Apio.Socket.init(http);
Apio.Database.connect(function(){
    /*
    Inizializzazione servizi Apio
    Fatti nel callback della connessione al db perchè ovviamente devo avere il db pronto come prima cosa
    */

    Apio.System.resumeCronEvents(); //Ricarica dal db tutti i cron events
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");


app.use(logger("dev"));
app.use(bodyParser.json());

app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));


;

app.post('/apio/adapter',function(req,res){
                var req_data = {
                        json : true,
                        uri : req.body.url,
                        method : "POST",
                        body : req.body.data
                }
                console.log("\n\n /apio/adapter sending the following request")
                console.log(req_data);
                console.log("\n\n")
                var _req = request(req_data,function(error,response,body){

                        if ('200' === response.statusCode || 200 === response.statusCode) {
                            console.log("Apio Adapter method : got the following response from "+req.body.url)
                            console.log(body);
                            res.send(body)
                        }
                        else {
                            console.log("Apio Adapter : Something went wrong ")
                            res.status(response.statusCode).send(body);
                        }
                });
})

app.get("/dashboard",routes.dashboard.index);






/*
*   Crea un nuovo evento
**/
app.post("/apio/event",routes.core.events.create);

app.get('/apio/notifications',routes.core.notifications.list);
app.post('/apio/notifications/markAsRead',routes.core.notifications.delete)
/* Returns all the events */
app.get("/apio/event",routes.core.events.list)
/* Return event by name*/
app.get("/apio/event/:name",routes.core.events.getByName)

app.delete("/apio/event/:name",routes.core.events.delete)

app.put("/apio/event/:name",routes.core.events.update);

/****************************************************************
****************************************************************/

app.post("/apio/state/apply",function(req,res){
        var incomingState = req.body.state;
        console.log("+++++++++++++++++++++++++++++\n\n")
        console.log("Ricevuta richiesta di stato ")
        console.log(incomingState);

        var stateHistory = {};

        var getStateByName = function(stateName,callback) {
            Apio.Database.db.collection('States').findOne({name : stateName},callback);
        }
        //Mi applica lo stato se non è già stato applicato
        var applyStateFn = function(stateName) {

            console.log("\n\nApplico lo stato "+stateName+"\n\n")
            if (!stateHistory.hasOwnProperty(stateName)) { //se non è nella history allora lo lancio
                getStateByName(stateName,function(err,state){
                    if (err) {
                        console.log("applyState unable to apply state")
                        console.log(err);
                    } else {
                        Apio.Database.db.collection("States").update({name : state.name}, {$set : {active : !state.active}}, function(err){
                            if (!err) {
                                Apio.io.emit("apio_state_update", {name : state.name, properties : state.properties, active : !state.active});
                            }
                        });
                        console.log("Lo stato che sto per applicare è ")
                        console.log(state)
                        Apio.Database.updateProperty(state,function(){
                            //Connected clients are notified of the change in the database
                            Apio.io.emit("apio_server_update",state);
                            if (ENVIRONMENT == 'production')
                            Apio.Serial.send(state);
                            stateHistory[state.name] = 1;
                            //Ora cerco eventuali eventi
                            Apio.Database.db.collection("Events").find({triggerState : state.name}).toArray(function(err,data){
                                if (err) {
                                    console.log("error while fetching events");
                                    console.log(err);
                                }
                                console.log("Ho trovato eventi scatenati dallo stato "+state.name);
                                console.log(data)
                                //data è un array di eventi
                                data.forEach(function(ev,ind,ar){
                                        var states = ev.triggeredStates;
                                        states.forEach(function(ee,ii,vv){
                                            setTimeout(function(){
                                                applyStateFn(ee);
                                            },1000);

                                        })
                                        async.eachSeries(states,function(stato,callback){
                                            setTimeout(function(){
                                                applyStateFn(stato,callback);
                                            },500);
                                        })
                                })

                            })
                        });
                    }
                })

            } else {

                console.log("Skipping State application because of loop.")
            }

        } //End of applyStateFn
        applyStateFn(incomingState.name);
});

app.delete("/apio/state/:name",function(req,res){
    console.log("Mi arriva da eliminare questo: "+req.params.name)
    Apio.Database.db.collection("States").remove({name : req.params.name},function(err){
        if (!err) {
            Apio.io.emit("apio_state_delete",{name : req.params.name});
            res.send({error : false});
        }
        else
            res.send({error : 'DATABASE_ERROR'});
    })
})


app.put("/apio/state/:name",function(req,res){
    console.log("Mi arriva da modificare questo stato: "+req.params.name);
    console.log("Il set di modifiche è ")
    console.log(req.body.state);

    var packagedUpdate = { properties : {}};
    for (var k in req.body.state) {
        packagedUpdate.properties[k] = req.body.state[k];
    }

    Apio.Database.db.collection("States").update({name : req.params.name},{$set : packagedUpdate},function(err){
        if (!err) {
            Apio.io.emit("apio_state_update",{name : req.params.name, properties : req.body.state});
            res.send({error : false});
        }
        else
            res.send({error : 'DATABASE_ERROR'});
    })
})


/*
    Creazione stato
 */
app.post("/apio/state",routes.core.states.create);


/*
    Returns state list
 */
app.get("/apio/state",routes.core.states.get);
/*
Returns a state by its name
 */
app.get("/apio/state/:name",routes.core.states.getByName);



app.get("/app",function(req,res){
    res.sendfile("public/html/app.html");
})


/*
*   Lancia l'evento
*/
app.get("/apio/event/launch",routes.core.events.launch)
/*
*   restituisce la lista degli eventi
*/
app.get("/apio/event",routes.core.events.list)

/// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message,
            error: err
        });
        //Da testare
        next();
    });
}



// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: {}
    });
    //Da testare
    next();
});



//FIXME andrebbero fatte in post per rispettare lo standard REST
app.post('/apio/serial/send',function(req,res){

         var keyValue = req.body.message;
            if (req.body.isSensor === true)
                keyValue = 'r'+keyValue;
            var keyValue = keyValue.slice(0,-1);
            var tokens = keyValue.split(":");
            var props = {};
            props[tokens[0]] = tokens[1];

            var obj = {
                objectId: req.body.objectId,
                properties : props
            };
            console.log("Questo è loggetto che arriva da /apio/serial/send")
            console.log(obj);

            Apio.Serial.send(obj);
            res.send();
});
app.post('/apio/sensor/register',function(req,res){
    //Mi vado a prendere protocolo e indirizzo del sensore
    //scrivo in seriale il messaggio
});



/* APIO creation and export of the .tar container of the App */
app.get('/apio/app/export', function(req,res){
    console.log('/apio/app/export')
    var id = req.query.id;
    var dummy = '8=====D';
    var path = 'public/applications/'+id+'/'+id;
    var object = {};
    var jsonObject = {};

    object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
    object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
    //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
    object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
    object.ino = fs.readFileSync(path+'/'+id+'.ino', {encoding: 'utf8'});
    object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

    //jsonObject = JSON.parse(object.json);
    jsonObject = JSON.parse(object.mongo);
    console.log('jsonObject.name: '+jsonObject.name);
    
    //TO FIX: MAKE REPLACE RECOURSIVE
    object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
    object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
    object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
    
    object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
    object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
    object.html=object.html.replace('applications/'+id+'/'+id+'.js','applications/'+dummy+'/'+dummy+'.js');

    //object.json=object.json.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');
    object.mongo=object.mongo.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');

    try {
        var path = 'public/';
        console.log('path + dummy:'+path + dummy);
        console.log('target: public/exported/'+jsonObject.name+'.tar.gz');
        fs.mkdirSync(path+'/temp');
        path = 'public/temp';
        fs.mkdirSync(path +'/'+ dummy);
        fs.mkdirSync(path +'/'+ dummy + '/' + dummy);
        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '/' + dummy + '.ino',object.ino);
        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',object.mongo);
        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '/Makefile',object.makefile);
        //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
 
        //var compress = new targz().compress('/applications/:id', '/applications/temp/:id.tar.gz', function(err){
        
        var compress = new targz().compress(path +'/'+ dummy, path+'/'+jsonObject.name+'.tar.gz', function(err){
            if(err)
                console.log(err);
            else
            {
                res.download(path+'/'+jsonObject.name+'.tar.gz',jsonObject.name+'.tar.gz',function(err){
                    if(err){
                        console.log(err);
                    }else{
                        console.log('deleting temp folder '+'public/temp')
                        var deleteFolderRecursive = function(path) {
                            console.log('deleting the directory '+path);
                            if( fs.existsSync(path) ) {
                                fs.readdirSync(path).forEach(function(file,index){
                                  var curPath = path + "/" + file;
                                  if(fs.lstatSync(curPath).isDirectory()) { // recurse
                                    deleteFolderRecursive(curPath);
                                  } else { // delete file
                                    fs.unlinkSync(curPath);
                                  }
                                });
                                fs.rmdirSync(path);
                            }
                        };
                        deleteFolderRecursive(path);
                        //fs.unlinkSync(path+jsonObject.name+'.tar.gz');
                    }
                });
                console.log('The compression has ended!');
            }
        });

    } catch(e) {
        res.status(500).send();
        console.log(e);
        return;
    }


    
});

/* APIO upload of the App */
app.post('/apio/app/upload', function(req,res){
    console.log('/apio/app/upload')
    fs.mkdirSync('upload');
    
    var form = new formidable.IncomingForm();
        form.uploadDir = "upload";
        form.keepExtensions = true;


        form.on('file', function(name, file) {
            console.log('file name: '+file.name);
            console.log('file path: '+file.path);
            fs.rename(file.path, 'upload/'+file.name);

            var compress = new targz().extract('upload/'+file.name, 'upload/temp', function(err){
                if(err)
                    console.log(err);

                console.log('The extraction has ended!');
                //recupero max actual id
                Apio.Database.getMaximumObjectId(function(error, data){
                    if(error){
                        console.log('error: '+error);
                    }
                    else if(data){
                        console.log(data);
                        //qui rinomino i cazzetti nell'id attuale

                        var id = '8=====D';
                        var path = 'upload/temp/'+id+'/'+id;
                        var object = {};
                        var jsonObject = {};

                        object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
                        object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
                        //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
                        object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
                        object.ino = fs.readFileSync(path+'/'+id+'.ino', {encoding: 'utf8'});
                        object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

                        //jsonObject = JSON.parse(object.json);
                        jsonObject = JSON.parse(object.mongo);
                        console.log('jsonObject.name: '+jsonObject.name);

                        var dummy = (parseInt(data)+1).toString();
                        
                        
                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
                        
                        object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
                        object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
                        object.html=object.html.replace('applications/'+id+'/'+id+'.js','applications/'+dummy+'/'+dummy+'.js');

                        //object.json=object.json.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');
                        object.mongo=object.mongo.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');
                        
                        //Apio.Database.db.collection('Objects').insert(JSON.parse(object.json),function(err,data){
                        Apio.Database.db.collection('Objects').insert(JSON.parse(object.mongo),function(err,data){
                            if(err)
                                console.log(err);
                            else
                            {
                                var deleteFolderRecursive = function(path) {
                                    console.log('deleting the directory '+path);
                                    if( fs.existsSync(path) ) {
                                        fs.readdirSync(path).forEach(function(file,index){
                                          var curPath = path + "/" + file;
                                          if(fs.lstatSync(curPath).isDirectory()) { // recurse
                                            deleteFolderRecursive(curPath);
                                          } else { // delete file
                                            fs.unlinkSync(curPath);
                                          }
                                        });
                                        fs.rmdirSync(path);
                                    }
                                };

                                var path = 'public/applications/';
                                console.log('path + dummy:'+path + dummy);

                                fs.mkdirSync(path +'/'+ dummy);
                                fs.mkdirSync(path +'/'+ dummy + '/' + dummy);
                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '/' + dummy + '.ino',object.ino);
                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',object.mongo);
                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '/Makefile',object.makefile);
                                //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
                                deleteFolderRecursive('upload');
                            }
                        });
                        
                        

                        //fine
                    }

                })
            });

        });

        form.parse(req, function(err, fields, files) {
          console.log('received upload:\n\n');
          res.send(200);
        });

    return;

});

//QUESTA E' NUOVA
app.post('/apio/app/maximumId', function(req,res){
    console.log('/apio/app/maximumId');
    Apio.Database.getMaximumObjectId(function(error,data){
        if(error){
            console.log('error: '+error);
        }
        else if(data){
            console.log(data);
            res.send(data);
        }
    });
})

/* APIO delete of the App */
app.post('/apio/app/delete', function(req,res){
    var id = req.body.id;
    var deleteFolderRecursive = function(path) {
        console.log('deleting the directory '+path);
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
              var curPath = path + "/" + file;
              if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
              } else { // delete file
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(path);
        }
    };

    Apio.Database.deleteObject(id,function(err){
        if(err){
            console.log('error while deleting the object '+id+' from the db');
            res.status(500).send();
        }
        else{

           deleteFolderRecursive('public/applications/'+id);
           res.send(200);
        }

    })
    
});

/* APIO modify of the App */
app.post('/apio/app/modify', function(req,res){
    var id = req.body.id;
    var path = 'public/applications/'+id+'/'+id;
    console.log(path);
    var object = {};

    object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
    object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
    //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
    object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
    object.ino = fs.readFileSync(path+'/'+id+'.ino', {encoding: 'utf8'});
    
    /*console.log('js:\n'+object.js);
    console.log('html:\n'+object.html);
    console.log('json:\n'+object.json);
    console.log('mongo:\n'+object.mongo);
    console.log('ino:\n'+object.ino);*/

    res.send(object);

});

/*APIO update of the application for a specified object*/
app.post('/apio/database/updateApioApp', function(req,res){
    var objectId = req.body.objectId;
    var ino = req.body.ino;
    var html = req.body.html;
    var js = req.body.js;
    var mongo = req.body.mongo;
    console.log('updating the object: '+objectId);
    //si potrebbero usare writeFile (asincrono) annidati ed eliminare il try catch
    try {
        fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '/' + objectId + '.ino',ino);
        fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.html',html);
        fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.js',js);
        fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.mongo',mongo);
        //fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '/Makefile',makefile);
        //fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.json',JSON.stringify(objectToSave));
    } catch(e) {
        res.status(500).send();
        return;
    }

    res.send(200);
   
});

/*APIO creation of the new ino html js mongo files from the wizard*/
app.post('/apio/database/createNewApioAppFromEditor', function(req,res){
    var obj = req.body.object;
    var mongo = req.body.mongo;
    var ino = req.body.ino;
    var html = req.body.html;
    var js = req.body.js;
    var makefile = req.body.makefile;    

    console.log('APIO: Creating application ' + obj.objectId);
    fs.mkdirSync("public/applications/" + obj.objectId);
    fs.mkdirSync("public/applications/" + obj.objectId +'/' + obj.objectId);

    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/' + obj.objectId + '.ino',ino);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/Makefile',makefile);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.html',html);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.js',js);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.mongo',mongo);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.json',JSON.stringify(obj));

    Apio.Database.registerObject(obj,function(error){
        if (error) {
            console.log("/apio/Database/createNewApioAppFromEditor Error while saving");
            res.send(500);
        }else{
            res.send();
        }
    });   

});

/*APIO creation of the new ino html js mongo files from the wizard*/
app.post('/apio/database/createNewApioApp', function(req,res){
    var obj = req.body.object;
    //console.log('properties : '+ obj.properties);
    var mongo = req.body.mongo;
    var ino = req.body.ino;
    var html = req.body.html;
    var js = req.body.js;
    var makefile = req.body.makefile;
    console.log('makefile: '+makefile);
    console.log('req.makefile: '+req.body.makefile);
    var objectToSave = {properties:{}};

    objectToSave.name = obj.objectName;
    objectToSave.objectId = obj.objectId;
    objectToSave.protocol = obj.protocol;
    objectToSave.address = obj.address;

    for (var key in obj.properties){
        console.log('key : '+key);
        if(obj.properties[key].type!=='List'){ 
            console.log('obj.properties[key].name: ' + obj.properties[key].name);
            console.log('obj.properties[key].defaultValue: ' + obj.properties[key].defaultValue);
            objectToSave.properties[obj.properties[key].name] =  obj.properties[key].defaultValue;
            console.log('objectToSave.properties[obj.properties[key].name]: ' + objectToSave.properties[obj.properties[key].name]);
        }else{

            var returnFirstListItemValue = function(o){
                //bisognerebbe far settare la voce della select che vogliono come prima voce attraverso il wizard
                for(var k in o) return k;
            }

            console.log('obj.properties[key].name: ' + obj.properties[key].name);
            console.log('obj.properties[key].firstItemValue: ' + returnFirstListItemValue(obj.properties[key].items));
            objectToSave.properties[obj.properties[key].name] = returnFirstListItemValue(obj.properties[key].items);
            console.log('objectToSave.properties[obj.properties[key].name]: ' + objectToSave.properties[obj.properties[key].name]);
        }
        console.log();
    }; 

    //objectToSave.db=JSON.parse(mongo.slice(7,mongo.length)); //problema db : { db : { ... }}
    console.log('mongo: '+mongo);
    objectToSave.db=JSON.parse(mongo); //problema db : { db : { ... }}

    console.log('Object' + obj.objectId + 'is being manipulated by the server');
    console.log('APIO: Creating application ' + obj.objectId);
    fs.mkdirSync("public/applications/" + obj.objectId);
    fs.mkdirSync("public/applications/" + obj.objectId +'/' + obj.objectId);

    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/' + obj.objectId + '.ino',ino);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/Makefile',makefile);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.html',html);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.js',js);
    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.mongo',mongo);
    //fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.json',JSON.stringify(objectToSave));

    Apio.Database.registerObject(objectToSave,function(error){
        if (error) {
            console.log("/apio/Database/createNewApioApp Error while saving");
            res.send(500);
        }else{
            res.send();
        }
    });   

});





app.get('/apio/database/getObjects',routes.core.objects.get);
app.get('/apio/database/getObject/:id',routes.core.objects.getById);

app.patch('/apio/object/:id',routes.core.objects.update);
app.put('/apio/object/:id',routes.core.objects.update);



    //Handling Serial events and emitting
    //APIO Serial Port Listener
//module.exports = app;
/*
*   Socket listener instantiation
*/
Apio.io.on("connection", function(socket){
    socket.on("input", function(data){
        console.log(data);
        Apio.Database.updateProperty(data, function(){
            socket.broadcast.emit("apio_server_update_", data);
        });
        Apio.Serial.send(data);
    });

    console.log("a socket connected");
    socket.join("apio_client");

    socket.on("apio_client_update",function(data){

        console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        console.log("App.js on(apio_client_update)  received a message");

        //Loggo ogni richiesta
        //Commentato per capire cosa fare con sti log
        //Apio.Logger.log("EVENT",data);





        //Scrivo sul db
        if (data.writeToDatabase === true)
            Apio.Database.updateProperty(data,function(){
                //Connected clients are notified of the change in the database
                socket.broadcast.emit("apio_server_update",data);
            });
        else
            Apio.Util.debug("Skipping write to Database");


        //Invio i dati alla seriale se richiesto
        if (data.writeToSerial === true && ENVIRONMENT == 'production') {
            Apio.Serial.send(data);
        }
        else
            Apio.Util.debug("Skipping Apio.Serial.send");



    });
});


Apio.io.on("disconnect",function(){
    console.log("Apio.Socket.event A client disconnected");
});



var server = http.createServer(app);


Apio.io.listen(server);
server.listen(8083,function() {
console.log("APIO server started");
});




});




