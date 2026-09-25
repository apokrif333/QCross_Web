FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CHROMIUM_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /job
COPY requirements.txt requirements-cron.txt ./
RUN pip install --no-cache-dir -r requirements-cron.txt
COPY . ./

CMD ["python", "railway_cron.py"]
