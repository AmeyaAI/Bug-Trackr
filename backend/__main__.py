"""Application entry point for running with uvicorn."""

import uvicorn
from .config import Config

if __name__ == "__main__":
    # Load configuration from environment
    config = Config.from_env()
    
    # Run with uvicorn using app factory pattern
    # This ensures lifespan events work correctly
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=config.port,
        log_level="debug" if config.debug else "info",
        reload=config.debug
    )
