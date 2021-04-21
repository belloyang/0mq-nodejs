import zmq = require("zeromq");
import { constructApiCalls } from './construct-api-calls';
import { Port_Pubsub, Port_Reqrep } from "./share/default-ports";
import { HarvestAPIParams, HarvestAPIParams_GetOpResponses, HarvesterAPIParams_HarvestData } from "./models/api-params";
import { HarvesterApiType } from "./models/harvester-api-type";
import { Subject } from "rxjs";


export function ExecHarvestCmd(apiName: string, parameters: HarvestAPIParams, 
  callback: (returnValue: number|boolean| undefined, responseObservable: Subject<any>) => void): void {
    const requester = zmq.socket('req');
    const subscriber = zmq.socket('sub');
    requester.connect(`tcp://localhost:${Port_Reqrep}`);

    let responsesObservable: Subject<any> = new Subject();
    requester.on("message", (reply: Buffer)=> {
        try{
            let replyJson = JSON.parse(reply.toString());
            if(replyJson.type === 'ExecID') {
                callback(replyJson.execId, responsesObservable);
                let params: HarvestAPIParams_GetOpResponses = {
                    exectionId: replyJson.execId,
                    nResponsesMax: 0
                  };
                  let harvestCall = constructApiCalls('get_op_responses', params, HarvesterApiType.oneResponse);
            
                  requester.send(JSON.stringify(harvestCall));
            } else {
                console.log('receive msg', replyJson);
                
                subscriber.connect(`tcp://localhost:${Port_Pubsub}`);
                console.log(`Subscriber connected to port ${Port_Pubsub}`);
                subscriber.subscribe("get_op_responses"); // should be APIName eventually
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
                  responsesObservable.next(replyObj.response);
                  if(replyObj.response.type === 'completion') {
                      subscriber.unsubscribe('get_op_response');
                      console.log('ExecHarvestCmd completed', replyObj.response);
                      requester.close();
                      subscriber.close();
                  }
                });
                
                
              }
        }catch(e) {
            requester.close();
            subscriber.close();
            throw e;
        }
        
    });

    let harvestCall = constructApiCalls(apiName, parameters, HarvesterApiType.withResponses);
    console.log('send API call', harvestCall.apiName);
    requester.send(JSON.stringify(harvestCall));

    process.on('SIGINT', function() {
        requester.close();
        subscriber.close();
    });
}