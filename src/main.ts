
// Binds REP socket to tcp://*:5555
// Binds pub socket to tcp://*.5556
import { HarvesterAPIs } from '@nanometrics/pegasus-harvest-lib';

import zmq = require('zeromq');
import { HarvestAPIParams_GetOpResponses, HarvesterAPIParams_HarvestData } from './models/api-params';
import { HarvesterApiCall } from './models/harvester-api-call';
import { Port_Pubsub, Port_Reqrep } from './share/default-ports';

// socket to talk to clients
var responder = zmq.socket('rep');
var publisher = zmq.socket('pub');

responder.on('message', function(request: Buffer) {
  console.log("Received request: [", request.toString(), "]");

   let msgJson = request.toString();
   try{
     let msgObject: HarvesterApiCall = JSON.parse(msgJson);
    console.log('receive JSON:', msgObject);

    switch(msgObject.apiName) {
      case  'harvest_data': {
        // call harvest_data
        let params: HarvesterAPIParams_HarvestData = msgObject.arguments as HarvesterAPIParams_HarvestData;
        let execId =  HarvesterAPIs.harvest_data(params.libPath, params.params, params.updateStep);
        let replyObj = {
          type: 'ExecID',
          execId: execId
        }
        responder.send(JSON.stringify(replyObj));
      }break;
      case 'list': {
        let execId = HarvesterAPIs.list();
        let replyObj = {
          type: 'ExecID',
          execId: execId
        }
        console.log('server: send reply from call: list', replyObj);
        responder.send(JSON.stringify(replyObj));
      }break;
      case 'get_op_responses': {
        let replyObj = {
          type: 'Response',
          response: null
        }
        
        
        responder.send(JSON.stringify(replyObj));
        let getOPResponsePollHandle = setInterval(() => {
        let params: HarvestAPIParams_GetOpResponses = msgObject.arguments as HarvestAPIParams_GetOpResponses;
        let queryStr = HarvesterAPIs.get_op_responses(params.exectionId, params.nResponsesMax);
          if(queryStr !== null) {
            let query = JSON.parse(queryStr);
            // console.log('check query:', query);
            let responseJSON = query.responses;
            for (let responseStr of responseJSON) {
              let replyObj = {
              type: 'Response',
              response: JSON.parse(responseStr)
              }
              
                console.log('server: SEND reply from call: get_op_responses', replyObj);
                
                publisher.send(['get_op_responses', JSON.stringify(replyObj)]);

            }
          } else {
            console.log('clearInterval: receive null from get_op_responses');
            // publisher.close();
            clearInterval(getOPResponsePollHandle);
          }
        }, 100);
        
      }break;
      default:
        let replyObj = {
          unsupported_call: msgObject.apiName
        }
        responder.send(JSON.stringify(replyObj));

    }

   }catch(e) {
     console.error('failed to pass json string', msgJson, e);
   }
   
});




responder.bind(`tcp://*:${Port_Reqrep}`, function(err: any) {
  if (err) {
    console.log(err);
  } else {
    console.log(`Listening on ${Port_Reqrep}...`);
  }
});

publisher.bind(`tcp://*:${Port_Pubsub}`, function(err: any) {
  if (err) {
    console.log(err);
  } else {
    console.log(`Publisher bound to port ${Port_Pubsub}`);
  }
});


process.on('SIGINT', function() {
  responder.close();
  publisher.close();
});