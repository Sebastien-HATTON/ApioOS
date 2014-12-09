var fs = require('fs');

module.exports = {
	index : function(req,res) {
		res.sendfile("public/dashboardApp/dashboard.html");
	},
	updateApioApp : function(req,res){
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
		   
		},
	modifyApioApp : function(req,res){
	    var id = req.body.id;
	    var path = 'public/applications/'+id+'/'+id;
	    console.log(path);
	    var object = {};

	    object.js = fs.readFileSync(path+'.js', {encoding: 'utf8'});
	    object.html = fs.readFileSync(path+'.html', {encoding: 'utf8'});
	    object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
	    object.mongo = fs.readFileSync(path+'.mongo', {encoding: 'utf8'});
	    object.ino = fs.readFileSync(path+'/'+id+'.ino', {encoding: 'utf8'});
	    
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
	        }
	        console.log();
	    }; 

	    objectToSave.db=JSON.parse(mongo.slice(7,mongo.length)); //problema db : { db : { ... }}
	    

	    console.log('Object' + obj.objectId + 'is being manipulated by the server');
	    console.log('APIO: Creating application ' + obj.objectId);
	    fs.mkdirSync("public/applications/" + obj.objectId);
	    fs.mkdirSync("public/applications/" + obj.objectId +'/' + obj.objectId);

	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/' + obj.objectId + '.ino',ino);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '/Makefile',makefile);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.html',html);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.js',js);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.mongo',mongo);
	    fs.writeFileSync('public/applications/'+obj.objectId+'/' + obj.objectId + '.json',JSON.stringify(objectToSave));

	    Apio.Database.registerObject(objectToSave,function(error){
	        if (error) {
	            console.log("/apio/Database/createNewApioApp Error while saving");
	            res.send(500);
	        }else{
	            res.send();
	        }
	    });   

	},
	createNewObject : function(req,res){
    
		    var obj = req.body.object;
		    var data = {
		        properties : {}
		    }; //Used to send to database
		    for (var k in obj) {
		        if (k !== 'properties')
		            data[k] = obj[k];
		    for(var k in obj.properties)
		        data["properties"][k] = obj.properties[k]["defaultValue"];

		    }
		    Apio.Database.registerObject(data,function(error){
		        if (error) {
		            console.log("/apio/Database/createNewObject Error while saving")
		            res.send(500);
		        }
		        console.log('APIO: Creating application '+obj.objectId);
		        fs.mkdirSync("public/applications/"+obj.objectId);
		        
		            var xml = '<application objectId="'+obj.objectId+'" objectAddress="'+obj.address+'" protocol="'+obj.protocol+'" microType="'+obj.microType+'" microFamily="'+obj.microFamily+'">\n';
		                for (var k in obj.properties) {
		                    switch(obj.properties[k].type){
		                        case 'Slider' :
		                            xml += '\t<Property type="'+obj.properties[k].type+'" pin="'+obj.properties[k].pin+'" model="'+obj.properties[k].name+'" min="'+obj.properties[k].min+'" max="'+obj.properties[k].max+'" step="'+obj.properties[k].step+'"  />\n'
		                        break;
		                        case 'Trigger' :
		                            xml += '\t<Property type="'+obj.properties[k].type+'" pin="'+obj.properties[k].pin+'" model="'+obj.properties[k].name+'" on="'+obj.properties[k].on+'" off="'+obj.properties[k].off+'" />\n'
		                        break;
		                        case 'Button' :
		                            xml += '\t<Property type="'+obj.properties[k].type+'" pin="'+obj.properties[k].pin+'" model="'+obj.properties[k].name+'" value="'+obj.properties[k].value+'" />\n'
		                        break;
		                        case 'List' :
		                            xml += '\t<Property type="'+obj.properties[k].type+'" pin="'+obj.properties[k].pin+'" model="'+obj.properties[k].name+'" default="" />\n'
		                        break;
		                        default :
		                            xml += '\t<Property type="'+obj.properties[k].type+'" pin="'+obj.properties[k].pin+'" model="'+obj.properties[k].name+'" />\n'
		                        break;
		                    }
		                    
		                }
		            xml += '</application>'
		        console.log('APIO: Creating the view file');
		        fs.writeFileSync('public/applications/'+obj.objectId+'/view.xml',xml);
		        var js = '/*Insert here you application controller code and functions*/\n(function(){\n/*Insert here you application actions, listeners and correlations*/\n\tinit : function() {\n//Put your initialization code here\n}\n\n})();';
		        console.log('APIO: Creating the controller file');
		        fs.writeFileSync('public/applications/'+obj.objectId+'/'+obj.objectId+'.js',js);
		        var conf = 'objectId:'+obj.objectId+'\nprotocol:'+obj.protocol+'\nobjectAddress:'+obj.address+'\nmicro:'+obj.microFamily+' '+obj.microType+'\n\n';
		        for(var k in obj.pins){
			        conf +='pin:'+obj.pins[k].name+' '+obj.pins[k].number+' '+obj.pins[k].type+'\n';
		        }
		        for (var k in obj.variables){
			        conf+='\nvar:'+obj.variables[k].type+' '+obj.variables[k].name+' '+obj.variables[k].value+'\n';
		        }
		        for(var k in obj.functions){
			        conf +='\nfunctionBegin:'+obj.functions[k].text+'\nfunctionEnd:\n\n';
		        }
		        for (var k in obj.properties) {
		                    switch(obj.properties[k].type){
		                        case 'Slider' :
		                            conf += obj.properties[k].name+':'+obj.properties[k].sliderFunction+';\n'
		                        break;
		                        case 'Trigger' :
		                            conf += obj.properties[k].name+':'+obj.properties[k].on+':'+obj.properties[k].onFunction+';\n'+obj.properties[k].name+':'+obj.properties[k].off+':'+obj.properties[k].offFunction+';\n'
		                        break;
		                        case 'Button' :
		                           conf += obj.properties[k].name+':'+obj.properties[k].buttonFunction+';\n'
		                        break;
		                        case 'List' :
		                            conf += obj.properties[k].name+':'+obj.properties[k].listFunction+';\n'
		                        break;
								case 'Number' :
		                           conf += obj.properties[k].name+':'+obj.properties[k].numberFunction+';\n'
		                        break;
		                        case 'Button' :
		                           conf += obj.properties[k].name+':'+obj.properties[k].buttonFunction+';\n'
		                        break;
		                        case 'Text' :
		                           conf += obj.properties[k].name+':'+obj.properties[k].textFunction+';\n'
		                        break;
		                        
		                    }
		                    
		                }
		        
		        console.log('APIO: Creating the conf file');
		        fs.writeFileSync('public/applications/'+obj.objectId+'/'+obj.objectId+'.conf',conf);
		        
		        console.log('APIO: Object installation completed ✔✔');
		        //Lanciare il file parser.php
			function puts(error, stdout, stderr) { sys.puts(stdout) }
			exec('php -f parser.php '+obj.objectId, puts);
		        console.log('APIO: Object creation '+obj.objectId+'.ino');
		        res.send(200);
		    });
		},
	exportApioApp : function(req,res){
	    var id = req.query.id;
	    var targz = require('tar.gz');
	    //var compress = new targz().compress('/applications/:id', '/applications/temp/:id.tar.gz', function(err){
	    var compress = new targz().compress('public/applications/'+id, 'public/applications/temp/'+id+'.tar.gz', function(err){
	        if(err)
	            console.log(err);
	        else{
	            res.download('public/applications/temp/'+id+'.tar.gz',id+'.tar.gz',function(err){
	                if(err)
	                    console.log(err);
	            });
	            console.log('The compression has ended!');
	        }
	    });
	},
	deleteApioApp : function(req,res){
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
	    
	}
}