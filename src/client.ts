import zmq = require("zeromq");
import { constructApiCalls } from './construct-api-calls';
import { UpperLimit} from '@nanometrics/pegasus-harvest-lib';


// socket to talk to server
console.log("Connecting to hello world server...");
let requester = zmq.socket('req');
let subscriber = zmq.socket('sub');

let system_path; 
requester.on("message", function(reply) {
  
  let replyJson = reply.toString();
  try{
    let replyObj = JSON.parse(replyJson);
    console.log('***client receives replyObj ', replyObj);
    let replyType = replyObj.type;
    if(replyType === 'ExecID') {
      console.log('receive msg', replyType);
      let harvestCall = {
      call: 'get_op_responses',
      parameters: [replyObj.execId, 0],
      }
      requester.send(JSON.stringify(harvestCall));
    } else {
      console.log('receive msg', replyType, replyObj);
      
      subscriber.connect('tcp://localhost:5556');
      console.log("Subscriber connected to port 5556");
      subscriber.subscribe("get_op_responses");
      subscriber.on("message", function(topic, message) {
        console.log(
          "received a reply for:",
          topic.toString(),
          ":",
          message.toString()
        );
        let replyObj = JSON.parse(message.toString());
        let replyType = replyObj.type;
        console.log('receive subscribed msg', replyType, replyObj.response);
        if(replyObj.response.type === 'completion') {
            subscriber.unsubscribe('get_op_responses');
            console.log('unsubscribe get_op_responses');
            // requester.close();
            // process.exit(0); 
        } else if(replyObj.response.type === 'response') {
          switch(replyObj.response.operation) {
            case 'list_devices': { // repored as list_devices instead of list
              console.log('receive response from list call', replyObj.response.data);
              system_path = replyObj.response.data.system_path;
              console.log('receive system path', system_path);
              let harvestCall = constructApiCalls('harvest_data', [
                system_path,
                {
                  range: {
                      lower: {
                        time_microsecs: 0
                      },
                      upper: {
                        time_microsecs: UpperLimit.timestamp
                      },
                  },
                  output_path: './output',
                  output_pattern: '${N}/${S}/${S}.${N}.${J}',
                  hours_per_file: 24,
                },
                0.1 //report every 10% progress
              ], true);
              console.log('send API call', harvestCall.call);
              requester.send(JSON.stringify(harvestCall));
            }break;
            case 'harvest_data': {
              console.log('receive response from harvest_data call', replyObj.response.data);

            }break;
            default: {
              console.warn('receive response from unsupported call', replyObj.response.operation, replyObj.response.data);
            }
          }
          

        }
      });
      
      
    }
    
  }catch(e) {
    console.error('failed to parse replyJson', replyJson, e);
  }
  
  
  
});

requester.connect("tcp://localhost:5555");


console.log("Sending request", '...');
  
let harvestCall = constructApiCalls('list', [], true);
console.log('send API call', harvestCall.call);
requester.send(JSON.stringify(harvestCall));


process.on('SIGINT', function() {
  requester.close();
  subscriber.close();
});