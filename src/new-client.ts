import { Subject } from 'rxjs';

import {ExecHarvestCmd} from './client-interface';

console.log('calling ExecHarvestCmd from new client');

let responseSubject: Subject<any>;
ExecHarvestCmd('list', {}, (execId, response) => {
    console.log('***new-client:ExecHarvestCmd returns', execId);
    responseSubject = response;
    responseSubject.subscribe((response) => {
        console.log('***new-client:receive response for list', response);
    })
});