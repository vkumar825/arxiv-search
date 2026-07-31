import pino from "pino";

process.loadEnvFile();

const dest = pino.destination({
  dest: process.env.PINO_LOG_FILE_PATH as string,
  sync: true,
  mkdir: true,
});

const logger = pino(
  {
    level: process.env.PINO_LOG_LEVEL,
    base: undefined,
    formatters: {
      level: (label: string) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  dest,
);

export default logger;
