angular.module("ApioApplicationLog", ["apioProperty"]).controller("defaultController", ["$scope", "currentObject", "socket", "$http", "$timeout", "SaveAs", "logToShow", "$location", function ($scope, currentObject, socket, $http, $timeout, SaveAs, logToShow, $location) {
    var openSockets = [];
    $scope.logsMessage = "";
    $scope.object = currentObject.get();
    console.log("Sono il defaultController e l'oggetto è: ", $scope.object);

    $scope.$on("$destroy", function () {
        socket.emit("send_to_service", {
            message: "close",
            data: {
                objectId: $scope.object.objectId,
                user: $scope.loggedUser
            },
            service: "log"
        });

        socket.off("log_update");
        socket.off("apio_server_update");

        for (var i in openSockets) {
            openSockets[i]();
        }

        console.log("Template base, $destroy");
    });

    openSockets.push($scope.$on("ngRepeatFinished", function () {
        if (document.getElementById("ApioApplicationLog")) {
            if (document.getElementById("ApioApplicationLog").scrollHeight === document.getElementById("ApioApplicationLog").offsetHeight || document.getElementById("ApioApplicationLog").scrollHeight + 1 === document.getElementById("ApioApplicationLog").offsetHeight) {
                $timeout(function () {
                    $scope.log_ready = false;
                    socket.emit("send_to_service", {
                        message: "log_require",
                        data: {
                            apioId: $scope.apioId,
                            objectId: $scope.object.objectId,
                            user: $scope.loggedUser
                        },
                        service: "log"
                    });
                });
            }
        }
    }));

    document.getElementById("ApioApplicationLog").onscroll = function (event) {
        if (event.target.scrollTop === event.target.scrollHeight - event.target.offsetHeight) {
            $timeout(function () {
                $scope.log_ready = false;
                socket.emit("send_to_service", {
                    message: "log_require",
                    data: {
                        apioId: $scope.apioId,
                        objectId: $scope.object.objectId,
                        user: $scope.loggedUser
                    },
                    service: "log"
                });
            });
        }
    };

    var isInArray = function (timestamp) {
        for (var i in $scope.grouppedData) {
            if ($scope.grouppedData[i].date === parseDate(timestamp)) {
                return i;
            }
        }
        return -1;
    };

    var parseDate = function (d) {
        var date = new Date(Number(d));
        var date_ = date.getDate() < 10 ? "0" + date.getDate() + "/" : date.getDate() + "/";
        date_ += date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) + "/" : (date.getMonth() + 1) + "/";
        date_ += date.getFullYear() + " - ";
        date_ += date.getHours() < 10 ? "0" + date.getHours() + ":" : date.getHours() + ":";
        date_ += date.getMinutes() < 10 ? "0" + date.getMinutes() + ":" : date.getMinutes() + ":";
        date_ += date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
        return date_;
    };

    $scope.xslx_ready = true;
    $scope.exportToXLSX = function () {
        /*
         if (document.getElementById("export_file")) {
         Apio.runApioLoading(document.getElementById("export_file"), false, "120");
         }
         */
        //$http.get("/apio/getAllLogs/" + $scope.object.objectId).success(function (logs) {
        //    var toExamine = {};
        //    for (var i in logs) {
        //        for (var j in logs[i]) {
        //            if (!toExamine.hasOwnProperty(j)) {
        //                toExamine[j] = {};
        //            }
        //
        //            toExamine[j][i] = logs[i][j];
        //        }
        //    }
        //
        //    var toExamineKeys = Object.keys(toExamine);
        //
        //    var content_types_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"xml\" ContentType=\"application/xml\"/><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/><Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\"/><Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/><Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/></Types>";
        //    var app_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\" xmlns:vt=\"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes\"><Application>Microsoft Macintosh Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size=\"2\" baseType=\"variant\"><vt:variant><vt:lpstr>Fogli di lavoro</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size=\"1\" baseType=\"lpstr\"><vt:lpstr>Foglio1</vt:lpstr></vt:vector></TitlesOfParts><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>14.0300</AppVersion></Properties>";
        //
        //    var creation_date = new Date(), creation_day = creation_date.getDate() < 10 ? "0" + creation_date.getDate() : creation_date.getDate();
        //    var creation_month = (creation_date.getMonth() + 1) < 10 ? "0" + (creation_date.getMonth() + 1) : creation_date.getMonth() + 1;
        //    var creation_year = creation_date.getFullYear(), creation_hour = creation_date.getHours() < 10 ? "0" + creation_date.getHours() : creation_date.getHours();
        //    var creation_minutes = creation_date.getMinutes() < 10 ? "0" + creation_date.getMinutes() : creation_date.getMinutes();
        //    var creation_seconds = creation_date.getSeconds() < 10 ? "0" + creation_date.getSeconds() : creation_date.getSeconds();
        //    var w3cdtf = creation_year + "-" + creation_month + "-" + creation_day + "T" + creation_hour + ":" + creation_minutes + ":" + creation_seconds + "Z";
        //    var core_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><dc:creator>Apio s.r.l.</dc:creator><dcterms:created xsi:type=\"dcterms:W3CDTF\">" + w3cdtf + "</dcterms:created></cp:coreProperties>";
        //
        //    var hidden_rels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/><Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/></Relationships>";
        //    var styles_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" mc:Ignorable=\"x14ac\" xmlns:x14ac=\"http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac\"><fonts count=\"1\" x14ac:knownFonts=\"1\"><font><sz val=\"12\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/><scheme val=\"minor\"/></font></fonts><fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills><borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyProtection=\"1\"><protection locked=\"0\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyProtection=\"1\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normale\" xfId=\"0\" builtinId=\"0\"/></cellStyles><dxfs count=\"0\"/><tableStyles count=\"0\" defaultTableStyle=\"TableStyleMedium9\" defaultPivotStyle=\"PivotStyleMedium4\"/></styleSheet>";
        //    var workbook_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><fileVersion appName=\"xl\" lastEdited=\"5\" lowestEdited=\"5\" rupBuild=\"20225\"/><workbookPr autoCompressPictures=\"0\"/><bookViews><workbookView xWindow=\"0\" yWindow=\"0\" windowWidth=\"" + window.screen.availWidth + "\" windowHeight=\"" + window.screen.availHeight + "\" tabRatio=\"500\"/></bookViews><sheets><sheet name=\"Foglio1\" sheetId=\"1\" r:id=\"rId1\"/></sheets><calcPr calcId=\"0\" concurrentCalc=\"0\"/><extLst><ext uri=\"{7523E5D3-25F3-A5E0-1632-64F254C22452}\" xmlns:mx=\"http://schemas.microsoft.com/office/mac/excel/2008/main\"><mx:ArchID Flags=\"2\"/></ext></extLst></workbook>";
        //    var workbook_xml_rels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/><Relationship Id=\"rId4\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme\" Target=\"theme/theme1.xml\"/></Relationships>";
        //    var theme1_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\"><a:themeElements><a:clrScheme name=\"Office\"><a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1><a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1><a:dk2><a:srgbClr val=\"1F497D\"/></a:dk2><a:lt2><a:srgbClr val=\"EEECE1\"/></a:lt2><a:accent1><a:srgbClr val=\"4F81BD\"/></a:accent1><a:accent2><a:srgbClr val=\"C0504D\"/></a:accent2><a:accent3><a:srgbClr val=\"9BBB59\"/></a:accent3><a:accent4><a:srgbClr val=\"8064A2\"/></a:accent4><a:accent5><a:srgbClr val=\"4BACC6\"/></a:accent5><a:accent6><a:srgbClr val=\"F79646\"/></a:accent6><a:hlink><a:srgbClr val=\"0000FF\"/></a:hlink><a:folHlink><a:srgbClr val=\"800080\"/></a:folHlink></a:clrScheme><a:fontScheme name=\"Office\"><a:majorFont><a:latin typeface=\"Cambria\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"宋体\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Times New Roman\"/><a:font script=\"Hebr\" typeface=\"Times New Roman\"/><a:font script=\"Thai\" typeface=\"Tahoma\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"MoolBoran\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Times New Roman\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:majorFont><a:minorFont><a:latin typeface=\"Calibri\"/><a:ea typeface=\"\"/><a:cs typeface=\"\"/><a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/><a:font script=\"Hang\" typeface=\"맑은 고딕\"/><a:font script=\"Hans\" typeface=\"宋体\"/><a:font script=\"Hant\" typeface=\"新細明體\"/><a:font script=\"Arab\" typeface=\"Arial\"/><a:font script=\"Hebr\" typeface=\"Arial\"/><a:font script=\"Thai\" typeface=\"Tahoma\"/><a:font script=\"Ethi\" typeface=\"Nyala\"/><a:font script=\"Beng\" typeface=\"Vrinda\"/><a:font script=\"Gujr\" typeface=\"Shruti\"/><a:font script=\"Khmr\" typeface=\"DaunPenh\"/><a:font script=\"Knda\" typeface=\"Tunga\"/><a:font script=\"Guru\" typeface=\"Raavi\"/><a:font script=\"Cans\" typeface=\"Euphemia\"/><a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/><a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/><a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/><a:font script=\"Thaa\" typeface=\"MV Boli\"/><a:font script=\"Deva\" typeface=\"Mangal\"/><a:font script=\"Telu\" typeface=\"Gautami\"/><a:font script=\"Taml\" typeface=\"Latha\"/><a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/><a:font script=\"Orya\" typeface=\"Kalinga\"/><a:font script=\"Mlym\" typeface=\"Kartika\"/><a:font script=\"Laoo\" typeface=\"DokChampa\"/><a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/><a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/><a:font script=\"Viet\" typeface=\"Arial\"/><a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/><a:font script=\"Geor\" typeface=\"Sylfaen\"/></a:minorFont></a:fontScheme><a:fmtScheme name=\"Office\"><a:fillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"35000\"><a:schemeClr val=\"phClr\"><a:tint val=\"37000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"15000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"1\"/></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"100000\"/><a:shade val=\"100000\"/><a:satMod val=\"130000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:shade val=\"100000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs></a:gsLst><a:lin ang=\"16200000\" scaled=\"0\"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w=\"9525\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"><a:shade val=\"95000\"/><a:satMod val=\"105000\"/></a:schemeClr></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln><a:ln w=\"38100\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"20000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"38000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw></a:effectLst><a:scene3d><a:camera prst=\"orthographicFront\"><a:rot lat=\"0\" lon=\"0\" rev=\"0\"/></a:camera><a:lightRig rig=\"threePt\" dir=\"t\"><a:rot lat=\"0\" lon=\"0\" rev=\"1200000\"/></a:lightRig></a:scene3d><a:sp3d><a:bevelT w=\"63500\" h=\"25400\"/></a:sp3d></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"40000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"40000\"><a:schemeClr val=\"phClr\"><a:tint val=\"45000\"/><a:shade val=\"99000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"20000\"/><a:satMod val=\"255000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"-80000\" r=\"50000\" b=\"180000\"/></a:path></a:gradFill><a:gradFill rotWithShape=\"1\"><a:gsLst><a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"80000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs><a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"30000\"/><a:satMod val=\"200000\"/></a:schemeClr></a:gs></a:gsLst><a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"50000\" r=\"50000\" b=\"50000\"/></a:path></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults><a:spDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"3\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"lt1\"/></a:fontRef></a:style></a:spDef><a:lnDef><a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style></a:lnDef></a:objectDefaults><a:extraClrSchemeLst/></a:theme>";
        //
        //    var stringCounter = 4, stringContainer = ["Data", "Tensione", "Corrente", "Potenza"];
        //    var sheet1_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" mc:Ignorable=\"x14ac\" xmlns:x14ac=\"http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac\"><dimension ref=\"A1:D" + (2 + toExamineKeys.length - 1) + "\"/><sheetViews><sheetView tabSelected=\"1\" topLeftCell=\"A1\" workbookViewId=\"0\"><selection activeCell=\"A1\" sqref=\"A1\"/></sheetView></sheetViews><sheetFormatPr baseColWidth=\"10\" defaultRowHeight=\"15\" x14ac:dyDescent=\"0\"/><cols><col min=\"1\" max=\"1\" width=\"10.83203125\" style=\"2\"/><col min=\"2\" max=\"3\" width=\"10.83203125\" style=\"1\"/></cols><sheetData><row r=\"1\" spans=\"1:4\"><c r=\"A1\" s=\"2\" t=\"s\"><v>0</v></c><c r=\"B1\" s=\"1\" t=\"s\"><v>1</v></c><c r=\"C1\" s=\"1\" t=\"s\"><v>2</v></c><c r=\"D1\" s=\"1\" t=\"s\"><v>3</v></c></row>";
        //
        //    for (var i in toExamineKeys) {
        //        sheet1_xml += "<row r=\"" + (Number(i) + 2) + "\" spans=\"1:4\">";
        //        sheet1_xml += "<c r=\"A" + (Number(i) + 2) + "\" s=\"1\" t=\"s\"><v>" + (stringCounter++) + "</v></c>";
        //        sheet1_xml += toExamine[toExamineKeys[i]].hasOwnProperty("voltage") ? "<c r=\"B" + (Number(i) + 2) + "\" s=\"1\" t=\"s\"><v>" + (stringCounter++) + "</v></c>" : "";
        //        sheet1_xml += toExamine[toExamineKeys[i]].hasOwnProperty("current") ? "<c r=\"C" + (Number(i) + 2) + "\" s=\"1\" t=\"s\"><v>" + (stringCounter++) + "</v></c>" : "";
        //        sheet1_xml += toExamine[toExamineKeys[i]].hasOwnProperty("power") ? "<c r=\"D" + (Number(i) + 2) + "\" s=\"1\" t=\"s\"><v>" + (stringCounter++) + "</v></c>" : "";
        //        sheet1_xml += "</row>";
        //
        //        if (stringContainer.indexOf(parseDate(Number(toExamineKeys[i]))) === -1) {
        //            stringContainer.push(parseDate(Number(toExamineKeys[i])));
        //        }
        //
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("voltage") && stringContainer.indexOf(toExamine[toExamineKeys[i]].voltage) === -1) {
        //            stringContainer.push(toExamine[toExamineKeys[i]].voltage);
        //        }
        //
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("current") && stringContainer.indexOf(toExamine[toExamineKeys[i]].current) === -1) {
        //            stringContainer.push(toExamine[toExamineKeys[i]].current);
        //        }
        //
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("power") && stringContainer.indexOf(toExamine[toExamineKeys[i]].power) === -1) {
        //            stringContainer.push(toExamine[toExamineKeys[i]].power);
        //        }
        //    }
        //
        //    sheet1_xml += "</sheetData><sheetProtection sheet=\"1\" objects=\"1\" scenarios=\"1\"/><pageMargins left=\"0.75\" right=\"0.75\" top=\"1\" bottom=\"1\" header=\"0.5\" footer=\"0.5\"/><extLst><ext uri=\"{64002731-A6B0-56B0-2670-7721B7C09600}\" xmlns:mx=\"http://schemas.microsoft.com/office/mac/excel/2008/main\"><mx:PLV Mode=\"0\" OnePage=\"0\" WScale=\"0\"/></ext></extLst></worksheet>";
        //
        //    var sharedStrings_xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"" + (--stringCounter) + "\" uniqueCount=\"" + stringContainer.length + "\"><si><t>Data</t></si><si><t>Tensione</t></si><si><t>Corrente</t></si><si><t>Potenza</t></si>";
        //    for (var i in toExamineKeys) {
        //        sharedStrings_xml += "<si><t>" + parseDate(Number(toExamineKeys[i])) + "</t></si>";
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("voltage")) {
        //            sharedStrings_xml += "<si>" + (toExamine[toExamineKeys[i]].voltage !== "" ? "<t>" + toExamine[toExamineKeys[i]].voltage + "</t>" : "<t/>") + "</si>";
        //        }
        //
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("current")) {
        //            sharedStrings_xml += "<si>" + (toExamine[toExamineKeys[i]].current !== "" ? "<t>" + toExamine[toExamineKeys[i]].current + "</t>" : "<t/>") + "</si>";
        //        }
        //
        //        if (toExamine[toExamineKeys[i]].hasOwnProperty("power")) {
        //            sharedStrings_xml += "<si>" + (toExamine[toExamineKeys[i]].power !== "" ? "<t>" + toExamine[toExamineKeys[i]].power + "</t>" : "<t/>") + "</si>";
        //        }
        //    }
        //    sharedStrings_xml += "</sst>";
        //
        //    var zip = new JSZip();
        //    zip.file("[Content_Types].xml", content_types_xml);
        //    zip.file("docProps/app.xml", app_xml);
        //    zip.file("docProps/core.xml", core_xml);
        //    zip.file("_rels/.rels", hidden_rels);
        //    zip.file("xl/sharedStrings.xml", sharedStrings_xml);
        //    zip.file("xl/styles.xml", styles_xml);
        //    zip.file("xl/workbook.xml", workbook_xml);
        //    zip.file("xl/_rels/workbook.xml.rels", workbook_xml_rels);
        //    zip.file("xl/theme/theme1.xml", theme1_xml);
        //    zip.file("xl/worksheets/sheet1.xml", sheet1_xml);
        //
        //    if (navigator.userAgent.indexOf("Safari") > -1 && navigator.userAgent.indexOf("Chrome") === -1 && navigator.userAgent.indexOf("Firefox") === -1) {
        //        $http.post("/apio/app/createXLSX", {
        //            file: zip.generate({base64: false, compression: "DEFLATE"}),
        //            name: $scope.object.name + " " + creation_year + "-" + creation_month + "-" + creation_day + ".xlsx"
        //        }).success(function () {
        //            window.open("/apio/app/download?name=" + encodeURI($scope.object.name + " " + creation_year + "-" + creation_month + "-" + creation_day + ".xlsx"));
        //            document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
        //            document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        //        }).error(function () {
        //            console.log("Errore di sistema");
        //        });
        //    } else {
        //        SaveAs.download(zip.generate({type: "blob"}), $scope.object.name + " " + creation_year + "-" + creation_month + "-" + creation_day + ".xlsx");
        //        document.getElementById("apioWaitLoading").classList.remove("apioWaitLoadingOn");
        //        document.getElementById("apioWaitLoading").classList.add("apioWaitLoadingOff");
        //    }
        //}).error(function (error) {
        //    console.log("Error while getting logs of object with objectId " + $scope.object.objectId + ": ", error);
        //});

        //SCOMMENTARE IN CASE

        var sheet_from_array_of_arrays = function (data) {
            var ws = {};
            var range = {s: {c: 10000000, r: 10000000}, e: {c: 0, r: 0}};
            for (var R = 0; R != data.length; ++R) {
                for (var C = 0; C != data[R].length; ++C) {
                    if (range.s.r > R) {
                        range.s.r = R;
                    }
                    if (range.s.c > C) {
                        range.s.c = C;
                    }
                    if (range.e.r < R) {
                        range.e.r = R;
                    }
                    if (range.e.c < C) {
                        range.e.c = C;
                    }
                    var cell = {v: data[R][C]};
                    if (cell.v == null) {
                        continue;
                    }
                    var cell_ref = XLSX.utils.encode_cell({c: C, r: R});

                    if (typeof cell.v === "number") {
                        cell.t = "n";
                    } else if (typeof cell.v === "boolean") {
                        cell.t = "b";
                    } else if (cell.v instanceof Date) {
                        cell.t = "d";
                        cell.v = new Date(cell.v.getFullYear(), cell.v.getMonth(), cell.v.getDate(), cell.v.getHours() + 1, cell.v.getMinutes(), cell.v.getSeconds(), cell.v.getMilliseconds());
                    } else {
                        cell.t = "s";
                    }

                    ws[cell_ref] = cell;
                }
            }
            if (range.s.c < 10000000) {
                ws["!ref"] = XLSX.utils.encode_range(range);
            }
            return ws;
        };

        var stringToArrayBuffer = function (s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i != s.length; ++i) {
                view[i] = s.charCodeAt(i) & 0xFF;
            }
            return view;
        };

        if ($scope.xslx_ready === false) {
            alert("Scaricamento dei dati in corso...");
        } else {
            $scope.xslx_ready = false;
            var ua = navigator.userAgent.toLowerCase();
            if (ua.indexOf("safari") > -1 && ua.indexOf("chrome") === -1) {
                $scope.xslx_ready = true;
                alert("Questa funzione non è supportata per Safari");
            } else {
                $http.get("/apio/service/log/route/" + encodeURIComponent("/apio/log/getAllByObjectId/" + $scope.object.objectId + "/properties/" + $scope.tableProperties)).success(function (logs) {
                    console.log("logs: ", logs);
                    var isInData = function (ts) {
                        for (var i = 1; i < data.length; i++) {
                            if (Number(ts) === data[i][0].getTime()) {
                                return i;
                            }
                        }

                        return -1;
                    };

                    var data = [["Data"]];
                    var logsKeys = Object.keys(logs);

                    for (var i in logsKeys) {
                        data[0].push($scope.tableLabels[$scope.tableProperties.indexOf(logsKeys[i])]);
                    }

                    for (var i in logs) {
                        for (var j in logs[i]) {
                            var index = isInData(j);
                            if (index > -1) {
                                data[index][$scope.tableProperties.indexOf(i) + 1] = Number(logs[i][j].replace(",", "."));
                            } else {
                                var arr = [new Date(Number(j))];
                                arr[$scope.tableProperties.indexOf(i) + 1] = Number(logs[i][j].replace(",", "."));
                                data.push(arr);
                            }
                        }
                    }

                    data.sort(function (a, b) {
                        if (typeof a[0] === "object" && typeof b[0] === "string") {
                            return 1;
                        } else if (typeof a[0] === "string" && typeof b[0] === "object") {
                            return -1
                        } else {
                            return b[0].getTime() - a[0].getTime();
                        }
                    });

                    console.log("data: ", data);

                    var ws_name = "Foglio 1";

                    var wb = {
                        SheetNames: [],
                        Sheets: {}
                    };
                    var ws = sheet_from_array_of_arrays(data);

                    wb.SheetNames.push(ws_name);
                    wb.Sheets[ws_name] = ws;
                    var wbout = XLSX.write(wb, {bookType: "xlsx", bookSST: true, type: "binary"});

                    SaveAs.download(new Blob([stringToArrayBuffer(wbout)], {type: "application/octet-stream"}), "Report " + $scope.object.name + ".xlsx");
                    $scope.xslx_ready = true;
                }).error(function () {
                    $scope.xslx_ready = true;
                    alert("Errore durante la creazione del file");
                });
            }
        }

        //window.open("http://" + $location.host() + ":8080/apio/log/exportXLSX?objectId=" + $scope.object.objectId);
    };

    var toShow = logToShow();
    if (toShow) {
        $scope.tableLabels = [];
        $scope.tableProperties = toShow;
        for (var i in $scope.tableProperties) {
            if ($scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]]) {
                $scope.tableLabels.push($scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].label ? $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].label : $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].labelon + " / " + $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].labeloff);
            }
        }
    } else {
        $scope.tableLabels = [];
        $scope.tableProperties = [];
        for (var i in $scope.object.properties) {
            if (i !== "date" && $scope.object.propertiesAdditionalInfo[i].type !== "log") {
                $scope.tableProperties.push(i);
            }
        }

        for (var i in $scope.tableProperties) {
            if ($scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]]) {
                $scope.tableLabels.push(($scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].label ? $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].label : $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].labelon + " / " + $scope.object.propertiesAdditionalInfo[$scope.tableProperties[i]].labeloff) + " (" + $scope.tableProperties[i] + ")");
            }
        }
    }

    socket.on("apio_server_update", function (data) {
        if ($scope.object.objectId === data.objectId) {
            var ts = new Date().getTime();
            var index = isInArray(ts);
            if (index > -1) {
                for (var p in $scope.object.properties) {
                    if (data.properties.hasOwnProperty(p)) {
                        $scope.grouppedData[index][p] = String(data.properties[p]).replace(",", ".");
                    } else {
                        $scope.grouppedData[index][p] = String($scope.object.properties[p]).replace(",", ".");
                    }
                }
            } else {
                var obj = {
                    date: parseDate(ts),
                    timestamp: ts
                };

                for (var p in $scope.object.properties) {
                    if (data.properties.hasOwnProperty(p)) {
                        obj[p] = String(data.properties[p]).replace(",", ".");
                    } else {
                        obj[p] = String($scope.object.properties[p]).replace(",", ".");
                    }
                }

                $scope.grouppedData.push(obj);
                obj = {};
            }

            $scope.grouppedData.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            $scope.logsMessage = "";

            $scope.log_ready = true;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    });

    $scope.grouppedData = [];
    $http.get("/apio/user/getSessionComplete").success(function (session) {
        $scope.apioId = session.apioId;
        $scope.loggedUser = session.email;
        socket.on("log_update", function (data) {
            if ($scope.object.objectId === data.objectId) {
                console.log("log_update, data: ", data);

                if (typeof data.log === "string") {
                    $scope.logsMessage = data.log;
                } else if (typeof data.log === "object") {
                    for (var i in data.log) {
                        for (var j in data.log[i]) {
                            var index = isInArray(j);
                            if (index > -1) {
                                $scope.grouppedData[index][i] = data.log[i][j];
                            } else {
                                var obj = {
                                    date: parseDate(j),
                                    timestamp: j
                                };
                                obj[i] = data.log[i][j];
                                $scope.grouppedData.push(obj);
                                obj = {};
                            }
                        }
                    }

                    $scope.grouppedData.sort(function (a, b) {
                        return b.timestamp - a.timestamp;
                    });

                    $scope.logsMessage = "";
                }

                $scope.log_ready = true;
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        });

        setTimeout(function () {
            socket.emit("send_to_service", {
                message: "log_require",
                data: {
                    apioId: $scope.apioId,
                    objectId: $scope.object.objectId,
                    user: $scope.loggedUser
                },
                service: "log"
            });
        }, 5000);
    }).error(function (err) {
        console.log("Error while getting session: ", err);
    });
}]).directive("onFinishRender", function ($timeout) {
    return {
        restrict: "A",
        link: function (scope) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit("ngRepeatFinished");
                });
            }
        }
    }
});

setTimeout(function () {
    angular.bootstrap(document.getElementById("ApioApplicationLog"), ["ApioApplicationLog"]);
}, 10);