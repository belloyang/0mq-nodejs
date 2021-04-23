import { GenericOpResponse, HarvesterOpResponseType } from "@nanometrics/pegasus-harvest-lib";
import { Subject } from "rxjs";
import zmq = require("zeromq");
import { constructApiCalls } from "./construct-api-calls";
import { HarvestAPIParams, HarvestAPIParams_GetOpResponses } from "./models/api-params";
import { HarvesterApiType } from "./models/harvester-api-type";
import { CmdReplyPayload, PublicationPayload } from "./models/zmp-msg-payload";
import { ZeromqMessage, ZeromqMessageType } from "./models/zmq_msg";
import { Port_Pubsub, Port_Reqrep } from "./share/default-ports";

export class HarvesterClientAgent {
    private requester: zmq.Socket;
    private subscriber: zmq.Socket;
    

    constructor() {
        this.requester = zmq.socket('req');
        this.subscriber = zmq.socket('sub');
        this.requester.connect(`tcp://localhost:${Port_Reqrep}`);
    }

    ExecHarvestCmd(apiName: string, parameters: HarvestAPIParams, expectResponses: boolean,
        callback: (returnValue: number|boolean| undefined, responseObservable?: Subject<any>) => void): void {
        let cmdResponse$: Subject<GenericOpResponse> = new Subject();
        const _this = this;
        
        this.requester.on("message", (reply: Buffer)=> {
            try{
                let zmqMsg : ZeromqMessage = JSON.parse(reply.toString());
                if(zmqMsg.type === ZeromqMessageType.cmdReply) {
                    let payload: CmdReplyPayload = zmqMsg.payload as CmdReplyPayload;
                    if(payload.apiName !== apiName) {
                        console.log('[client] discard msg for api:', payload.apiName, apiName);
                        return;
                    } else {
                        if(expectResponses) {
                            let execId = payload.reply as number;
                            //subscribe to topic
                            let subRequestMsg: ZeromqMessage = {
                                type: ZeromqMessageType.subRequest,
                                payload: {
                                    topic: apiName,
                                    execId: execId
                                }
                            };
                            this.requester.send(JSON.stringify(subRequestMsg));
                            callback(execId, cmdResponse$);
                            //subscribe to the topic
                            this.subscriber.connect(`tcp://localhost:${Port_Pubsub}`);
                            console.log(`clientAgent subscribes to topic ${apiName}`);

                            this.subscriber.subscribe(apiName); // should be APIName eventually
                            
                            this.subscriber.on("message", function(recv_topic, message) {
                                let pubMsg: ZeromqMessage = JSON.parse(message.toString());
                            if(apiName !== recv_topic.toString()) {
                                console.log(
                                    `clientAgent expects topic ${apiName}, discard unexpected msg:`,
                                    recv_topic.toString(),
                                    ":",
                                    pubMsg
                                );
                                return;
                            }
                            console.log(
                                `clientAgent  receives:`,
                                apiName,
                                ":",
                                pubMsg
                            );
                        
                            
                            let pubMsgPayload: PublicationPayload = pubMsg.payload as PublicationPayload;

                            console.log('receive publication msg for topic', pubMsgPayload.topic, pubMsg);
                            
                            cmdResponse$.next(pubMsgPayload.response);
                            if(pubMsgPayload.response.type === HarvesterOpResponseType.completion) {
                                _this.subscriber.unsubscribe(apiName);
                                console.log(`ClientAgent completed, unsubscribe ${apiName}`, pubMsgPayload.response);
                            }
                            });
                        } else {
                            let ret = payload.reply;
                            callback(ret);
                        }
                    }
                    
                } else if(zmqMsg.type === ZeromqMessageType.subReply) {
                    console.log('[clientAgent] receive subscription reply', zmqMsg);
                    return;
                } else {
                    console.log('[clientAgent] receive unexpected reply message type',zmqMsg.type, zmqMsg);
                    return;
                }

            }catch(e) {
                this.close();
                throw e;
            }
            
        });

        let cmdRequestMsg: ZeromqMessage = {
            type: ZeromqMessageType.cmdRequest,
            payload: {
                apiName: apiName,
                arguments: parameters,
            }
        }
        console.log('ExecHarvestCmd: send API call', apiName);
        this.requester.send(JSON.stringify(cmdRequestMsg));

        process.on('SIGINT', function() {
            _this.close();
        });
    }

    close(): void {
        
        this.requester.close();
        this.subscriber.close();
    }
}