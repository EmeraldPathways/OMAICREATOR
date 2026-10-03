import studioWorker from "vinext/server/fetch-handler";
import reviewDeskWorker from "../lib/reviewDesk/worker.js";
import { createScheduledReviewDeskEnv } from "../lib/reviewDesk/runtime";

const siteWorker = {
  fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    return studioWorker.fetch(request, env, ctx);
  },
  scheduled(controller: ScheduledController, env: Record<string, unknown>) {
    return reviewDeskWorker.scheduled(controller, createScheduledReviewDeskEnv(env));
  },
};

export default siteWorker;
