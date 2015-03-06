
/*---------------------constants definition-----------------------------*/

#define COORDINATOR_ADDRESS_LWM  0

/*---------------------variables definition-----------------------------*/

String deviceAddr;
String property; // variables that are to be processed in the running loop
String value;  // variables that are to be processed in the running loop

char sendThis[100];
int numberkey=0;
int j=0;

bool nwkDataReqBusy = false; 

bool TX_has_gone; 
bool RX_has_arrived;

int flag; //flag which manages the logic of the select
int x=0;//is used to keep track the running property:value in the loop



/*---------------------function declaration-----------------------------*/

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//function that saves the pairs propiretà: value in their respective vectors or propertyArray [array_length] and valueArray [array_length]

void divide_string(String stringToSplit) {
  
  int strlen=stringToSplit.length();
  //Serial1.println(stringToSplit); //debug
  int i; //counter
  deviceAddr=""; 

  //Serial1.println(numberkey);
  //-----------deviceAddr----------------  
  
  for(i=0; stringToSplit.charAt(i)!=':' && i<strlen ;i++)
  {
    deviceAddr += String(stringToSplit.charAt(i));
  }
  for(i++; stringToSplit.charAt(i)!=':' && i<strlen ;i++)
  {
      property+= String(stringToSplit.charAt(i));
  }
  for(i++; stringToSplit.charAt(i)!='-' && i<strlen ;i++)
  {
    value += String(stringToSplit.charAt(i)); 
  }
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

//callback for the management of the confirmation (access the field message->opzioni) and verification of ack 
static void appDataConf(NWK_DataReq_t *req)
{
  //Serial1.print("ACK: "); //debug
  switch(req->status)
  {
    case NWK_SUCCESS_STATUS:
      //Serial1.print(1,DEC);
      break;
    case NWK_ERROR_STATUS:
      //Serial1.print(2,DEC);
      break;
    case NWK_OUT_OF_MEMORY_STATUS:
      //Serial1.print(3,DEC);
      break;
    case NWK_NO_ACK_STATUS:
      //Serial1.print(4,DEC);
      break;
    case NWK_NO_ROUTE_STATUS:
      //Serial1.print(5,DEC);
      break;
    case NWK_PHY_CHANNEL_ACCESS_FAILURE_STATUS:
      //Serial1.print(6,DEC);
      break;
    case NWK_PHY_NO_ACK_STATUS:
      //Serial1.print(7,DEC);
      break;
//    default:
//      Serial1.print("nessuna corrispondenza nell ack");
//      break;
     

  }
  nwkDataReqBusy = false;

  //Serial1.println("");
  
}


/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/

void apioLoop()
{
    SYS_TaskHandler();
    //select();
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//to receive a packet with LWM
static bool apioReceive(NWK_DataInd_t *ind) 
{ 
  int message_size=ind->size;
  int i;
  char Buffer[110];
  String receivedL="";
  for(i=0; i<message_size; i++)
  {
    Buffer[i] = ind->data[i];
    //delay(10);
    //Serial.write(ind->data[i]);
   
  }
  //Serial.println();

  divide_string(String(Buffer)); 
  
  for(int i=0; i<100; i++)
  {
    Buffer[i]=NULL;
    
  }
//  Serial1.print("Received message - ");
//  Serial1.print("lqi: ");
//  Serial1.print(ind->lqi, DEC);
//
//  Serial1.print("  ");
//
//  Serial1.print("rssi: ");
//  Serial1.print(ind->rssi, DEC);
//  Serial1.println("  ");
  //NWK_SetAckControl(NWK_IND_OPT_ACK_REQUESTED);

  return true; 
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//is used by objects to communicate with the coordinator
void apioSend(String toSend)

{
  int len = toSend.length();
  
  for(int g=0; g<len ;g++) 
  {
      sendThis[g]=toSend.charAt(g);
  }
  int16_t address = COORDINATOR_ADDRESS_LWM; 

  nwkDataReqBusy = true;
  
  NWK_DataReq_t *message = (NWK_DataReq_t*)malloc(sizeof(NWK_DataReq_t));
  message->dstAddr = address; //object address
  message->dstEndpoint = 1; 
  message->srcEndpoint = 1;
  message->options = NWK_OPT_ACK_REQUEST; //I require an ack
  message->size = len;
  message->data = (uint8_t*)(sendThis);

  message->confirm = appDataConf; //callback for the management of the confirmation (option field)
                                  //and verification of ack required above 
  NWK_DataReq(message); //send message
}
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
void apioSetup(uint16_t objectAddress)
{
  SYS_Init();
  NWK_Init();
  pinMode(21, OUTPUT);
  digitalWrite(21,HIGH);
  delay(500);
  digitalWrite(21,LOW);
  delay(500);
  NWK_SetAddr(objectAddress);
  NWK_SetPanId(0x01);
  PHY_SetChannel(0x1a);
  PHY_SetRxState(true);
  NWK_OpenEndpoint(1, apioReceive);
  SYS_TaskHandler();
  //NWK_Init();
  delay(500);

}

