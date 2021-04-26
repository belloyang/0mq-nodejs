import { GenericOpResponse, HarvesterAPIs } from '@nanometrics/pegasus-harvest-lib';

// import zmq = require('zeromq');
import * as zmq from "zeromq";
import { HarvestAPIParams_GetOpResponses, HarvesterAPIParams_HarvestData } from '../models/api-params';
import { HarvesterApiCall } from '../models/harvester-api-call';
import { CmdReplyPayload, CmdRequestPayload, SubReplyPayload } from '../models/zmp-msg-payload';
import { ZeromqMessage, ZeromqMessageType } from '../models/zmq_msg';
import { Port_Pubsub, Port_Reqrep } from '../share/default-ports';

// socket to talk to clients
var responder: zmq.Reply = new zmq.Reply();

async function runServer() {
  await responder.bind(`tcp://*:${Port_Reqrep}`);

  for await (const [request] of responder) {
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
                }break;
                case 'harvest_data': {
                    let args: HarvesterAPIParams_HarvestData = payload.arguments as HarvesterAPIParams_HarvestData;
                    (replyMsg.payload as CmdReplyPayload).reply = HarvesterAPIs.harvest_data(args.libPath, args.params, args.updateStep);
                }break;
                case 'reset': {
                    HarvesterAPIs.reset();
                }break;
                case 'get_op_responses': {
                    let args: HarvestAPIParams_GetOpResponses = payload.arguments as HarvestAPIParams_GetOpResponses;
                    (replyMsg.payload as CmdReplyPayload).reply = HarvesterAPIs.get_op_responses(args.exectionId, args.nResponsesMax);
                    console.log('[server] get_op_responses returns', (replyMsg.payload as CmdReplyPayload).reply);
                }break;
                default: {
                    console.error('unrecognized API name:', payload.apiName);
                }
            }
            responder.send([JSON.stringify(replyMsg)]);
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
    
  };
}



process.on('SIGINT', function() {
  responder.close();
});


runServer();
