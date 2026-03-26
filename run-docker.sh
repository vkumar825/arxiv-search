#!/bin/bash

# Milvus Docker Compose script with configurable Docker command

# === CONFIG ===
# Change this to add/remove sudo or customize docker command
DOCKER_COMPOSE_CMD="docker compose -f docker-compose.yml"
VOLUME_DIR="./volumes"

# === FUNCTIONS ===
start() {
    echo "Starting Milvus..."
    $DOCKER_COMPOSE_CMD up -d
    echo "Milvus started!"
}

stop() {
    echo "Stopping Milvus..."
    $DOCKER_COMPOSE_CMD down
    echo "Milvus stopped!"
}

delete() {
    echo "Stopping Milvus..."
    $DOCKER_COMPOSE_CMD down
    echo "Deleting Milvus data..."
    rm -rf $VOLUME_DIR
    echo "Milvus data deleted!"
}

# === MAIN ===
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    delete)
        delete
        ;;
    *)
        echo "Usage: $0 {start|stop|delete}"
        exit 1
        ;;
esac