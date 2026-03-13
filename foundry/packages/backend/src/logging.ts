import { pino } from "pino";

const level = process.env.FOUNDRY_LOG_LEVEL ?? process.env.LOG_LEVEL ?? process.env.RIVET_LOG_LEVEL ?? "info";

export const logger = pino({
  level,
  base: {
    service: "foundry-backend",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
