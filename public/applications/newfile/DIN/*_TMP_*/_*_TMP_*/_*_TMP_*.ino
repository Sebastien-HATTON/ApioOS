
#include "Apio.h"
#include "property.h"
void setup() {
	Apio.setup("DIN", "1,0", 3030, 0x01);
}

void loop(){
	Apio.loop();
	//Use the function for the read data from Sensor and save it in
	//adc1Val
 	if (lastValueadc1 !=  String(adc1Val)) {
		lastValueadc1 = String(adc1Val);
		if(exists(adc1, "adc1", String(adc1Val), 1)){
			apioSend("3030:update:adc1:"+String(adc1Val)+"-");
		}
	}
	if(property=="adc1"){
		if(value=="/"){
			apioSend("3030:update:adc1:"+String(adc1Val)+"-");
		} else if(!exists(adc1, property, value, 0)){
				insert(&adc1, property, value);
		}else{
			deleteItem(&adc1, property, value);
			}
		property="";
		
	}
	//Use the function for the read data from Sensor and save it in
	//adc2Val
 	if (lastValueadc2 !=  String(adc2Val)) {
		lastValueadc2 = String(adc2Val);
		if(exists(adc2, "adc2", String(adc2Val), 1)){
			apioSend("3030:update:adc2:"+String(adc2Val)+"-");
		}
	}
	if(property=="adc2"){
		if(value=="/"){
			apioSend("3030:update:adc2:"+String(adc2Val)+"-");
		} else if(!exists(adc2, property, value, 0)){
				insert(&adc2, property, value);
		}else{
			deleteItem(&adc2, property, value);
			}
		property="";
		
	}
	//Use the function for the read data from Sensor and save it in
	//adc3Val
 	if (lastValueadc3 !=  String(adc3Val)) {
		lastValueadc3 = String(adc3Val);
		if(exists(adc3, "adc3", String(adc3Val), 1)){
			apioSend("3030:update:adc3:"+String(adc3Val)+"-");
		}
	}
	if(property=="adc3"){
		if(value=="/"){
			apioSend("3030:update:adc3:"+String(adc3Val)+"-");
		} else if(!exists(adc3, property, value, 0)){
				insert(&adc3, property, value);
		}else{
			deleteItem(&adc3, property, value);
			}
		property="";
		
	}
	//Use the function for the read data from Sensor and save it in
	//adc4Val
 	if (lastValueadc4 !=  String(adc4Val)) {
		lastValueadc4 = String(adc4Val);
		if(exists(adc4, "adc4", String(adc4Val), 1)){
			apioSend("3030:update:adc4:"+String(adc4Val)+"-");
		}
	}
	if(property=="adc4"){
		if(value=="/"){
			apioSend("3030:update:adc4:"+String(adc4Val)+"-");
		} else if(!exists(adc4, property, value, 0)){
				insert(&adc4, property, value);
		}else{
			deleteItem(&adc4, property, value);
			}
		property="";
		
	}
	//Use the function for the read data from Sensor and save it in
	//adc5Val
 	if (lastValueadc5 !=  String(adc5Val)) {
		lastValueadc5 = String(adc5Val);
		if(exists(adc5, "adc5", String(adc5Val), 1)){
			apioSend("3030:update:adc5:"+String(adc5Val)+"-");
		}
	}
	if(property=="adc5"){
		if(value=="/"){
			apioSend("3030:update:adc5:"+String(adc5Val)+"-");
		} else if(!exists(adc5, property, value, 0)){
				insert(&adc5, property, value);
		}else{
			deleteItem(&adc5, property, value);
			}
		property="";
		
	}
	//Use the function for the read data from Sensor and save it in
	//adc6Val
 	if (lastValueadc6 !=  String(adc6Val)) {
		lastValueadc6 = String(adc6Val);
		if(exists(adc6, "adc6", String(adc6Val), 1)){
			apioSend("3030:update:adc6:"+String(adc6Val)+"-");
		}
	}
	if(property=="adc6"){
		if(value=="/"){
			apioSend("3030:update:adc6:"+String(adc6Val)+"-");
		} else if(!exists(adc6, property, value, 0)){
				insert(&adc6, property, value);
		}else{
			deleteItem(&adc6, property, value);
			}
		property="";
		
	}
}