module.exports.constructApiCalls = function(apiName, parameters, expect_response) {
    const harvestCall = {
        call: apiName,
        parameters: [...parameters],
        expect_response: expect_response !== undefined ? expect_response : false
      };

    return harvestCall;
}