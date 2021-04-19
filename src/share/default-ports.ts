import dotenv from 'dotenv';
dotenv.config();
/**
 * Default port number 
 */
export const DEFAULT_PORT_REQREP = 5555;
export const DEFAULT_PORT_PUBSUB = 5556;



export const Port_Pubsub = process.env.PORT_PUBSUB ? process.env.PORT_PUBSUB : DEFAULT_PORT_PUBSUB;
export const Port_Reqrep = process.env.PORT_REQREP ? process.env.PORT_REQREP : DEFAULT_PORT_REQREP;