FROM python:3.14-slim

WORKDIR /app

# Install Node.js and npm for TypeScript
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nodejs \
        npm \
    && npm install -g typescript \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN pip install --editable ".[dev,test]"

RUN jlpm install

EXPOSE 8888

CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]
