import { Subject } from "rxjs";
import zmq = require("zeromq");
import { constructApiCalls } from "./construct-api-calls";
import { HarvestAPIParams, HarvestAPIParams_GetOpResponses } from "./models/api-params";
import { HarvesterApiType } from "./models/harvester-api-type";
import { Port_Pubsub, Port_Reqrep } from "./share/default-ports";

export class HarvesterClientAgent {
    private requester: zmq.Socket;
    private subscriber: zmq.Socket;
    

    constructor() {
        this.requester = zmq.socket('req');
        this.subscriber = zmq.socket('sub');
        
    }

    ExecHarvestCmd(apiName: string, parameters: HarvestAPIParams, 
        callback: (returnValue: number|boolean| undefined, responseObservable: Subject<any>) => void): void {
        let cmdResponse$: Subject<any> = new Subject();
        const _this = this;
        let topic = 'get_op_responses';
        let execId: number;
        this.requester.connect(`tcp://localhost:${Port_Reqrep}`);
        this.requester.on("message", (reply: Buffer)=> {
            try{
                let replyJson = JSON.parse(reply.toString());
                console.log(`ClientAgent onMsg for api call:`, apiName, replyJson);
                if(replyJson.apiName && replyJson.apiName !== apiName) {
                    console.log(`ClientAgent onMsg descard messages that's for api`, replyJson.apiName);
                    return;
                }
                if(replyJson.type === 'ExecID') {
                    console.log(`ClientAgent receive ExecID ${replyJson.execId} for api call:`, apiName);
                    execId = replyJson.execId;
                    callback(execId, cmdResponse$);
                    let params: HarvestAPIParams_GetOpResponses = {
                        exectionId: execId,
                        nResponsesMax: 0
                      };
                      topic += execId;
                      let harvestCall = constructApiCalls('get_op_responses', params, HarvesterApiType.oneResponse);
                
                      this.requester.send(JSON.stringify(harvestCall));
                } else {
                    if(replyJson.execId !== execId) {
                        console.log('ClientAgent discards reply from execId:', replyJson.execId, `expected: ${execId}`);
                        return;
                    }
                    this.subscriber.connect(`tcp://localhost:${Port_Pubsub}`);
                    console.log(`clientAgent subscribes to topic ${topic}`);

                    this.subscriber.subscribe(topic); // should be APIName eventually
                    
                    this.subscriber.on("message", function(recv_topic, message) {
                      if(topic !== recv_topic.toString()) {
                           console.log(
                            `clientAgent expects topic ${topic}, but receives a reply from an unexpected one (discarded):`,
                            recv_topic.toString(),
                            ":",
                            message.toString()
                          );
                          return;
                      }
                      console.log(
                        `clientAgent  receives a reply from expected topic:`,
                        topic.toString(),
                        ":",
                        message.toString()
                      );
                      let replyObj = JSON.parse(message.toString());
                      let replyType = replyObj.type;
                      console.log('receive subscribed msg', replyType, replyObj.response);
                      cmdResponse$.next(replyObj.response);
                      if(replyObj.response.type === 'completion') {
                          _this.subscriber.unsubscribe(topic);
                          console.log(`ClientAgent completed, unsubscribe ${topic}`, replyObj.response);
                      }
                    });
                    
                    
                  }
            }catch(e) {
                this.close();
                throw e;
            }
            
        });

        let harvestCall = constructApiCalls(apiName, parameters, HarvesterApiType.withResponses);
        console.log('ExecHarvestCmd: send API call', harvestCall.apiName);
        this.requester.send(JSON.stringify(harvestCall));

        process.on('SIGINT', function() {
            _this.close();
        });
    }

    close(): void {
        
        this.requester.close();
        this.subscriber.close();
    }
}