import pino from "pino";

process.loadEnvFile();

const serverDest = pino.destination({
  dest: process.env.PINO_SERVER_LOG_PATH as string,
  sync: false,
  mkdir: true,
});

const ingestionDest = pino.destination({
  dest: process.env.PINO_INGESTION_LOG_PATH as string,
  sync: true,
  mkdir: true,
});

const baseOptions = {
  level: process.env.PINO_LOG_LEVEL,
  base: null,
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const server = pino(baseOptions, serverDest);

const ingestion = pino(baseOptions, ingestionDest);

export { server, ingestion };
