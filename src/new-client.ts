import { DeviceBasicInfo, GenericOpResponse, UpperLimit } from '@nanometrics/pegasus-harvest-lib';
import { Subject } from 'rxjs';

import { HarvesterAPIParams_HarvestData } from './models/api-params';
import { HarvesterClientAgent } from './harvester-client-agent';

console.log('calling ExecHarvestCmd from new client');

let responseSubject: Subject<GenericOpResponse> | undefined;
let harvesterClientAgent: HarvesterClientAgent = new HarvesterClientAgent();
harvesterClientAgent.ExecHarvestCmd('list', {}, true, (execId, response) => {
    console.log('***new-client:ExecHarvestCmd returns', execId);
    responseSubject = response;
    if(responseSubject) {
        responseSubject.subscribe((response) => {
            console.log('***new-client:receive response for list', response);
            if(response.type == 'response') {
                let system_path = (response.data as DeviceBasicInfo).system_path;
                let params: HarvesterAPIParams_HarvestData = {
                    libPath: system_path,
                    params: {
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
                    updateStep: 0.1 //report every 10% progress
                  }
                  console.log('***new-client: call harvest_data', params);
                  harvesterClientAgent.ExecHarvestCmd('harvest_data', params, true, (execId, response) => {
                    console.log(`***new-client: harvest_data return`, execId);
                    response && response.subscribe((resp)=> {
                        console.log('***new-client:receive response for harvest_data', resp);
                    })
                  });
                  
            }
        });
    }
    
});

harvesterClientAgent.ExecHarvestCmd('reset', {}, false, (ret) => {
    console.log('client execute reset', ret);
})