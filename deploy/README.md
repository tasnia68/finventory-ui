# Deployment

This directory contains both the original bare-metal deployment flow and a Docker-based single-host deployment flow for MasterInventory.

## Files

- `deploy.sh`: Original bare-metal deploy flow.
- `bootstrap-server.sh`: Original bare-metal server bootstrap.
- `remote-deploy.sh`: Original bare-metal remote deploy.
- `docker-deploy.sh`: Syncs the workspace to a remote host and deploys the Docker stack.
- `docker-bootstrap-server.sh`: Installs Docker and prepares the host for the new all-in-one stack.
- `docker-remote-deploy.sh`: Builds and starts the Docker Compose stack on the target server.
- `docker-compose.yml`: Single-host stack with Caddy, backend, PostgreSQL, and MinIO.
- `Dockerfile.backend`: Backend image build.
- `Dockerfile.gateway`: Frontend and Nginx gateway image build.
- `docker.env.example`: Example environment file for `/etc/masterinventory/stack.env`.
- `backup-local-state.sh`: Creates a local migration backup from the SQL dumps and object data already present in this workspace.

## Docker Host Setup

1. Run `bash deploy/run-hardcoded-deploy.sh` after updating the target IP and any secrets.
2. The script uploads `/etc/masterinventory/stack.env` and calls `docker-deploy.sh`.
3. The Docker stack builds the backend and both frontends on the target server, then starts Caddy, PostgreSQL, MinIO, and the backend together.

## Notes

- Frontend requests are built against `/api/v1`, so the gateway container serves the storefront for tenant/custom hosts, serves the backoffice on the admin host at `/inventory/`, and proxies API traffic to the backend container.
- The backend runs with the `deploy` Spring profile.
- PostgreSQL and MinIO run on the same host inside Docker for the single-server setup.
- `run-hardcoded-deploy.sh` now validates the hardcoded IP before it attempts any SSH operations.
