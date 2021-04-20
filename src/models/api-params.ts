import {  HarvestParams } from "@nanometrics/pegasus-harvest-lib";

/**
    const HarvesterAPIs: {
    reset: () => void;
    set_client_info: (name: string) => void;
    set_logs_mask: (mask: number) => void;
    format: (path: string, config_path: string) => number;
    list: () => number;
    get_digitizer_info: (path: string) => number;
    load_opaque_data: (libPath: string, lowerTimeMicroSecs: number, upperTimeMicroSecs: number) => number;
    harvest_data: (libPath: string, params: HarvestParams, updateStep: number) => number;
    harvest_soh: (libPath: string, params: HarvestParams, channelsMask: number, updateStep: number) => number;
    harvest_timing_soh: (libPath: string, params: HarvestParams, updateStep: number) => number;
    harvest_logs: (libPath: string, params: HarvestParams, updateStep: number) => number;
    load_harvesting_history: (libPath: string) => number;
    flush_harvesting_history: (libPath: string) => number;
    get_volume_info: (libPath: string, volumeId: number) => number;
    read_volume: (libPath: string, volumeId: number) => number;
    get_op_responses: (exectionId: number, nResponsesMax: number) => string;
    stop_operation: (executionId: number) => boolean;
}
 */
export interface HarvesterAPIParams_SetClientInfo {
    name: string;
}

export interface HarvesterAPIParams_SetLogsMask {
    mask: number;
}

export interface HarvesterAPIParams_HarvestData {
    libPath: string;
    params: HarvestParams;
    updateStep: number
}

export interface HarvestAPIParams_GetOpResponses {
    exectionId: number;
    nResponsesMax: number
}

export type HarvestAPIParams = HarvesterAPIParams_SetClientInfo |
                               HarvesterAPIParams_SetLogsMask |
                               HarvesterAPIParams_HarvestData |
                               HarvestAPIParams_GetOpResponses;