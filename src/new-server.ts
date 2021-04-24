import { GenericOpResponse, HarvesterAPIs } from '@nanometrics/pegasus-harvest-lib';

// import zmq = require('zeromq');
import * as zmq from "zeromq/v5-compat";
import { HarvestAPIParams_GetOpResponses, HarvesterAPIParams_HarvestData } from './models/api-params';
import { HarvesterApiCall } from './models/harvester-api-call';
import { CmdReplyPayload, CmdRequestPayload, SubReplyPayload } from './models/zmp-msg-payload';
import { ZeromqMessage, ZeromqMessageType } from './models/zmq_msg';
import { Port_Pubsub, Port_Reqrep } from './share/default-ports';

// socket to talk to clients
var responder = zmq.socket('rep');
var publisher = zmq.socket('pub');

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

responder.on('message', function(request: Buffer) {
    console.log("[Server] Received request: [", request.toString(), "]");
    try{
        let zmqMsg : ZeromqMessage = JSON.parse(request.toString());
        console.log('[Server] receive zmqMsg:', zmqMsg);
        if(zmqMsg.type === ZeromqMessageType.cmdRequest) {
            let payload: CmdRequestPayload = zmqMsg.payload as CmdRequestPayload;
            let replyMsg: ZeromqMessage = {
                type: ZeromqMessageType.cmdReply,
                payload: {
                    apiName: payload.apiName,
                    reply: undefined,
                }
            };
            
            switch(payload.apiName) {
                case 'list': {
                    (replyMsg.payload as CmdReplyPayload).reply = HarvesterAPIs.list();
                    responder.send([JSON.stringify(replyMsg)]);
                }break;
                case 'harvest_data': {
                    let args: HarvesterAPIParams_HarvestData = payload.arguments as HarvesterAPIParams_HarvestData;
                    (replyMsg.payload as CmdReplyPayload).reply = HarvesterAPIs.harvest_data(args.libPath, args.params, args.updateStep);
                    responder.send([JSON.stringify(replyMsg)]);
                }break;
                case 'reset': {
                    HarvesterAPIs.reset();
                    responder.send([JSON.stringify(replyMsg)]);
                }break;
                default: {
                    console.error('unrecognized API name:', payload.apiName);
                    responder.send([JSON.stringify(replyMsg)]);
                }
            }
        } else if(zmqMsg.type == ZeromqMessageType.subRequest) {
            let payload: SubReplyPayload = zmqMsg.payload as SubReplyPayload;
            //call get_op_responses
            let replyMsg: ZeromqMessage = {
                type:ZeromqMessageType.subReply,
                payload: {
                    topic: payload.topic,
                    execId: payload.execId,
                }
            }
            responder.send([JSON.stringify(replyMsg)]);
            let getOPResponsePollHandle = setInterval(() => {
        
                let queryStr = HarvesterAPIs.get_op_responses(payload.execId, 0);
                  if(queryStr !== null) {
                    let query = JSON.parse(queryStr);
                    // console.log('check query:', query);
                    let responseJSONStr = query.responses;
                    for (let responseStr of responseJSONStr) {
                        let response: GenericOpResponse = JSON.parse(responseStr);
                        let publicationMsg: ZeromqMessage = {
                            type: ZeromqMessageType.publication,
                            payload: {
                                topic: payload.topic,
                                response: response,
                            }
                        };
                        console.log('[Server] send publication msg:', publicationMsg);
                        publisher.send([payload.topic, JSON.stringify(publicationMsg)]);
        
                    }
                  } else {
                    console.log('clearInterval: receive null from get_op_responses');
                    clearInterval(getOPResponsePollHandle);
                  }
                }, 100);
        } else {
            console.warn('Unrecognized Zeromq message type', zmqMsg.type);
            let replyMsg: ZeromqMessage = {
                type: ZeromqMessageType.cmdReply,
                payload: {
                    apiName: 'Not supported',
                    reply: undefined,
                }
            };
            responder.send([JSON.stringify(replyMsg)]);
        }

    }catch(e) {
        console.error('Failed to parse JSON from request message:', request.toString());
        return;
        
    }
    
});

