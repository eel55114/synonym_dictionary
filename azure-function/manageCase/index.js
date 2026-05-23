const df = require("durable-functions");

module.exports = df.orchestrator(function* (context) {
    try { 
        context.log("feedback Session start");

        const {
            feedbacks: singleFeedbacks,
            cases: singleCases
        } = yield context.df.callActivity("processSingleFeedback", null);

        const {
            completeCases,
            incompleteCases,
            deleteCases,
            changedIds
        } = yield context.df.callActivity("processSessionFeedback", null);

        yield context.df.callActivity(
            "putIncompleteCases",
            {
                completeCases,
                deleteCases,
                incompleteCases,
                changedIds
            }
        );

        // 컴플리트케이스는 SQL과 cosmos 둘다 처리 필요요


        context.log(singleFeedbacks);
        context.log(singleCases);
        context.log(completeCases);
        context.log(incompleteCases);
        context.log(changedIds);
    } catch (err) {
        context.log.error("Orchestrator 예외 발생:", err);
        throw err; // 실패 상태로 전파
    }
})