FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY scripts/vault/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy full scripts tree so jenkins_stack and rotator are importable
COPY scripts/ ./scripts/

EXPOSE 5050
CMD ["python", "scripts/vault/backend/app.py"]
