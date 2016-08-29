#include "Apio.h"
#include "property.h"
void setup() {
	Apio.setup("Analytics", "1,0", 10, 0x01);
}

void loop(){
	Apio.loop();
}