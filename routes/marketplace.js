var tarball = require('tarball-extract');
var fs = require('fs');
var request = require('request');


module.exports = function(Apio) {
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
  return {
    download :function(req, res) {
      //console.log(req);
      //deleteFolderRecursive('newfile');
      //fs.unlinkSync('newfile.tar.gz');
      var url = Apio.superServer+"/marketplace/applications/download/"+req.params.name

      tarball.extractTarballDownload(url , 'newfile.tar.gz', 'newfile', {}, function(err, result) {
        if(err){
          console.log("+++++++Error:")
          console.log(err);
        } else {
        console.log("+++++++++++Result: ")
        console.log(result);
        var currentMillis = new Date().getTime();
        var exMillis = new Date().getTime();

        while(!fs.existsSync(result.destination+"/*_TMP_*/icon.png")){
          console.log('------DONWLOAD IN CORSO-------');
          if(currentMillis-exMillis> 2000){
            break;
          }
          currentMillis = new Date().getTime();

        }
        console.log('------DONWLOADED-------');
        Apio.Database.getMaximumObjectId(function(error, data){
            if(error){
                console.log('error: '+error);
            }
            else if(data){
                console.log('data is: '+data);

                //qui rinomino i cazzetti nell'id attuale

                var id = '*_TMP_*';
                var path = 'newfile/'+id;
                var object = {};
                var jsonObject = {};
                if( fs.existsSync(path+'/adapter.js') ) {
                  object.adapter = fs.readFileSync(path+'/adapter.js')
                }
                object.icon = fs.readFileSync(path+'/icon.png');
                object.js = fs.readFileSync(path+'/'+id+'.js', {encoding: 'utf8'});
                object.html = fs.readFileSync(path+'/'+id+'.html', {encoding: 'utf8'});
                //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
                object.mongo = fs.readFileSync(path+'/'+id+'.mongo', {encoding: 'utf8'});
                path = path+'/_'+id;
                object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
                object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

                //jsonObject = JSON.parse(object.json);
                jsonObject = JSON.parse(object.mongo);
                console.log(jsonObject._id);
                jsonObject._id = "";
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
                delete object.mongo._id;
                console.log('"objectId after":"'+object.mongo.objectId+'"')


                Apio.Database.db.collection('Objects').insert(object.mongo,function(err,data){
                    if(err)
                        console.log(err);
                    else
                    {
                        var path = 'public/applications/';
                        console.log('path + dummy:'+path + dummy);

                        fs.mkdirSync(path +'/'+ dummy);
                        fs.mkdirSync(path +'/'+ dummy + '/_' + dummy);
                        if(object.hasOwnProperty('adapter')){
                          fs.writeFileSync(path+'/'+dummy+'/adapter.js',object.adapter);
                        }
                        fs.writeFileSync(path+'/'+dummy+'/icon.png',object.icon);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',JSON.stringify(object.mongo));
                        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/_' + dummy + '.ino',object.ino);
                        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/Makefile',object.makefile);
                        //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
                        //
                        deleteFolderRecursive('newfile');
                        fs.unlinkSync('newfile.tar.gz');
                        Apio.io.emit("apio_server_new", dummy);

                        res.send({id:dummy});


                    }
                });


        }
    });

        //console.log(err, result)
      }
      })
      /*var req_data = {
              json : true,
              name : req.params.name,
              uri : MarketplaceServer+"/marketplace/applications/download/"+req.params.name,
              method : "GET"

      }
      console.log("\n\n Nuova app da scaricare")
      console.log(req_data);
      console.log("\n\n")
      var _req = request(req_data,function(error,response,body){
              if ('undefined' !== typeof response){
                  if ('200' === response.statusCode || 200 === response.statusCode) {
                  console.log("Apio Marketplace : got the following response from "+req.body.url)
                  //console.log(response);
                  var form = new formidable.IncomingForm();
            	    form.uploadDir = "public";
            	    form.keepExtensions = true;
                  form.on('file', function(name, file) {
            	          console.log('file name: '+file.name);
            	          console.log('file path: '+file.path);
                  });
            	    //fs.rename(file.path, 'upload/'+file.name);
                  } else {
                      console.log("Apio Adapter : Something went wrong ")
                      res.status(response.statusCode).send(body);
                  }
              } else {
                  res.status(500).send();
              }

      });*/
    },

    installHex : function(req, res){
        path = req.body.name+".cpp.hex";
        var url = "http://apio.cloudapp.net:8085/marketplace/hex/download/"+req.body.name;
        request({uri: url})
            .pipe(fs.createWriteStream(path))
            .on('close', function() {
              console.log("Downloaded Hex file");
              var sys = require('sys');
              var exec = require('child_process').exec;
              var child = exec("node  apioHexInstaller.js --serial "+Apio.Configuration.serial.port, function(error, stdout, stderr) {
                  //sys.print('stdout: '+stdout);
                  //sys.print('stderr: '+stderr);

                  if (error !== null) {
                      console.log('exec error: ' + error);
                  }
                  res.status(200).send();
              });

            });


    },

    autoInstall :function(req, res) {
      //console.log(req);
      //deleteFolderRecursive('newfile');
      //fs.unlinkSync('newfile.tar.gz');
      var theAddress = req.body.address;;
      var req_data = {
          json: true,
          uri: "http://apio.cloudapp.net:8085/marketplace/getnamefromappid",
          method: "POST",
          body: {
            "appId" : req.body.appId
          }
      }
      var req = request(req_data, function (error, response, body) {
          console.log("Try to launch state associated: ");
          console.log(body);
          if ("200" === response.statusCode || 200 === response.statusCode) {
              console.log("ok");
              var name = body;
                  var url = Apio.superServer+"/marketplace/applications/download/"+name

                  tarball.extractTarballDownload(url , 'newfile.tar.gz', 'newfile', {}, function(err, result) {
                    if(err){
                      console.log("+++++++Error:")
                      console.log(err);
                    } else {
                    console.log("+++++++++++Result: ")
                    console.log(result);
                    var currentMillis = new Date().getTime();
                    var exMillis = new Date().getTime();

                    while(!fs.existsSync(result.destination+"/*_TMP_*//*icon.png")){
                      console.log('------DONWLOAD IN CORSO-------');
                      if(currentMillis-exMillis> 2000){
                        break;
                      }
                      currentMillis = new Date().getTime();

                    }
                    console.log('------DONWLOADED-------');
                    Apio.Database.getMaximumObjectId(function(error, data){
                        if(error){
                            console.log('error: '+error);
                        }
                        else if(data){
                            console.log('data is: '+data);

                            //qui rinomino i cazzetti nell'id attuale

                            var id = '*_TMP_*';
                            var path = 'newfile/'+id;
                            var object = {};
                            var jsonObject = {};
                            if( fs.existsSync(path+'/adapter.js') ) {
                              object.adapter = fs.readFileSync(path+'/adapter.js')
                            }
                            object.icon = fs.readFileSync(path+'/icon.png');
                            object.js = fs.readFileSync(path+'/'+id+'.js', {encoding: 'utf8'});
                            object.html = fs.readFileSync(path+'/'+id+'.html', {encoding: 'utf8'});
                            //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
                            object.mongo = fs.readFileSync(path+'/'+id+'.mongo', {encoding: 'utf8'});
                            path = path+'/_'+id;
                            object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
                            object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

                            //jsonObject = JSON.parse(object.json);
                            jsonObject = JSON.parse(object.mongo);
                            console.log(jsonObject._id);
                            jsonObject._id = "";
                            //TODO Controllo sul nome aggiungendo un numero se il nome c'è già
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

                            object.mongo.address = theAddress;
                            object.mongo.installation = "autoinstalled";
                            delete object.mongo._id;
                            console.log('"objectId after":"'+object.mongo.objectId+'"')


                            Apio.Database.db.collection('Objects').insert(object.mongo,function(err,data){
                                if(err)
                                    console.log(err);
                                else
                                {
                                    var path = 'public/applications/';
                                    console.log('path + dummy:'+path + dummy);

                                    fs.mkdirSync(path +'/'+ dummy);
                                    fs.mkdirSync(path +'/'+ dummy + '/_' + dummy);
                                    if(object.hasOwnProperty('adapter')){
                                      fs.writeFileSync(path+'/'+dummy+'/adapter.js',object.adapter);
                                    }
                                    fs.writeFileSync(path+'/'+dummy+'/icon.png',object.icon);
                                    fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
                                    fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
                                    fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',JSON.stringify(object.mongo));
                                    fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/_' + dummy + '.ino',object.ino);
                                    fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/Makefile',object.makefile);
                                    //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
                                    //
                                    deleteFolderRecursive('newfile');
                                    fs.unlinkSync('newfile.tar.gz');
                                    Apio.io.emit("apio_server_new", dummy);

                                    if(theAddress<10){
                                      theAddress = "000"+theAddress+"01";
                                    }
                                    else if(theAddress>9 && theAddress<100){
                                      theAddress = "00"+theAddress+"01";

                                    } else if (theAddress>99 && theAddress<1000){
                                      theAddress = "0"+theAddress+"01";

                                    } else {
                                      theAddress = theAddress+"01";
                                    }
                                    Apio.Serial.send("l9999:setmesh:"+theAddress+"-");
                                    res.send({id:dummy});


                                }
                            });


                    }
                });

                    //console.log(err, result)
                  }
                })
              //console.log(body)
              return true;
          } else {

              console.log("no");
              return false;
          }
      })


      /*var url = Apio.superServer+"/marketplace/applications/download/"+req.body.name

      tarball.extractTarballDownload(url , 'newfile.tar.gz', 'newfile', {}, function(err, result) {
        if(err){
          console.log("+++++++Error:")
          console.log(err);
        } else {
        console.log("+++++++++++Result: ")
        console.log(result);
        var currentMillis = new Date().getTime();
        var exMillis = new Date().getTime();

        while(!fs.existsSync(result.destination+"/*_TMP_*//*icon.png")){
          console.log('------DONWLOAD IN CORSO-------');
          if(currentMillis-exMillis> 2000){
            break;
          }
          currentMillis = new Date().getTime();

        }
        console.log('------DONWLOADED-------');
        Apio.Database.getMaximumObjectId(function(error, data){
            if(error){
                console.log('error: '+error);
            }
            else if(data){
                console.log('data is: '+data);

                //qui rinomino i cazzetti nell'id attuale

                var id = '*_TMP_*';
                var path = 'newfile/'+id;
                var object = {};
                var jsonObject = {};
                if( fs.existsSync(path+'/adapter.js') ) {
                  object.adapter = fs.readFileSync(path+'/adapter.js')
                }
                object.icon = fs.readFileSync(path+'/icon.png');
                object.js = fs.readFileSync(path+'/'+id+'.js', {encoding: 'utf8'});
                object.html = fs.readFileSync(path+'/'+id+'.html', {encoding: 'utf8'});
                //object.json = fs.readFileSync(path+'.json', {encoding: 'utf8'});
                object.mongo = fs.readFileSync(path+'/'+id+'.mongo', {encoding: 'utf8'});
                path = path+'/_'+id;
                object.ino = fs.readFileSync(path+'/_'+id+'.ino', {encoding: 'utf8'});
                object.makefile = fs.readFileSync(path+'/Makefile', {encoding: 'utf8'});

                //jsonObject = JSON.parse(object.json);
                jsonObject = JSON.parse(object.mongo);
                console.log(jsonObject._id);
                jsonObject._id = "";
                //TODO Controllo sul nome aggiungendo un numero se il nome c'è già
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
                object.mongo.address = req.body.address;
                delete object.mongo._id;
                console.log('"objectId after":"'+object.mongo.objectId+'"')


                Apio.Database.db.collection('Objects').insert(object.mongo,function(err,data){
                    if(err)
                        console.log(err);
                    else
                    {
                        var path = 'public/applications/';
                        console.log('path + dummy:'+path + dummy);

                        fs.mkdirSync(path +'/'+ dummy);
                        fs.mkdirSync(path +'/'+ dummy + '/_' + dummy);
                        if(object.hasOwnProperty('adapter')){
                          fs.writeFileSync(path+'/'+dummy+'/adapter.js',object.adapter);
                        }
                        fs.writeFileSync(path+'/'+dummy+'/icon.png',object.icon);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.html',object.html);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.js',object.js);
                        fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.mongo',JSON.stringify(object.mongo));
                        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/_' + dummy + '.ino',object.ino);
                        fs.writeFileSync(path+'/'+dummy+'/_' + dummy + '/Makefile',object.makefile);
                        //fs.writeFileSync(path+'/'+dummy+'/' + dummy + '.json',object.json);
                        //
                        deleteFolderRecursive('newfile');
                        fs.unlinkSync('newfile.tar.gz');
                        Apio.io.emit("apio_server_new", dummy);

                        res.send({id:dummy});


                    }
                });


        }
    });

        //console.log(err, result)
      }
    })*/
      /*var req_data = {
              json : true,
              name : req.params.name,
              uri : MarketplaceServer+"/marketplace/applications/download/"+req.params.name,
              method : "GET"

      }
      console.log("\n\n Nuova app da scaricare")
      console.log(req_data);
      console.log("\n\n")
      var _req = request(req_data,function(error,response,body){
              if ('undefined' !== typeof response){
                  if ('200' === response.statusCode || 200 === response.statusCode) {
                  console.log("Apio Marketplace : got the following response from "+req.body.url)
                  //console.log(response);
                  var form = new formidable.IncomingForm();
            	    form.uploadDir = "public";
            	    form.keepExtensions = true;
                  form.on('file', function(name, file) {
            	          console.log('file name: '+file.name);
            	          console.log('file path: '+file.path);
                  });
            	    //fs.rename(file.path, 'upload/'+file.name);
                  } else {
                      console.log("Apio Adapter : Something went wrong ")
                      res.status(response.statusCode).send(body);
                  }
              } else {
                  res.status(500).send();
              }

      });*/
    }

  }
}
