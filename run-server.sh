#!/bin/bash

# Start the Express API server with pino-pretty logging from the repository root
npx --prefix server tsx ./server/src/index.ts "$@" | npx --prefix server pino-pretty --ignore req,res,responseTime
