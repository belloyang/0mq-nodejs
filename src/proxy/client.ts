import { CompletionStatus, CompletionStatusType, DeviceBasicInfo, ErrorCategory, ErrorCode, ErrorInfo, GenericOpResponse, HarvesterOpResponseType, UpperLimit } from '@nanometrics/pegasus-harvest-lib';
import { Subject } from 'rxjs';

import { HarvesterAPIParams_HarvestData } from '../models/api-params';
import { HarvesterClientAgent } from '../harvester-client-agent';
import { HarvesterApiAgent } from '../harvester-api-agent';

console.log('calling ExecHarvestCmd from new client');

let responseSubject: Subject<GenericOpResponse> | undefined;


async function list(): Promise<number> {
    let harvesterApiAgent = new HarvesterApiAgent('list');
    const [execId] =  await harvesterApiAgent.execCommand({}, false);
    return execId as number;
}
async function getOpResponses(execId: number) {
    let harvesterApiAgent = new HarvesterApiAgent('get_op_responses');
    let [queryStr] = await harvesterApiAgent.execCommand({exectionId: execId, nResponsesMax: 0}, false);
    return JSON.parse(queryStr as string);
}
async function runClient() {
    const execId = await list();
    console.log('client-proxy list returns execId', execId);
    let retList: any;
    while(true){
        // poll list from calling get_op_response
        let query = await getOpResponses(execId);
        if (query === null) {
          return;
        }

        let responseJSONStr: string[] = query.responses;
        if (responseJSONStr.length !== 0) {
          for (let responseStr of responseJSONStr) {
            let response: GenericOpResponse = JSON.parse(responseStr);
            if (response) {
             console.log('list() receive responses', response);
              switch (response.type) {
                case HarvesterOpResponseType.response: {
                  
                  if (response.data && retList) {
                    retList.digitizers.push(response.data as DeviceBasicInfo);
                  }
                  break;
                }
                case HarvesterOpResponseType.completion : {

                    console.log(`list():${execId} completed:`, retList);

                    let status = response.data as CompletionStatus;
                    if (status.status === CompletionStatusType.completed) {
                      
                      console.log('list operation completed');
                    }
                    else {
                      console.log('list operation: ', CompletionStatusType[status.status] || status.status);
                    }
                    break;
                }
                case HarvesterOpResponseType.error : {
                  // Error Handling:
                  console.warn('Lib-level error @ list:', response.data);
                  let errorInfo: ErrorInfo = response.data as ErrorInfo;
                  if (errorInfo.category === ErrorCategory.ERROR_CATEGORY_SYSTEM ||
                    errorInfo.error_code === ErrorCode.PSF_ERROR_LIBRARY_RESTORING_FAILED ||
                    errorInfo.error_code === ErrorCode.PSF_ERROR_LIBRARY_NOT_PSF ||
                    errorInfo.error_code === ErrorCode.LIBIO_ERROR_IO_INVALID_RANGE
                ) {
                      // PGWU-240/PGWU-247 Ignore those errors. don't clear or update device detail when those error occurs.
                      console.log(`Ignore system errors and errorCode of
                      PSF_ERROR_LIBRARY_RESTORING_FAILED(${ErrorCode.PSF_ERROR_LIBRARY_RESTORING_FAILED})/
                      PSF_ERROR_LIBRARY_NOT_PSF(${ErrorCode.PSF_ERROR_LIBRARY_NOT_PSF})/
                      LIBIO_ERROR_IO_INVALID_RANGE(${ErrorCode.LIBIO_ERROR_IO_INVALID_RANGE})
                       with errorCategory: ${errorInfo.category})`);
                  }
                  else {
                    alert(`Misformatted Pegasus detected.` +
                    `Error(EC:${errorInfo.error_code},Category:${errorInfo.category}) \n${errorInfo.description}`);

                  }

                }
              }

            }
            else {
              console.error('UI-level error @ list: Failed to parse operation response JSON', responseStr);
            }

          }

        }
        else {
          // ignore responses if it's an empty array.
        }
    }
}


runClient();
    

