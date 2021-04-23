import { ZeromqMsgPayload } from "./zmp-msg-payload";

export enum ZeromqMessageType {
    cmdRequest = 'cmdRequest',
    cmdReply = 'cmdReply',
    subRequest = 'subRequest',
    subReply ='subReply',
    publication='publication',
}

export interface ZeromqMessage {
    type: ZeromqMessageType;
    payload: ZeromqMsgPayload;
}