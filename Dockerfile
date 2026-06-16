# ----------------------------------------------------------------------------
# Imagen para Render Web Service: backend Express + script Python heuristico.
# Base: Node 20 (slim) + Python 3 instalado por apt.
# ----------------------------------------------------------------------------
FROM node:20-slim

# Python + pip + libs minimas necesarias para matplotlib (libgomp1 para numpy)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        libgomp1 \
 && rm -rf /var/lib/apt/lists/*

# Dependencias Python.
# --break-system-packages: Debian 12 marca el Python del sistema como EXTERNALLY-MANAGED
# (PEP 668). En un contenedor de un solo proposito instalar global es lo limpio.
RUN pip3 install --no-cache-dir --break-system-packages \
        "pandas>=2.0,<3.0" \
        "numpy>=1.24,<3.0" \
        "matplotlib>=3.7" \
        "seaborn>=0.12" \
        "openpyxl>=3.1"

WORKDIR /app

# Capa 1: solo manifest del backend para cachear npm install
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm ci --omit=dev

# Capa 2: el resto del backend (codigo y scripts Python)
COPY backend/ ./backend/

# Variables de entorno para produccion
ENV NODE_ENV=production
ENV ASINT_PYTHON_CMD=python3
# Render inyecta PORT en runtime; este es el default local.
ENV PORT=3001

# Render mapea $PORT al puerto publico. Express lee process.env.PORT.
EXPOSE 3001

CMD ["node", "backend/server.js"]
