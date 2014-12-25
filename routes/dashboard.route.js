var fs = require('fs');
var targz = require('tar.gz');
var formidable = require('formidable');
var ncp = require('ncp').ncp;
var Apio = require("../apio.js");

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

module.exports = {
	index : function(req,res) {
			res.sendfile("public/dashboardApp/dashboard.html");
		},
	updateApioApp : function(req,res){
	    var objectId = req.body.objectId;
	    var newId = req.body.newId;
	    var ino = req.body.ino;
	    var html = req.body.html;
	    var js = req.body.js;
	    var mongo = req.body.mongo;
	    var makefile = req.body.makefile;
	    console.log('updating the object: '+objectId)+' with the new id '+newId;
	    console.log('ino: '+ino);
	    //si potrebbero usare writeFile (asincrono) annidati ed eliminare il try catch

	    if(objectId === newId){
	    	Apio.Database.db.collection('Objects').update({'objectId':objectId},JSON.parse(mongo),function(error){
	    		if(error){
	    			console.log(error);
	    			console.log(e);
	       			res.status(500).send();
	    		}else{
	    			fs.writeFileSync('public/applications/'+newId+'/_' + newId + '/_' + newId + '.ino',ino);
			        fs.writeFileSync('public/applications/'+newId+'/_' + newId + '/Makefile',makefile);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.html',html);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.js',js);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.mongo',mongo);
			        //fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.json',JSON.stringify(objectToSave));
				    res.send(200);
	    		}
	    	})
	    }else{
	    	Apio.Database.db.collection('Objects').insert(JSON.parse(mongo),function(error,count){
	    		if(error){
	    			console.log(error);
	    			console.log(e);
	       			res.status(500).send();
	    		}
	    		else{
		    		fs.writeFileSync('public/applications/'+newId+'/_' + newId + '/_' + newId + '.ino',ino);
			        fs.writeFileSync('public/applications/'+newId+'/_' + newId + '/Makefile',makefile);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.html',html);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.js',js);
			        fs.writeFileSync('public/applications/'+newId+'/' + newId + '.mongo',mongo);
			        //fs.writeFileSync('public/applications/'+objectId+'/' + objectId + '.json',JSON.stringify(objectToSave));
				    res.send(200);
			    }
	    	})
	    }
	   
	},
	folderApioApp : function(req,res){
		var id = req.body.id;
		console.log('making the folder for updated app with new id '+id);

		var path = 'public/applications/';
		try{
			fs.mkdirSync(path +'/'+ id);
	    	fs.mkdirSync(path +'/'+ id + '/_' + id);
	    }
	    catch(e){
	    	console.log(e);
	    	res.status(500).send({});
	    }
	    res.send(200);
	},
	modifyApioApp : function(req,res){
	    var id = req.body.id;
	    var path = 'public/applications/'+id+'/'+id;
	    console.log(path);
	    var object = {};

	    object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
	    object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
	    //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
	    object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
	    path = 'public/applications/'+id+'/_'+id;
	    object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
	    object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});
	    
	    /*console.log('js:\n'+object.js);
	    console.log('html:\n'+object.html);
	    console.log('json:\n'+object.json);
	    console.log('mongo:\n'+object.mongo);
	    console.log('ino:\n'+object.ino);*/

	    res.send(object);

	},
	createNewApioAppFromEditor : function(req,res){
	    var obj = req.body.object;
	    var mongo = req.body.mongo;
	    var ino = req.body.ino;
	    var html = req.body.html;
	    var js = req.body.js;
	    var makefile = req.body.makefile;    

	    console.log('APIO: Creating application ' + obj.objectId);
	    fs.mkdirSync("public/applications/" + obj.objectId);
	    fs.mkdirSync("public/applications/" + obj.objectId +'/_' + obj.objectId);

	    fs.writeFileSync('public/applications/'+obj.objectId+'/_' + obj.objectId + '/_' + obj.objectId + '.ino',ino);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/_' + obj.objectId + '/Makefile',makefile);
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

	},
	createNewApioApp : function(req,res){
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

	            //vecchia versione cambiata per allinearsi alla logica di matteo
	            /*console.log('obj.properties[key].name: ' + obj.properties[key].name);
	            console.log('obj.properties[key].firstItemValue: ' + returnFirstListItemValue(obj.properties[key].items));
	            objectToSave.properties[obj.properties[key].name] = returnFirstListItemValue(obj.properties[key].items);
	            console.log('objectToSave.properties[obj.properties[key].name]: ' + objectToSave.properties[obj.properties[key].name]);*/
	        }
	        console.log();
	    }; 

	    //objectToSave.db=JSON.parse(mongo.slice(7,mongo.length)); //problema db : { db : { ... }}
	    console.log('mongo: '+mongo);
	    objectToSave.db=JSON.parse(mongo); //problema db : { db : { ... }}

	    console.log('Object' + obj.objectId + 'is being manipulated by the server');
	    console.log('APIO: Creating application ' + obj.objectId);

	    //Apio.Database.registerObject(objectToSave,function(error){
	    Apio.Database.registerObject(JSON.parse(mongo),function(error){
	        if (error) {
	            console.log("/apio/Database/createNewApioApp Error while saving");
	            res.send(500);
	        }else{
	            //QUA

	            fs.mkdirSync("public/applications/" + obj.objectId);
	            fs.mkdirSync("public/applications/" + obj.objectId +'/_' + obj.objectId);
	            fs.mkdirSync("public/applications/" + obj.objectId +'/_' + obj.objectId+'/XBee');

	            fs.writeFileSync('public/applications/'+obj.objectId+'/_' + obj.objectId + '/_' + obj.objectId + '.ino',ino);
	            fs.writeFileSync('public/applications/'+obj.objectId+'/_' + obj.objectId + '/Makefile',makefile);
	            fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.html',html);
	            fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.js',js);
	            fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.mongo',mongo);
	            //fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.json',JSON.stringify(objectToSave));
	            
	            //Insert libraries
	            var source = 'public/arduino/';
	            console.log('obj.protocol: '+ obj.protocol);
	            if(obj.protocol==='z'){
	                source += 'XBee';
	            }else if (obj.protocol==='l'){
	                source += 'LWM';
	            }
	            console.log('source: '+ source);
	            var destination = 'public/applications/'+obj.objectId+'/_' + obj.objectId ;

	            ncp.limit = 16;

	            ncp(source, destination, function (err) {
	             if (err) {
	               return console.error(err);
	             }
	             console.log('done!');
	            });

	            source = 'public/arduino/apioGeneral';
	            ncp(source, destination, function (err) {
	             if (err) {
	               return console.error(err);
	             }
	             console.log('done!');
	            });

	            res.send();
	        }
	    });   

	},
	exportApioApp : function(req,res){
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
	    path = 'public/applications/'+id+'/_'+id;
	    object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
	    object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

	    //jsonObject = JSON.parse(object.json);
	    jsonObject = JSON.parse(object.mongo);
	    console.log('jsonObject.name: '+jsonObject.name);
	    
	    //TO FIX: MAKE REPLACE RECURSIVE
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
	        path = 'public/temp';
	        fs.mkdirSync(path);
	        fs.mkdirSync(path +'/'+ dummy);
	        fs.mkdirSync(path +'/'+ dummy + '/_' + dummy);
	        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
	        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
	        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',object.mongo);
	        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/_' + dummy + '.ino',object.ino);
	        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/Makefile',object.makefile);
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
	
	},
	exportInoApioApp : function(req,res){
	    console.log('/apio/app/exportIno')
	    var obj = {};
	    obj.objectId = req.query.id;
	    
	    try {
	            var compress = new targz().compress("public/applications/" + obj.objectId +'/_' + obj.objectId, "public/applications/" + obj.objectId +'/' + obj.objectId +'.tar.gz', function(err){
	                if(err)
	                    console.log(err);
	                else
	                {
	                    console.log("public/applications/" + obj.objectId +'/' + obj.objectId +'.tar.gz');
	                    console.log(obj.objectId+'.tar.gz')
	                    res.download("public/applications/" + obj.objectId +'/' + obj.objectId +'.tar.gz',obj.objectId+'.tar.gz',function(err){
	                        if(err){
	                            console.log('There is an error')
	                            console.log(err);
	                        }else{
	                            console.log('Download has been executed')
	                            console.log('deleting temp folder '+'public/temp')

	                            //deleteFolderRecursive(path);
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
	    
	},
	deleteApioApp : function(req,res){
	    var id = req.body.id;

	    Apio.Database.deleteObject(id,function(err){
	       // Apio.Database.db.collection('Objects').remove({objectId : id}, function(err){
	        if(err){
	            console.log('error while deleting the object '+id+' from the db');
	            res.status(500).send();
	        }
	        else{

	           deleteFolderRecursive('public/applications/'+id);
	           res.send(200);
	        }

	    })
	    
	},
	uploadApioApp : function(req,res){
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
	                        console.log('data is: '+data);
	                        //qui rinomino i cazzetti nell'id attuale

	                        var id = '8=====D';
	                        var path = 'upload/temp/'+id+'/'+id;
	                        var object = {};
	                        var jsonObject = {};

	                        object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
	                        object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
	                        //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
	                        object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
	                        path = 'upload/temp/'+id+'/_'+id;
	                        object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
	                        object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

	                        //jsonObject = JSON.parse(object.json);
	                        jsonObject = JSON.parse(object.mongo);
	                        console.log('jsonObject.name: '+jsonObject.name);

	                        var dummy = (parseInt(data)+1).toString();
	                        console.log('new dummy is: '+ dummy)
	                        
	                        
	                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
	                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
	                        object.js=object.js.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
	                        
	                        object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
	                        object.html=object.html.replace('ApioApplication'+id,'ApioApplication'+dummy+'');
	                        object.html=object.html.replace('applications/'+id+'/'+id+'.js','applications/'+dummy+'/'+dummy+'.js');

	                        //object.json=object.json.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"');
	                        //object.mongo=object.mongo.replace('"objectId":"'+id+'"','"objectId":"'+dummy+'"')
	                        object.mongo=JSON.parse(object.mongo);
	                        console.log('"objectId before":"'+object.mongo.objectId+'"')
	                        object.mongo.objectId=dummy;
	                        console.log('"objectId after":"'+object.mongo.objectId+'"')
	                        
	                        //Apio.Database.db.collection('Objects').insert(JSON.parse(object.json),function(err,data){
	                        Apio.Database.db.collection('Objects').insert(object.mongo,function(err,data){
	                            if(err)
	                                console.log(err);
	                            else
	                            {
	                                var path = 'public/applications/';
	                                console.log('path + dummy:'+path + dummy);

	                                fs.mkdirSync(path +'/'+ dummy);
	                                fs.mkdirSync(path +'/'+ dummy + '/_' + dummy);
	                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
	                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
	                                fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',JSON.stringify(object.mongo));
	                                fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/_' + dummy + '.ino',object.ino);
	                                fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/Makefile',object.makefile);
	                                //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
	                                deleteFolderRecursive('upload');
	                            }
	                        });
	                    }

	                })
	            });

	        });

	        form.parse(req, function(err, fields, files) {
	          console.log('received upload:\n\n');
	          res.send(200);
	        });

	    return;

	},
	maximumIdApioApp : function(req,res){
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
	
	}

}